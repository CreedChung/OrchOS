import { createFileRoute } from "@tanstack/react-router";
import { ProjectsView } from "@/components/panels/ProjectsView";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/projects")({ component: ProjectsPage });

function ProjectsPage() {
  const {
    projects,
    goals,
    states,
    artifacts,
    activities,
    problems,
    activeGoal,
    activeCommand,
    agents,
    refreshAll,
    handleStateAction,
    handleProblemAction,
    handlePauseGoal,
    handleResumeGoal,
    handleDeleteGoal,
  } = useDashboard();

  const { activeGoalId, setActiveGoalId } = useUIStore();

  return (
    <ProjectsView
      projects={projects}
      goals={goals}
      states={states}
      artifacts={artifacts}
      activities={activities}
      problems={problems}
      activeGoalId={activeGoalId}
      activeGoal={activeGoal}
      activeCommand={activeCommand}
      agents={agents}
      onSelectGoal={setActiveGoalId}
      onStateAction={handleStateAction}
      onProblemAction={handleProblemAction}
      onPauseGoal={handlePauseGoal}
      onResumeGoal={handleResumeGoal}
      onDeleteGoal={handleDeleteGoal}
      onRefresh={refreshAll}
    />
  );
}
