import { createFileRoute } from '@tanstack/react-router'
import { McpServersView } from '#/components/panels/McpServersView'
import { useDashboard } from '#/lib/dashboard-context'
import { useUIStore } from '#/lib/store'

export const Route = createFileRoute('/dashboard/mcp-servers')({ component: McpServersPage })

function McpServersPage() {
  const { mcpServers, refreshAll } = useDashboard()
  const { scopeFilter } = useUIStore()

  return <McpServersView servers={mcpServers} onRefresh={refreshAll} scopeFilter={scopeFilter} />
}
