import { createFileRoute } from '@tanstack/react-router'
import { StateBoard } from '#/components/panels/StateBoard'
import { GoalActions } from '#/components/panels/GoalActions'
import { GoalList } from '#/components/panels/GoalList'
import { useDashboard } from '#/lib/dashboard-context'
import { useUIStore } from '#/lib/store'
import { m } from '#/paraglide/messages'
import { isSystemProblem } from '#/lib/types'

export const Route = createFileRoute('/dashboard/goals')({ component: GoalsPage })

function GoalsPage() {
  const {
    goals, projects, states, artifacts, activities, problems,
    activeGoal, activeCommand,
    handleStateAction, handleProblemAction, handlePauseGoal, handleResumeGoal, handleDeleteGoal,
    showCommandBar, setShowCommandBar,
    showCreateDialog, setShowCreateDialog,
    searchQuery,
  } = useDashboard()

  const { activeGoalId, setActiveGoalId, goalStatusFilter } = useUIStore()

  return (
    <div className="flex flex-1 overflow-hidden">
      <GoalList
        goals={goals}
        projects={projects}
        activeGoalId={activeGoalId}
        statusFilter={goalStatusFilter}
        searchQuery={searchQuery}
        onSelectGoal={setActiveGoalId}
        onNewCommand={() => setShowCommandBar(true)}
        onCreateGoal={() => setShowCreateDialog(true)}
      />
      <div className="flex-1 overflow-hidden">
        {activeGoal ? (
          <StateBoard
            goal={activeGoal}
            states={states}
            artifacts={artifacts}
            activities={activities}
            projects={projects}
            command={activeCommand}
            problems={{
              critical: problems.filter((p) => p.status === "open" && p.priority === "critical" && isSystemProblem(p) && p.goalId === activeGoalId).length,
              warning: problems.filter((p) => p.status === "open" && p.priority === "warning" && isSystemProblem(p) && p.goalId === activeGoalId).length,
              info: problems.filter((p) => p.status === "open" && p.priority === "info" && isSystemProblem(p) && p.goalId === activeGoalId).length,
            }}
            systemProblems={problems.filter((p) => p.status === "open" && isSystemProblem(p) && p.goalId === activeGoalId)}
            onStateAction={handleStateAction}
            onProblemAction={handleProblemAction}
            onAutoModeToggle={activeGoal.status === "active" ? handlePauseGoal : handleResumeGoal}
            goalActions={
              <GoalActions
                goal={activeGoal}
                onPause={handlePauseGoal}
                onResume={handleResumeGoal}
                onDelete={handleDeleteGoal}
              />
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{m.no_goal_selected()}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{m.no_goal_selected_desc()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
