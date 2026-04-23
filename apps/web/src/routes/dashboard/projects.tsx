import { createFileRoute } from "@tanstack/react-router";
import { ProjectsView } from "@/components/panels/ProjectsView";
import { useDashboard } from "@/lib/dashboard-context";

export const Route = createFileRoute("/dashboard/projects")({ component: ProjectsPage });

function ProjectsPage() {
  const {
    projects,
    goals,
    problems,
    commands,
  } = useDashboard();

  return (
    <ProjectsView
      projects={projects}
      goals={goals}
      problems={problems}
      commands={commands}
    />
  );
}
