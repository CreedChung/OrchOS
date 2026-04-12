import { useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { FolderGitIcon, Add01Icon, Delete02Icon, ToggleLeft, ToggleRight } from "@hugeicons/core-free-icons"
import { Button } from "#/components/ui/button"
import { api, type McpServerProfile } from "#/lib/api"
import { m } from "#/paraglide/messages"

interface McpServersViewProps {
  servers: McpServerProfile[]
  onRefresh: () => void
}

export function McpServersView({ servers: initialServers, onRefresh }: McpServersViewProps) {
  const [servers, setServers] = useState<McpServerProfile[]>(initialServers)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    command: "",
    args: "",
    scope: "global" as "global" | "project",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setServers(initialServers)
  }, [initialServers])

  const handleCreate = async () => {
    if (!formData.name || !formData.command) return
    setLoading(true)
    try {
      const args = formData.args ? formData.args.split(" ").filter(Boolean) : []
      await api.createMcpServer({
        name: formData.name,
        command: formData.command,
        args,
        scope: formData.scope,
      })
      setFormData({ name: "", command: "", args: "", scope: "global" })
      setShowForm(false)
      onRefresh()
    } catch (err) {
      console.error("Failed to create MCP server:", err)
    } finally {
      setLoading(false)
    }
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
    if (!confirm(m.delete_mcp_confirm())) return
    try {
      await api.deleteMcpServer(id)
      onRefresh()
    } catch (err) {
      console.error("Failed to delete MCP server:", err)
    }
  }

  const globalServers = servers.filter((s) => s.scope === "global")
  const projectServers = servers.filter((s) => s.scope === "project")

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{m.mcp_servers()}</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
          {m.add()}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">{m.field_name()}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={m.mcp_name_placeholder()}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{m.command()}</label>
              <input
                type="text"
                value={formData.command}
                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                placeholder={m.mcp_command_placeholder()}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{m.mcp_args_label()}</label>
              <input
                type="text"
                value={formData.args}
                onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                placeholder={m.mcp_args_placeholder()}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{m.scope()}</label>
              <select
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value as "global" | "project" })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="global">{m.scope_global()}</option>
                <option value="project">{m.scope_project()}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={loading}>
                {loading ? m.creating() : m.create()}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                {m.cancel()}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Global Servers */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-foreground">
          {m.global()} ({globalServers.length})
        </h3>
        <div className="space-y-2">
          {globalServers.map((server) => (
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
          {globalServers.length === 0 && (
            <p className="text-sm text-muted-foreground">{m.no_global_mcp_servers()}</p>
          )}
        </div>
      </div>

      {/* Project Servers */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-foreground">
          {m.project()} ({projectServers.length})
        </h3>
        <div className="space-y-2">
          {projectServers.map((server) => (
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
          {projectServers.length === 0 && (
            <p className="text-sm text-muted-foreground">{m.no_project_mcp_servers()}</p>
          )}
        </div>
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
    </div>
  )
}
