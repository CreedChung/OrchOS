import { useEffect, useState } from "react";
import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { SkillsView } from "@/components/panels/SkillsView";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/skills")({ component: SkillsPage });

function SkillsPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { skills, projects, refreshAll } = useDashboard();
  const { scopeFilter, capabilityViewMode, setScopeFilter, setCapabilityViewMode } = useUIStore();
  const [sidebarWidth, setSidebarWidth] = useState(288);

  useEffect(() => {
    setCapabilityViewMode("market");
  }, [setCapabilityViewMode]);

  if (pathname !== "/dashboard/skills") {
    return <Outlet />;
  }

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
