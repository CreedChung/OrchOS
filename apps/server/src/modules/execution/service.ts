import type { ControlSettings, Action } from "@/types";
import { db } from "@/db";
import { commands, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GoalService } from "@/modules/goal/service";
import { StateService } from "@/modules/state/service";
import { AgentService } from "@/modules/agent/service";
import { ActivityService } from "@/modules/activity/service";
import { eventBus } from "@/modules/event/event-bus";
import { executor } from "@/modules/execution/executor";
import { SandboxService } from "@/modules/sandbox/service";
import { generateId } from "@/utils";
import type { ExecutionModel } from "@/modules/execution/model";
import { ProjectService } from "@/modules/project/service";
import { FilesystemService } from "@/modules/filesystem/service";
import { RuleService } from "@/modules/rule/service";
import { GraphService } from "@/modules/graph/service";
import { GraphScheduler } from "@/modules/graph/scheduler";
import { PolicyService } from "@/modules/policy/service";
import { InboxService } from "@/modules/inbox/service";
import { ContextService } from "@/modules/context/service";
import { ReflectionService } from "@/modules/reflection/service";
import { ConflictService } from "@/modules/protocol/conflict";
import { HandoffService } from "@/modules/protocol/handoff";
import { SkillService } from "@/modules/skill/service";

