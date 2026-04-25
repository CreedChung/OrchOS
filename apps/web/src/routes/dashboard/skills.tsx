import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SkillsView } from "@/components/panels/SkillsView";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/skills")({ component: SkillsPage });

function SkillsPage() {
  const { skills, projects, refreshAll } = useDashboard();
  const { scopeFilter, capabilityViewMode, setScopeFilter } = useUIStore();
  const [sidebarWidth, setSidebarWidth] = useState(288);

  return (
    <SkillsView
      skills={skills}
      projects={projects}
      onRefresh={refreshAll}
      scopeFilter={scopeFilter}
      onScopeFilterChange={setScopeFilter}
      mode={capabilityViewMode}
      sidebarWidth={sidebarWidth}
      onSidebarWidthChange={setSidebarWidth}
    />
  );
}
