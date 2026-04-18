import type { AppDb } from "../../db/types";
import type { ControlSettings, Action } from "../../types";
import { settings, projects } from "../../db/schema";
import { eq } from "drizzle-orm";
import { GoalService } from "../goal/service";
import { StateService } from "../state/service";
import { AgentService } from "../agent/service";
import { ActivityService } from "../activity/service";
import { EventBus } from "../event/event-bus";
import { generateId } from "../../utils";
import type { ExecutionModel } from "./model";
import type { ObjectStorageAdapter } from "../../cloudflare/object-storage";
import { getRemoteExecutionAdapter } from "../../runtime/execution-adapter";

async function getExecutor() {
  try {
    const { executor } = await import("./executor");
    return executor;
  } catch {
    return null;
  }
}

export class ExecutionService {
  private db: AppDb;
  private eventBus: EventBus;
  private artifactStorage?: ObjectStorageAdapter;
  private settings: ControlSettings = {
    autoCommit: false,
    autoFix: true,
    modelStrategy: "adaptive",
  };

  private constructor(db: AppDb, eventBus: EventBus, artifactStorage?: ObjectStorageAdapter) {
    this.db = db;
    this.eventBus = eventBus;
    this.artifactStorage = artifactStorage;
  }

  static async create(
    db: AppDb,
    eventBus: EventBus,
    artifactStorage?: ObjectStorageAdapter,
  ): Promise<ExecutionService> {
    const service = new ExecutionService(db, eventBus, artifactStorage);
    await service.loadSettings();
    return service;
  }

  private async loadSettings() {
    const rows = (await this.db.select().from(settings).all()) as {
      key: string;
      value: string;
    }[];
    for (const row of rows) {
      if (row.key === "autoCommit") this.settings.autoCommit = row.value === "true";
      if (row.key === "autoFix") this.settings.autoFix = row.value === "true";
      if (row.key === "modelStrategy")
        this.settings.modelStrategy = row.value as ControlSettings["modelStrategy"];
    }
  }

  getSettings(): ControlSettings {
    return { ...this.settings };
  }