export class ExecutionService {
  private settings: ControlSettings = {
    autoCommit: false,
    autoFix: true,
    modelStrategy: "adaptive",
    locale: "en",
    timezone: "UTC",
    projectChatsRequireSandbox: true,
    notifications: {
      system: true,
      sound: true,
      eventSounds: {},
      eventSoundFiles: {},
    },
  };

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    const rows = db.select().from(settings).all() as { key: string; value: string }[];
    for (const row of rows) {
      if (row.key === "autoCommit") this.settings.autoCommit = row.value === "true";
      if (row.key === "autoFix") this.settings.autoFix = row.value === "true";
      if (row.key === "modelStrategy")
        this.settings.modelStrategy = row.value as ControlSettings["modelStrategy"];
      if (row.key === "locale") this.settings.locale = row.value;
      if (row.key === "timezone") this.settings.timezone = row.value;
      if (row.key === "notifications") {
        try {
          this.settings.notifications = JSON.parse(row.value);
        } catch {
          // ignore parse errors
        }
      }
      if (row.key === "defaultAgentId") this.settings.defaultAgentId = row.value;
      if (row.key === "defaultRuntimeId") this.settings.defaultRuntimeId = row.value;
      if (row.key === "projectChatsRequireSandbox") {
        this.settings.projectChatsRequireSandbox = row.value === "true";
      }
    }
  }

  getSettings(): ControlSettings {
    return { ...this.settings };
  }

  private saveSetting(key: string, value: string) {
    db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run();
  }

  updateSettings(patch: ExecutionModel["settingsUpdateBody"]): ControlSettings {
    if (patch.autoCommit !== undefined) {
      this.settings.autoCommit = patch.autoCommit;
      this.saveSetting("autoCommit", String(patch.autoCommit));
    }
    if (patch.autoFix !== undefined) {
      this.settings.autoFix = patch.autoFix;
      this.saveSetting("autoFix", String(patch.autoFix));
    }
    if (patch.modelStrategy !== undefined) {
      this.settings.modelStrategy = patch.modelStrategy;
      this.saveSetting("modelStrategy", patch.modelStrategy);
    }
    if (patch.locale !== undefined) {
      this.settings.locale = patch.locale;
      this.saveSetting("locale", patch.locale);
    }
    if (patch.timezone !== undefined) {
      this.settings.timezone = patch.timezone;
      this.saveSetting("timezone", patch.timezone);
    }
    if (patch.notifications !== undefined) {
      this.settings.notifications = patch.notifications;
      this.saveSetting("notifications", JSON.stringify(patch.notifications));
    }
    if (patch.defaultAgentId !== undefined) {
      this.settings.defaultAgentId = patch.defaultAgentId;
      this.saveSetting("defaultAgentId", patch.defaultAgentId);
    }
    if (patch.defaultRuntimeId !== undefined) {
      this.settings.defaultRuntimeId = patch.defaultRuntimeId;
      this.saveSetting("defaultRuntimeId", patch.defaultRuntimeId);
    }
    if (patch.projectChatsRequireSandbox !== undefined) {
      this.settings.projectChatsRequireSandbox = patch.projectChatsRequireSandbox;
      this.saveSetting(
        "projectChatsRequireSandbox",
        String(patch.projectChatsRequireSandbox),
      );
    }
    return { ...this.settings };
  }

  private actionTaskType(action: Action): "code" | "review" | "debug" {
    if (action === "review") return "review";
    if (action === "fix_bug" || action === "run_tests") return "debug";
    return "code";
  }

  private buildActionPrompt(action: Action, goalId: string, agentId?: string) {
    const goal = GoalService.get(goalId);
    const project = goal?.projectId ? ProjectService.get(goal.projectId) : undefined;
    const agentsFilePath = project?.path ? `${project.path.replace(/\/$/, "")}/AGENTS.md` : undefined;
    const agentsFile = agentsFilePath ? FilesystemService.readFile(agentsFilePath).content ?? undefined : undefined;
    const matchedRules = RuleService.matchInstructions({
      projectId: project?.id,
      projectPath: project?.path,
      agentId,
      taskType: this.actionTaskType(action),
    });

    const basePrompt = `Implement the following goal: ${goal?.title}${goal?.description ? `\nDescription: ${goal.description}` : ""}${goal?.successCriteria?.length ? `\nSuccess criteria: ${goal.successCriteria.join(", ")}` : ""}`;
    const sections: string[] = [];

    if (agentsFile?.trim()) {
      sections.push(["Project Instructions (AGENTS.md):", agentsFile.trim()].join("\n"));
    }

    if (matchedRules.length > 0) {
      sections.push(
        [
          "Matched Rules:",
          ...matchedRules.map((rule, index) => `${index + 1}. ${rule.name} [priority: ${rule.priority}]\n${rule.instruction}`),
        ].join("\n"),
      );
    }

    return sections.length > 0 ? `${sections.join("\n\n")}\n\n${basePrompt}` : basePrompt;
  }

  async executeAction(
    goalId: string,
    action: Action,
    stateId?: string,
    agentId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const goal = GoalService.get(goalId);
    if (!goal) return { success: false, message: "Goal not found" };
    if (goal.status !== "active") return { success: false, message: "Goal is not active" };

    const agent = agentId
      ? AgentService.get(agentId)
      : AgentService.selectAgent(action, this.settings.modelStrategy);

    if (!agent) return { success: false, message: "No available agent for this action" };

    AgentService.updateStatus(agent.id, "active");

    try {
      const result = await this.executeRealAction(action, goalId, stateId, agent.id);
      ActivityService.add(
        goalId,
        agent.name,
        this.actionLabel(action),
        result.detail,
        result.reasoning,
      );
      eventBus.emit("agent_action", { action, agent: agent.name, result: result.success }, goalId);
      AgentService.updateStatus(agent.id, "idle");
      return { success: result.success, message: result.message };
    } catch (err) {
      AgentService.updateStatus(agent.id, "error");
      return { success: false, message: `Execution failed: ${err}` };
    }
  }

  private async executeRealAction(
    action: Action,
    goalId: string,
    stateId?: string,
    agentId?: string,
  ): Promise<{ success: boolean; message: string; detail?: string; reasoning?: string }> {
    const goal = GoalService.get(goalId);
    const project = goal?.projectId ? ProjectService.get(goal.projectId) : undefined;
    const projectPath = project?.path || process.cwd();

    if (stateId) StateService.updateState(stateId, "running");

    let result: { success: boolean; message: string; detail?: string; reasoning?: string };

    switch (action) {
      case "run_tests": {
        const execResult = await executor.runTests(projectPath);
        const passed = execResult.success;
        const detail = passed ? "All tests passed" : execResult.error || "Tests failed";
        if (stateId) StateService.updateState(stateId, passed ? "success" : "failed");
        if (!passed) eventBus.emit("test_failed", { goalId, stateId }, goalId);
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
          if (stateId) StateService.updateState(stateId, "error");
          result = {
            success: false,
            message: "Fix needed",
            detail: lintResult.success ? "Issue detected" : lintResult.error || "Build/test failed",
            reasoning: testResult.error || "Test failures detected",
          };
        } else {
          if (stateId) StateService.updateState(stateId, "success");
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
        const agent = agentId ? AgentService.get(agentId) : undefined;
        const prompt = this.buildActionPrompt(action, goalId, agentId);

        let codeGenerated = false;
        let output = "";
        let fileName = "";

        // Only use the sandbox bound to this goal's project.
        const activeVM = goal?.projectId
          ? SandboxService.getRunningVMForProject(goal.projectId)
          : undefined;
        let usedSandbox = false;

        if (activeVM) {
          try {
            const session = await SandboxService.createSession(activeVM.vmId, {
              agentType: agent?.runtimeId || undefined,
              env: process.env.ANTHROPIC_API_KEY
                ? { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY }
                : undefined,
            });
            const promptResult = await SandboxService.sendPrompt(session.sessionId, prompt);
            codeGenerated = promptResult.success;
            output = promptResult.text;
            usedSandbox = true;
            SandboxService.closeSession(session.sessionId);
          } catch (err) {
            // Sandbox failed, fall through to CLI execution
            output = `Sandbox error: ${err instanceof Error ? err.message : String(err)}. Falling back to CLI.`;
          }
        }

        if (!usedSandbox && agent?.cliCommand) {
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
        } else if (!usedSandbox) {
          const buildResult = await executor.runBuild(projectPath);
          if (buildResult.success) {
            codeGenerated = true;
            output = buildResult.output.trim().slice(0, 2000);
          } else {
            output = buildResult.error || buildResult.output.trim().slice(0, 2000);
          }
        }

        if (stateId) StateService.updateState(stateId, codeGenerated ? "success" : "failed");

        const artifactName = fileName || `module_${generateId("f")}.ts`;
        StateService.createArtifact(
          goalId,
          artifactName,
          "file",
          codeGenerated ? "success" : "failed",
          output.slice(0, 500),
        );

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
          if (stateId) StateService.updateState(stateId, "success");
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
        if (stateId) StateService.updateState(stateId, approved ? "success" : "failed");
        if (!approved) eventBus.emit("review_rejected", { goalId, stateId }, goalId);
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

  private actionFromStateLabel(label: string): Action | undefined {
    const prefix = label.split(" — ")[0]?.trim();
    if (prefix === "write_code") return "write_code";
    if (prefix === "run_tests") return "run_tests";
    if (prefix === "fix_bug") return "fix_bug";
    if (prefix === "commit") return "commit";
    if (prefix === "review") return "review";
    return undefined;
  }

  private syncCommandStatus(commandId?: string) {
    if (!commandId) return;

    const relatedGoals = GoalService.list().filter((goal) => goal.commandId === commandId);
    if (relatedGoals.length === 0) return;

    const allCompleted = relatedGoals.every((goal) => goal.status === "completed");
    const hasActive = relatedGoals.some((goal) => goal.status === "active");
    const hasPaused = relatedGoals.some((goal) => goal.status === "paused");

    if (allCompleted) {
      db.update(commands).set({ status: "completed" }).where(eq(commands.id, commandId)).run();
      return;
    }

    if (!hasActive && hasPaused) {
      db.update(commands).set({ status: "failed" }).where(eq(commands.id, commandId)).run();
    }
  }

  async runGoalLoop(goalId: string): Promise<void> {
    const goal = GoalService.get(goalId);
    if (!goal || goal.status !== "active") return;
    const project = goal.projectId ? ProjectService.get(goal.projectId) : undefined;

    const graph = GraphService.getByGoal(goalId);
    if (graph) {
      const graphTraceId = graph.traceId || generateId("trace");
      const graphContextSnapshot = graph.contextSnapshotId
        ? ContextService.getSnapshot(graph.contextSnapshotId)
        : ContextService.createSnapshot({
            goalId,
            graphId: graph.id,
            kind: "goal_context",
            payload: ContextService.buildGoalContext(goalId),
          });
      const agentsFilePath = project?.path ? `${project.path.replace(/\/$/, "")}/AGENTS.md` : undefined;
      await GraphScheduler.runGraph(graph.id, async (node) => {
        if (node.kind === "reflect") {
          const summary = "Graph execution reflection completed.";
          ActivityService.add(goalId, node.assignedAgentName || "Orchestrator", "reflect", summary);
          ReflectionService.create({ graphId: graph.id, nodeId: node.id, success: true, message: summary });
          return { success: true, message: summary };
        }

        if (node.kind === "handoff") {
          HandoffService.create({
            fromAgent: "Orchestrator",
            toAgent: node.assignedAgentName || "User",
            graphId: graph.id,
            nodeId: node.id,
            input: {
              taskId: node.id,
              goalId,
              graphId: graph.id,
              nodeId: node.id,
              title: node.label,
              instruction: `Handoff for ${node.label}`,
              contextSnapshotId: graphContextSnapshot?.id,
            },
          });
          const thread = InboxService.createAgentRequestThread({
            title: `Handoff for ${node.label}`,
            body: `Goal ${goalId} requires handoff for node '${node.label}'.`,
            summary: `Generated from graph ${graph.id}`,
            projectId: project?.id,
            recipients: [node.assignedAgentName || "User"],
            cc: ["User"],
          });
          return { success: true, message: `Handoff thread ${thread.id} created` };
        }

        const policy = PolicyService.validateNodeExecution({
          nodeId: node.id,
          action: node.action,
          goalId,
          projectId: project?.id,
          projectPath: project?.path,
          agentsFilePath,
        });

        if (!policy.allowed) {
          const state = StateService.getStatesByGoal(goalId).find((item) => item.label === node.label);
          if (state) StateService.updateState(state.id, "failed");
          return { success: false, message: policy.reason || "Policy denied node execution" };
        }

        const state = StateService.getStatesByGoal(goalId).find((item) => item.label === node.label);
        const toolPolicy = PolicyService.validateToolCall({
          subjectId: node.id,
          toolName: node.action === "write_code" || node.action === "fix_bug" ? "local-filesystem-write" : `action:${node.action}`,
          projectPath: project?.path,
          agentsFilePath,
        });
        if (!toolPolicy.allowed) {
          if (state) StateService.updateState(state.id, "failed");
          return { success: false, message: toolPolicy.reason || "Tool policy denied execution" };
        }

        const rewrittenAction = (policy.rewrite?.action as Action | undefined) || node.action;
        if (node.kind === "skill" && node.assignedAgentName) {
          const matchedSkill = SkillService.list().find((skill) => skill.name === node.assignedAgentName);
          if (matchedSkill) SkillService.recordExecution(matchedSkill.id, true);
        }
        if (rewrittenAction === "write_code") {
          const filePolicy = PolicyService.validateFileWrite({
            subjectId: node.id,
            path: project?.path || process.cwd(),
            projectPath: project?.path,
            agentsFilePath,
          });
          if (!filePolicy.allowed) {
            if (state) StateService.updateState(state.id, "failed");
            ReflectionService.create({
              graphId: graph.id,
              nodeId: node.id,
              success: false,
              message: filePolicy.reason || "File policy denied execution",
              metadata: { goalId, kind: "file_write" },
            });
            return { success: false, message: filePolicy.reason || "File policy denied execution" };
          }
        }
        const overlappingTarget = ConflictService.detectFileOverlap(
          rewrittenAction === "write_code"
            ? [{ type: "file_write", target: project?.path || process.cwd(), mode: "write" as const }]
            : [],
        );
        if (overlappingTarget) {
          ConflictService.create({
            graphId: graph.id,
            nodeId: node.id,
            conflictType: "file_overlap",
            summary: `Detected overlapping file mutation target '${overlappingTarget}'.`,
            participants: [node.id],
            resolution: "policy-review",
          });
        }
        const result = await this.executeAction(goalId, rewrittenAction!, state?.id);
        if (!result.success) {
          ReflectionService.create({
            graphId: graph.id,
            nodeId: node.id,
            success: false,
            message: result.message,
            metadata: { goalId, action: rewrittenAction },
          });
        }
        return result;
      }, {
        concurrency: 2,
        traceId: graphTraceId,
        contextSnapshotId: graphContextSnapshot?.id,
        contextFactory: (node, attemptId, baseSnapshotId) =>
          ContextService.deriveSnapshot({
            parentSnapshotId: baseSnapshotId,
            goalId,
            graphId: graph.id,
            attemptId,
            kind: "node_input",
            patch: {
              node: {
                id: node.id,
                kind: node.kind,
                label: node.label,
                action: node.action,
              },
            },
          })?.id,
        outputContextFactory: (node, attemptId, baseSnapshotId, result) =>
          ContextService.deriveSnapshot({
            parentSnapshotId: baseSnapshotId,
            goalId,
            graphId: graph.id,
            attemptId,
            kind: "node_output",
            patch: {
              nodeResult: {
                nodeId: node.id,
                success: result.success,
                message: result.message,
              },
              goal: GoalService.get(goalId),
              states: StateService.getStatesByGoal(goalId),
              artifacts: StateService.getArtifactsByGoal(goalId),
            },
          })?.id,
        metricsFactory: (node, result) => ({
          tokenUsage: {
            input: node.label.length,
            output: result.message.length,
            total: node.label.length + result.message.length,
          },
          costEstimateUsd: Number(((node.label.length + result.message.length) / 10000).toFixed(6)),
        }),
      });

      const completedGraph = GraphService.get(graph.id);
      if (completedGraph?.status === "failed") {
        GoalService.update(goalId, { status: "paused" });
        this.syncCommandStatus(goal.commandId);
        return;
      }

      if (GoalService.checkCompletion(goalId)) {
        GoalService.update(goalId, { status: "completed" });
        eventBus.emit("goal_completed", { goalId }, goalId);
        this.syncCommandStatus(goal.commandId);
      }
      return;
    }

    while (true) {
      const goalStates = StateService.getStatesByGoal(goalId);
      const fixableState = goalStates.find(
        (s) => (s.status === "failed" || s.status === "error") && s.actions?.includes("Fix"),
      );

      if (fixableState && this.settings.autoFix) {
        await this.executeAction(goalId, "fix_bug", fixableState.id);
        continue;
      }

      if (GoalService.checkCompletion(goalId)) {
        GoalService.update(goalId, { status: "completed" });
        eventBus.emit("goal_completed", { goalId }, goalId);
        this.syncCommandStatus(goal.commandId);
        return;
      }

      const nextPendingState = goalStates.find((state) => state.status === "pending");
      if (!nextPendingState) {
        return;
      }

      const nextAction = this.actionFromStateLabel(nextPendingState.label);
      if (!nextAction) {
        return;
      }

      const result = await this.executeAction(goalId, nextAction, nextPendingState.id);
      if (!result.success) {
        GoalService.update(goalId, { status: "paused" });
        this.syncCommandStatus(goal.commandId);
        return;
      }
    }
  }
}

export const executionService = new ExecutionService();
