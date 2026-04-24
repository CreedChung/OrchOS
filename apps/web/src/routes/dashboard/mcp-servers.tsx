import { createFileRoute } from "@tanstack/react-router";
import { McpServersView } from "@/components/panels/McpServersView";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/mcp-servers")({ component: McpServersPage });

function McpServersPage() {
  const { mcpServers, projects, refreshAll } = useDashboard();
  const { scopeFilter, capabilityViewMode } = useUIStore();

  return (
    <McpServersView
      servers={mcpServers}
      projects={projects}
      onRefresh={refreshAll}
      scopeFilter={scopeFilter}
      mode={capabilityViewMode}
    />
  );
}