  async updateSettings(patch: ExecutionModel["settingsUpdateBody"]): Promise<ControlSettings> {
    if (patch.autoCommit !== undefined) {
      this.settings.autoCommit = patch.autoCommit;
      await this.db
        .insert(settings)
        .values({ key: "autoCommit", value: String(patch.autoCommit) })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: String(patch.autoCommit) },
        })
        .run();
    }
    if (patch.autoFix !== undefined) {
      this.settings.autoFix = patch.autoFix;
      await this.db
        .insert(settings)
        .values({ key: "autoFix", value: String(patch.autoFix) })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: String(patch.autoFix) },
        })
        .run();
    }
    if (patch.modelStrategy !== undefined) {
      this.settings.modelStrategy = patch.modelStrategy;
      await this.db
        .insert(settings)
        .values({ key: "modelStrategy", value: patch.modelStrategy })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: patch.modelStrategy },
        })
        .run();
    }
    return { ...this.settings };
  }

  async executeAction(
    goalId: string,
    action: Action,
    stateId?: string,
    agentId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const goal = await GoalService.get(this.db, goalId);
    if (!goal) return { success: false, message: "Goal not found" };
    if (goal.status !== "active") return { success: false, message: "Goal is not active" };

    const agent = agentId
      ? await AgentService.get(this.db, agentId)
      : await AgentService.selectAgent(this.db, action, this.settings.modelStrategy);

    if (!agent) return { success: false, message: "No available agent for this action" };

    await AgentService.updateStatus(this.db, agent.id, "active");

    try {
      const result = await this.executeRealAction(action, goalId, stateId, agent.id);
      await ActivityService.add(
        this.db,
        goalId,
        agent.name,
        this.actionLabel(action),
        result.detail,
        result.reasoning,
      );
      await this.eventBus.emit(
        "agent_action",
        { action, agent: agent.name, result: result.success },
        goalId,
      );
      await AgentService.updateStatus(this.db, agent.id, "idle");
      return { success: result.success, message: result.message };
    } catch (err) {
      await AgentService.updateStatus(this.db, agent.id, "error");
      return { success: false, message: `Execution failed: ${err}` };
    }
  }

  private async executeRealAction(
    action: Action,
    goalId: string,
    stateId?: string,
    agentId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    detail?: string;
    reasoning?: string;
  }> {
    const executor = await getExecutor();
    const goal = await GoalService.get(this.db, goalId);
    if (!executor) {
      return {
        success: false,
        message: "Executor not available in this environment",
      };
    }

    const projectRow = goal?.projectId
      ? await this.db
          .select({
            id: projects.id,
            path: projects.path,
            repositoryUrl: projects.repositoryUrl,
          })
          .from(projects)
          .where(eq(projects.id, goal.projectId))
          .get()
      : await this.db
          .select({
            id: projects.id,
            path: projects.path,
            repositoryUrl: projects.repositoryUrl,
          })
          .from(projects)
          .limit(1)
          .get();

    const remoteAdapter = getRemoteExecutionAdapter();
    const projectPath =
      projectRow && remoteAdapter?.prepareProject
        ? (
            await remoteAdapter.prepareProject({
              id: projectRow.id,
              path: projectRow.path,
              repositoryUrl: projectRow.repositoryUrl || undefined,
            })
          ).workingPath
        : projectRow?.path || process.cwd();

    if (stateId) await StateService.updateState(this.db, this.eventBus, stateId, "running");

    let result: {
      success: boolean;
      message: string;
      detail?: string;
      reasoning?: string;
    };

    switch (action) {
      case "run_tests": {
        const execResult = await executor.runTests(projectPath);
        const passed = execResult.success;
        const detail = passed ? "All tests passed" : execResult.error || "Tests failed";
        if (stateId)
          await StateService.updateState(
            this.db,
            this.eventBus,
            stateId,
            passed ? "success" : "failed",
          );
        if (!passed) await this.eventBus.emit("test_failed", { goalId, stateId }, goalId);
        result = {
          success: passed,
          message: passed ? "Tests passed" : "Tests failed",
          detail,
          reasoning: passed ? "All test cases satisfied" : "Test suite has failures",
        };
        break;
      }

      case "fix_bug": {
        const testResult = await executor.runTests(projectPath);
        const needsFix = !testResult.success;
        if (needsFix) {
          const lintResult = await executor.runLint(projectPath);
          if (stateId) await StateService.updateState(this.db, this.eventBus, stateId, "error");
          result = {
            success: false,
            message: "Fix needed",
            detail: lintResult.success ? "Issue detected" : lintResult.error || "Build/test failed",
            reasoning: testResult.error || "Test failures detected",
          };
        } else {
          if (stateId) await StateService.updateState(this.db, this.eventBus, stateId, "success");
          result = {
            success: true,
            message: "No issues found",
            detail: "All checks pass",
            reasoning: "Code passes all tests",
          };
        }
        break;
      }

      case "write_code": {
        const agent = agentId ? await AgentService.get(this.db, agentId) : undefined;
        const prompt = `Implement the following goal: ${goal?.title}${goal?.description ? `\nDescription: ${goal.description}` : ""}${goal?.successCriteria?.length ? `\nSuccess criteria: ${goal.successCriteria.join(", ")}` : ""}`;

        let codeGenerated = false;
        let output = "";
        let fileName = "";

        if (agent?.cliCommand) {
          const invokeResult = await executor.run(
            `${agent.cliCommand} -p '${prompt.replace(/'/g, "'\\''")}' 2>&1`,
            { cwd: projectPath, timeout: 120000 },
          );
          output = invokeResult.output.trim();
          codeGenerated = invokeResult.success;

          if (codeGenerated) {
            const diffResult = await executor.git("diff --name-only", projectPath);
            if (diffResult.success && diffResult.output.trim()) {
              const changedFiles = diffResult.output.trim().split("\n");
              fileName = changedFiles[0];
            }
          }
        } else {
          const buildResult = await executor.runBuild(projectPath);
          if (buildResult.success) {
            codeGenerated = true;
            output = buildResult.output.trim().slice(0, 2000);
          } else {
            output = buildResult.error || buildResult.output.trim().slice(0, 2000);
          }
        }

        if (stateId)
          await StateService.updateState(
            this.db,
            this.eventBus,
            stateId,
            codeGenerated ? "success" : "failed",
          );

        const artifactName = fileName || `module_${generateId("f")}.ts`;
        const artifact = await StateService.createArtifact(
          this.db,
          goalId,
          artifactName,
          "file",
          codeGenerated ? "success" : "failed",
          output.slice(0, 500),
        );

        if (this.artifactStorage) {
          const objectKey = StateService.getArtifactObjectKey(goalId, artifact.id, artifact.name);
          const artifactContent =
            output.trim() || `Artifact ${artifact.name} generated without textual output.`;
          await this.artifactStorage.write(objectKey, artifactContent, {
            type: "text/plain; charset=utf-8",
          });
        }

        result = {
          success: codeGenerated,
          message: codeGenerated ? "Code generated" : "Code generation failed",
          detail: codeGenerated ? `Generated ${artifactName}` : output.slice(0, 500),
          reasoning: codeGenerated
            ? "Agent produced code changes"
            : "Agent did not produce valid output",
        };
        break;
      }

      case "commit": {
        const gitStatus = await executor.gitStatus(projectPath);
        if (
          gitStatus.modified.length === 0 &&
          gitStatus.staged.length === 0 &&
          gitStatus.untracked.length === 0
        ) {
          result = {
            success: false,
            message: "No changes to commit",
            detail: "Working tree is clean",
            reasoning: "No changes detected",
          };
        } else {
          if (gitStatus.modified.length > 0 || gitStatus.untracked.length > 0)
            await executor.git("add -A", projectPath);
          await executor.git(`commit -m "Auto-commit: ${action}"`, projectPath);
          if (stateId) await StateService.updateState(this.db, this.eventBus, stateId, "success");
          result = {
            success: true,
            message: "Changes committed",
            detail: `Committed files`,
            reasoning: "All changes staged and committed",
          };
        }
        break;
      }

      case "review": {
        const lintResult = await executor.runLint(projectPath);
        const testResult = await executor.runTests(projectPath);
        const approved = lintResult.success && testResult.success;
        if (stateId)
          await StateService.updateState(
            this.db,
            this.eventBus,
            stateId,
            approved ? "success" : "failed",
          );
        if (!approved) await this.eventBus.emit("review_rejected", { goalId, stateId }, goalId);
        result = {
          success: approved,
          message: approved ? "Review approved" : "Review rejected",
          detail: approved ? "LGTM" : lintResult.error || testResult.error || "Code quality issues",
          reasoning: approved ? "Code meets quality standards" : "Issues found",
        };
        break;
      }

      default:
        result = { success: false, message: `Unknown action: ${action}` };
    }

    return result;
  }

  private actionLabel(action: Action): string {
    const labels: Record<Action, string> = {
      write_code: "Writing code",
      run_tests: "Running tests",
      fix_bug: "Fixing bug",
      commit: "Committing changes",
      review: "Reviewing code",
    };
    return labels[action];
  }

  async runGoalLoop(goalId: string): Promise<void> {
    const goal = await GoalService.get(this.db, goalId);
    if (!goal || goal.status !== "active") return;

    const goalStates = await StateService.getStatesByGoal(this.db, goalId);
    const fixableState = goalStates.find(
      (s) => (s.status === "failed" || s.status === "error") && s.actions?.includes("Fix"),
    );

    if (fixableState && this.settings.autoFix) {
      await this.executeAction(goalId, "fix_bug", fixableState.id);
    }

    if (await GoalService.checkCompletion(this.db, this.eventBus, goalId)) {
      await GoalService.update(this.db, this.eventBus, goalId, {
        status: "completed",
      });
      await this.eventBus.emit("goal_completed", { goalId }, goalId);
    }
  }
}
