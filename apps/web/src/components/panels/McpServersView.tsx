import { useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { FolderGitIcon, Add01Icon, Delete02Icon, ToggleLeft, ToggleRight } from "@hugeicons/core-free-icons"
import { Button } from "#/components/ui/button"
import { ConfirmDialog } from "#/components/ui/confirm-dialog"
import { CreateMcpServerDialog } from "#/components/dialogs/CreateMcpServerDialog"
import { api, type McpServerProfile } from "#/lib/api"
import { m } from "#/paraglide/messages"

interface McpServersViewProps {
  servers: McpServerProfile[]
  onRefresh: () => void
  scopeFilter?: "all" | "global" | "project"
}

export function McpServersView({ servers: initialServers, onRefresh, scopeFilter = "all" }: McpServersViewProps) {
  const [servers, setServers] = useState<McpServerProfile[]>(initialServers)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [serverToDelete, setServerToDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setServers(initialServers)
  }, [initialServers])

  const handleCreated = async () => {
    setLoading(false)
    onRefresh()
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await api.toggleMcpServer(id, !enabled)
      onRefresh()
    } catch (err) {
      console.error("Failed to toggle MCP server:", err)
    }
  }

  const handleDelete = async (id: string) => {
    setServerToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!serverToDelete) return
    try {
      await api.deleteMcpServer(serverToDelete)
      onRefresh()
    } catch (err) {
      console.error("Failed to delete MCP server:", err)
    } finally {
      setServerToDelete(null)
    }
  }

  const filteredServers = scopeFilter === "all" ? servers : servers.filter((s) => s.scope === scopeFilter)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{m.mcp_servers()}</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
          {m.add()}
        </Button>
      </div>

      <div className="space-y-2">
        {filteredServers.map((server) => (
          <div
            key={server.id}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3"
          >
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <HugeiconsIcon icon={FolderGitIcon} className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{server.name}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {server.command} {server.args?.join(" ")}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleToggle(server.id, server.enabled)}
              className="text-muted-foreground hover:text-foreground"
              title={server.enabled ? m.disable() : m.enable()}
            >
              {server.enabled ? (
                <HugeiconsIcon icon={ToggleRight} className="size-5 text-emerald-500" />
              ) : (
                <HugeiconsIcon icon={ToggleLeft} className="size-5" />
              )}
            </button>
            <button
              onClick={() => handleDelete(server.id)}
              className="text-muted-foreground hover:text-destructive"
              title={m.delete()}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </button>
          </div>
        ))}
        {filteredServers.length === 0 && servers.length > 0 && (
          <p className="text-sm text-muted-foreground">{scopeFilter === "global" ? m.no_global_mcp_servers() : m.no_project_mcp_servers()}</p>
        )}
      </div>

      {servers.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
          <HugeiconsIcon icon={FolderGitIcon} className="mx-auto size-6 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{m.no_mcp_servers()}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {m.no_mcp_servers_desc()}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete()}
        description={m.delete_mcp_confirm()}
        onConfirm={handleDeleteConfirm}
        confirmLabel={m.delete()}
        variant="destructive"
      />

      <CreateMcpServerDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </div>
  )
}
