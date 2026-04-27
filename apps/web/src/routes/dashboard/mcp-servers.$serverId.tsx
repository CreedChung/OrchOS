import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { McpMarketDetailView } from "@/components/panels/McpMarketDetailView";
import { useDashboard } from "@/lib/dashboard-context";
import { api } from "@/lib/api";

export const Route = createFileRoute("/dashboard/mcp-servers/$serverId")({
  loader: async ({ params }) => api.getMcpMarketItem(params.serverId),
  component: McpMarketDetailPage,
});

function McpMarketDetailPage() {
  const item = Route.useLoaderData();
  const { projects, refreshAll } = useDashboard();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <McpMarketDetailView
      key={`${item.id}-${refreshKey}`}
      item={item}
      projects={projects}
      onRefresh={() => {
        refreshAll();
        setRefreshKey((value) => value + 1);
      }}
    />
  );
}
