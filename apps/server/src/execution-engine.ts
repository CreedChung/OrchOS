import type { ControlSettings, Action, StateEntry } from "./types"
import { goalManager } from "./goal-manager"
import { stateEngine } from "./state-engine"
import { agentController } from "./agent-controller"
import { activityLog } from "./activity-log"
import { eventBus } from "./event-bus"
import { executor } from "./executor"
import { generateId } from "./utils"
import { getDb } from "./db"

class ExecutionEngine {
  private settings: ControlSettings = {
    autoCommit: false,
    autoFix: true,
    modelStrategy: "adaptive",
  }

  constructor() {
    this.loadSettings()
  }

  private loadSettings() {
    const db = getDb()
    const rows = db.query("SELECT key, value FROM settings").all() as { key: string; value: string }[]
    for (const row of rows) {
      if (row.key === "autoCommit") this.settings.autoCommit = row.value === "true"
      if (row.key === "autoFix") this.settings.autoFix = row.value === "true"
      if (row.key === "modelStrategy") this.settings.modelStrategy = row.value as ControlSettings["modelStrategy"]
    }
  }

  getSettings(): ControlSettings {
    return { ...this.settings }
  }

  updateSettings(patch: Partial<ControlSettings>): ControlSettings {
    const db = getDb()
    if (patch.autoCommit !== undefined) {
      this.settings.autoCommit = patch.autoCommit
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('autoCommit', ?)", [String(patch.autoCommit)])
    }
    if (patch.autoFix !== undefined) {
      this.settings.autoFix = patch.autoFix
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('autoFix', ?)", [String(patch.autoFix)])
    }
    if (patch.modelStrategy !== undefined) {
      this.settings.modelStrategy = patch.modelStrategy
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('modelStrategy', ?)", [patch.modelStrategy])
    }
    return { ...this.settings }
  }

  async executeAction(goalId: string, action: Action, stateId?: string, agentId?: string): Promise<{ success: boolean; message: string }> {
    const goal = goalManager.get(goalId)
    if (!goal) return { success: false, message: "Goal not found" }
    if (goal.status !== "active") return { success: false, message: "Goal is not active" }

    const agent = agentId
      ? agentController.get(agentId)
      : agentController.selectAgent(action, this.settings.modelStrategy)

    if (!agent) return { success: false, message: "No available agent for this action" }

    agentController.updateStatus(agent.id, "active")

    try {
      const result = await this.executeRealAction(action, goalId, stateId, agent.id)

      activityLog.add(goalId, agent.name, this.actionLabel(action), result.detail, result.reasoning)
      eventBus.emit("agent_action", { action, agent: agent.name, result: result.success }, goalId)

      agentController.updateStatus(agent.id, "idle")
      return { success: result.success, message: result.message }
    } catch (err) {
      agentController.updateStatus(agent.id, "error")
      return { success: false, message: `Execution failed: ${err}` }
    }
  }

