import type { ControlSettings, Action } from "../../types"
import { db } from "../../db"
import { settings, projects, states } from "../../db/schema"
import { eq } from "drizzle-orm"
import { GoalService } from "../goal/service"
import { StateService } from "../state/service"
import { AgentService } from "../agent/service"
import { ActivityService } from "../activity/service"
import { eventBus } from "../event/event-bus"
import { executor } from "./executor"
import { generateId, timestamp } from "../../utils"
import type { ExecutionModel } from "./model"

export class ExecutionService {
  private settings: ControlSettings = {
    autoCommit: false,
    autoFix: true,
    modelStrategy: "adaptive",
  }

  constructor() {
    this.loadSettings()
  }

  private loadSettings() {
    const rows = db.select().from(settings).all() as { key: string; value: string }[]
    for (const row of rows) {
      if (row.key === "autoCommit") this.settings.autoCommit = row.value === "true"
      if (row.key === "autoFix") this.settings.autoFix = row.value === "true"
      if (row.key === "modelStrategy") this.settings.modelStrategy = row.value as ControlSettings["modelStrategy"]
    }
  }

  getSettings(): ControlSettings {
    return { ...this.settings }
  }

  updateSettings(patch: ExecutionModel["settingsUpdateBody"]): ControlSettings {
    if (patch.autoCommit !== undefined) {
      this.settings.autoCommit = patch.autoCommit
      db.insert(settings).values({ key: "autoCommit", value: String(patch.autoCommit) })
        .onConflictDoUpdate({ target: settings.key, set: { value: String(patch.autoCommit) } }).run()
    }
    if (patch.autoFix !== undefined) {
      this.settings.autoFix = patch.autoFix
      db.insert(settings).values({ key: "autoFix", value: String(patch.autoFix) })
        .onConflictDoUpdate({ target: settings.key, set: { value: String(patch.autoFix) } }).run()
    }
    if (patch.modelStrategy !== undefined) {
      this.settings.modelStrategy = patch.modelStrategy
      db.insert(settings).values({ key: "modelStrategy", value: patch.modelStrategy })
        .onConflictDoUpdate({ target: settings.key, set: { value: patch.modelStrategy } }).run()
    }
    return { ...this.settings }
  }

  async executeAction(goalId: string, action: Action, stateId?: string, agentId?: string): Promise<{ success: boolean; message: string }> {
    const goal = GoalService.get(goalId)
    if (!goal) return { success: false, message: "Goal not found" }
    if (goal.status !== "active") return { success: false, message: "Goal is not active" }

    const agent = agentId
      ? AgentService.get(agentId)
      : AgentService.selectAgent(action, this.settings.modelStrategy)

    if (!agent) return { success: false, message: "No available agent for this action" }

    AgentService.updateStatus(agent.id, "active")

    try {
      const result = await this.executeRealAction(action, goalId, stateId, agent.id)
      ActivityService.add(goalId, agent.name, this.actionLabel(action), result.detail, result.reasoning)
      eventBus.emit("agent_action", { action, agent: agent.name, result: result.success }, goalId)
      AgentService.updateStatus(agent.id, "idle")
      return { success: result.success, message: result.message }
    } catch (err) {
      AgentService.updateStatus(agent.id, "error")
      return { success: false, message: `Execution failed: ${err}` }
    }
  }

  private async executeRealAction(
    action: Action, goalId: string, stateId?: string, agentId?: string
  ): Promise<{ success: boolean; message: string; detail?: string; reasoning?: string }> {
    const projectRow = db.select({ path: projects.path }).from(projects).limit(1).get()
    const projectPath = projectRow?.path || process.cwd()

    if (stateId) StateService.updateState(stateId, "running")

    let result: { success: boolean; message: string; detail?: string; reasoning?: string }

    switch (action) {
      case "run_tests": {
        const execResult = await executor.runTests(projectPath)
        const passed = execResult.success
        const detail = passed ? "All tests passed" : execResult.error || "Tests failed"
        if (stateId) StateService.updateState(stateId, passed ? "success" : "failed")
        if (!passed) eventBus.emit("test_failed", { goalId, stateId }, goalId)
        result = {
          success: passed,
          message: passed ? "Tests passed" : "Tests failed",
          detail,
          reasoning: passed ? "All test cases satisfied" : "Test suite has failures",
        }
        break
      }

      case "fix_bug": {
        const testResult = await executor.runTests(projectPath)
        const needsFix = !testResult.success
        if (needsFix) {
          const lintResult = await executor.runLint(projectPath)
          if (stateId) StateService.updateState(stateId, "error")
          result = {
            success: false,
            message: "Fix needed",
            detail: lintResult.success ? "Issue detected" : (lintResult.error || "Build/test failed"),
            reasoning: testResult.error || "Test failures detected",
          }
        } else {
          if (stateId) StateService.updateState(stateId, "success")
          result = { success: true, message: "No issues found", detail: "All checks pass", reasoning: "Code passes all tests" }
        }
        break
      }

      case "write_code": {
        const artifact = StateService.createArtifact(goalId, `module_${generateId("f")}.ts`, "file", "warning", "pending implementation")
        result = { success: true, message: "Code file created (stub)", detail: `Created ${artifact.name}`, reasoning: "Goal requires new code" }
        break
      }

      case "commit": {
        const gitStatus = await executor.gitStatus(projectPath)
        if (gitStatus.modified.length === 0 && gitStatus.staged.length === 0 && gitStatus.untracked.length === 0) {
          result = { success: false, message: "No changes to commit", detail: "Working tree is clean", reasoning: "No changes detected" }
        } else {
          if (gitStatus.modified.length > 0 || gitStatus.untracked.length > 0) await executor.git("add -A", projectPath)
          await executor.git(`commit -m "Auto-commit: ${action}"`, projectPath)
          if (stateId) StateService.updateState(stateId, "success")
          result = { success: true, message: "Changes committed", detail: `Committed files`, reasoning: "All changes staged and committed" }
        }
        break
      }

      case "review": {
        const lintResult = await executor.runLint(projectPath)
        const testResult = await executor.runTests(projectPath)
        const approved = lintResult.success && testResult.success
        if (stateId) StateService.updateState(stateId, approved ? "success" : "failed")
        if (!approved) eventBus.emit("review_rejected", { goalId, stateId }, goalId)
        result = {
          success: approved,
          message: approved ? "Review approved" : "Review rejected",
          detail: approved ? "LGTM" : (lintResult.error || testResult.error || "Code quality issues"),
          reasoning: approved ? "Code meets quality standards" : "Issues found",
        }
        break
      }

      default:
        result = { success: false, message: `Unknown action: ${action}` }
    }

    return result
  }

  private actionLabel(action: Action): string {
    const labels: Record<Action, string> = {
      write_code: "Writing code",
      run_tests: "Running tests",
      fix_bug: "Fixing bug",
      commit: "Committing changes",
      review: "Reviewing code",
    }
    return labels[action]
  }

  async runGoalLoop(goalId: string): Promise<void> {
    const goal = GoalService.get(goalId)
    if (!goal || goal.status !== "active") return

    const goalStates = StateService.getStatesByGoal(goalId)
    const fixableState = goalStates.find(
      (s) => (s.status === "failed" || s.status === "error") && s.actions?.includes("Fix")
    )

    if (fixableState && this.settings.autoFix) {
      await this.executeAction(goalId, "fix_bug", fixableState.id)
    }

    if (GoalService.checkCompletion(goalId)) {
      GoalService.update(goalId, { status: "completed" })
      eventBus.emit("goal_completed", { goalId }, goalId)
    }
  }
}

export const executionService = new ExecutionService()
