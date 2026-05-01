import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { McpServersView } from "@/components/panels/McpServersView";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/mcp-servers/market")({ component: McpServersMarketPage });

function McpServersMarketPage() {
  const { mcpServers, projects, refreshAll } = useDashboard();
  const { scopeFilter, setScopeFilter, setCapabilityViewMode } = useUIStore();
  const [sidebarWidth, setSidebarWidth] = useState(288);

  useEffect(() => {
    setCapabilityViewMode("market");
  }, [setCapabilityViewMode]);

  return (
    <McpServersView
      servers={mcpServers}
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