  private async executeRealAction(
    action: Action,
    goalId: string,
    stateId?: string,
    agentId?: string
  ): Promise<{ success: boolean; message: string; detail?: string; reasoning?: string }> {
    // Get project path for execution
    const db = getDb()
    const projectRow = db.query("SELECT path FROM projects LIMIT 1").get() as { path: string } | undefined
    const projectPath = projectRow?.path || process.cwd()

    // Update state to running
    if (stateId) {
      stateEngine.updateState(stateId, "running")
    }

    let result: { success: boolean; message: string; detail?: string; reasoning?: string }

    switch (action) {
      case "run_tests": {
        const execResult = await executor.runTests(projectPath)
        const passed = execResult.success
        const detail = execResult.success
          ? "All tests passed"
          : execResult.error || "Tests failed"

        if (stateId) {
          stateEngine.updateState(stateId, passed ? "success" : "failed")
        }
        if (!passed) {
          eventBus.emit("test_failed", { goalId, stateId }, goalId)
        }
        result = {
          success: passed,
          message: passed ? "Tests passed" : "Tests failed",
          detail,
          reasoning: passed
            ? "All test cases satisfied"
            : "Test suite has failures → may need fix cycle",
        }
        break
      }

      case "fix_bug": {
        // Run tests to see if there's an issue
        const testResult = await executor.runTests(projectPath)
        const needsFix = !testResult.success

        if (needsFix) {
          // Try to run lint first to get more info
          const lintResult = await executor.runLint(projectPath)
          const detail = lintResult.success ? "Issue detected, fix needed" : (lintResult.error || "Build/test failed")
          if (stateId) {
            stateEngine.updateState(stateId, "error")
          }
          result = {
            success: false,
            message: "Fix needed",
            detail,
            reasoning: testResult.error || "Test failures detected → manual fix required",
          }
        } else {
          if (stateId) {
            stateEngine.updateState(stateId, "success")
          }
          result = {
            success: true,
            message: "No issues found",
            detail: "All checks pass",
            reasoning: "Code passes all tests → no fix needed",
          }
        }
        break
      }

      case "write_code": {
        const projectInfo = await executor.getProjectInfo(projectPath)
        const artifact = stateEngine.createArtifact(
          goalId,
          `module_${generateId("f")}.ts`,
          "file",
          "warning",
          "pending implementation"
        )
        result = {
          success: true,
          message: "Code file created (stub)",
          detail: `Created ${artifact.name}`,
          reasoning: `Goal requires new code → ${projectInfo.packageManager} project ready for implementation`,
        }
        break
      }

      case "commit": {
        const gitStatus = await executor.gitStatus(projectPath)
        if (gitStatus.modified.length === 0 && gitStatus.staged.length === 0 && gitStatus.untracked.length === 0) {
          result = {
            success: false,
            message: "No changes to commit",
            detail: "Working tree is clean",
            reasoning: "No changes detected → nothing to commit",
          }
        } else {
          // Auto-stage all changes
          if (gitStatus.modified.length > 0 || gitStatus.untracked.length > 0) {
            await executor.git(`add -A`, projectPath)
          }
          await executor.git(`commit -m "Auto-commit: ${action}"`, projectPath)
          if (stateId) {
            stateEngine.updateState(stateId, "success")
          }
          result = {
            success: true,
            message: "Changes committed",
            detail: `Committed ${gitStatus.staged.length + gitStatus.modified.length} files`,
            reasoning: "All changes staged and committed",
          }
        }
        break
      }

      case "review": {
        // Simple review: check lint and tests
        const lintResult = await executor.runLint(projectPath)
        const testResult = await executor.runTests(projectPath)
        const approved = lintResult.success && testResult.success

        if (stateId) {
          stateEngine.updateState(stateId, approved ? "success" : "failed")
        }
        if (!approved) {
          eventBus.emit("review_rejected", { goalId, stateId }, goalId)
        }
        result = {
          success: approved,
          message: approved ? "Review approved" : "Review rejected",
          detail: approved ? "LGTM" : (lintResult.error || testResult.error || "Code quality issues"),
          reasoning: approved
            ? "Code meets quality standards (lint + tests pass)"
            : "Issues found → changes requested",
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
    const goal = goalManager.get(goalId)
    if (!goal || goal.status !== "active") return

    const states = stateEngine.getStatesByGoal(goalId)

    // Find first failed/error state that can be auto-fixed
    const fixableState = states.find(
      (s) => (s.status === "failed" || s.status === "error") && s.actions?.includes("Fix")
    )

    if (fixableState && this.settings.autoFix) {
      await this.executeAction(goalId, "fix_bug", fixableState.id)
    }

    // Check goal completion
    if (goalManager.checkCompletion(goalId)) {
      goalManager.update(goalId, { status: "completed" })
      eventBus.emit("goal_completed", { goalId }, goalId)
    }
  }
}

export const executionEngine = new ExecutionEngine()
