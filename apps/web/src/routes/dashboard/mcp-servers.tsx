import { useState } from "react";
import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { McpServersView } from "@/components/panels/McpServersView";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/mcp-servers")({ component: McpServersPage });

function McpServersPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { mcpServers, projects, refreshAll } = useDashboard();
  const { scopeFilter, capabilityViewMode, setScopeFilter } = useUIStore();
  const [sidebarWidth, setSidebarWidth] = useState(288);

  if (pathname !== "/dashboard/mcp-servers") {
    return <Outlet />;
  }

  return (
    <McpServersView
      servers={mcpServers}
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
