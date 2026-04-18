import { createFileRoute } from "@tanstack/react-router";
import { ProjectsView } from "@/components/panels/ProjectsView";
import { useDashboard } from "@/lib/dashboard-context";

export const Route = createFileRoute("/dashboard/projects")({ component: ProjectsPage });

function ProjectsPage() {
  const { projects, refreshAll } = useDashboard();

  return <ProjectsView projects={projects} onRefresh={refreshAll} />;
}
