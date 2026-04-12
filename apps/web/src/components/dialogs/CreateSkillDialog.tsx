import { useState, useEffect } from "react"
import { m } from "#/paraglide/messages"
import { Button } from "#/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select"
import { api } from "#/lib/api"

interface CreateSkillDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateSkillDialog({ open, onClose, onCreated }: CreateSkillDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    scope: "global" as "global" | "project",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setFormData({ name: "", description: "", scope: "global" })
    }
  }, [open])

  const handleCreate = async () => {
    if (!formData.name) return
    setLoading(true)
    try {
      await api.createSkill({
        name: formData.name,
        description: formData.description || undefined,
        scope: formData.scope,
      })
      onCreated()
      onClose()
    } catch (err) {
      console.error("Failed to create skill:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{m.skills()}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">{m.skill_name()}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={m.skill_name_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{m.skill_description()}</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={m.skill_description_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{m.scope()}</label>
            <Select
              value={formData.scope}
              onValueChange={(v) => setFormData({ ...formData, scope: v as "global" | "project" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="global">{m.scope_global()}</SelectItem>
                  <SelectItem value="project">{m.scope_project()}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              {m.cancel()}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={loading || !formData.name}>
              {loading ? m.creating() : m.create()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
