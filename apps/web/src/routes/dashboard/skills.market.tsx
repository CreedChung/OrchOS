import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { SkillsView } from "@/components/panels/SkillsView";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/skills/market")({ component: SkillsMarketPage });

function SkillsMarketPage() {
  const { skills, projects, refreshAll } = useDashboard();
  const { scopeFilter, setScopeFilter, setCapabilityViewMode } = useUIStore();
  const [sidebarWidth, setSidebarWidth] = useState(288);

  useEffect(() => {
    setCapabilityViewMode("market");
  }, [setCapabilityViewMode]);

  return (
    <SkillsView
      skills={skills}
      projects={projects}
      onRefresh={refreshAll}
      scopeFilter={scopeFilter}
      onScopeFilterChange={setScopeFilter}
      mode="market"
      sidebarWidth={sidebarWidth}
      onSidebarWidthChange={setSidebarWidth}
    />
  );
}
