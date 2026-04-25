import { useState } from "react";
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

  const [sidebarWidth, setSidebarWidth] = useState(288);

  return (
    <ProjectsView
      projects={projects}
      goals={goals}
      problems={problems}
      commands={commands}
      sidebarWidth={sidebarWidth}
      onSidebarWidthChange={setSidebarWidth}
    />
  );
}
