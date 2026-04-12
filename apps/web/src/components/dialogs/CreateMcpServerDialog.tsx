import { useState, useEffect } from "react"
import { m } from "#/paraglide/messages"
import { Button } from "#/components/ui/button"
import { api } from "#/lib/api"

interface CreateMcpServerDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateMcpServerDialog({ open, onClose, onCreated }: CreateMcpServerDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    command: "",
    args: "",
    scope: "global" as "global" | "project",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setFormData({ name: "", command: "", args: "", scope: "global" })
    }
  }, [open])

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
      onCreated()
      onClose()
    } catch (err) {
      console.error("Failed to create MCP server:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{m.mcp_servers()}</h2>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              {m.cancel()}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={loading || !formData.name || !formData.command}>
              {loading ? m.creating() : m.create()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
