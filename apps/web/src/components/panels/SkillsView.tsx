import { useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Wrench01Icon, Add01Icon, Delete02Icon, ToggleLeft, ToggleRight } from "@hugeicons/core-free-icons"
import { Button } from "#/components/ui/button"
import { ConfirmDialog } from "#/components/ui/confirm-dialog"
import { CreateSkillDialog } from "#/components/dialogs/CreateSkillDialog"
import { api, type SkillProfile } from "#/lib/api"
import { cn } from "#/lib/utils"
import { m } from "#/paraglide/messages"

interface SkillsViewProps {
  skills: SkillProfile[]
  onRefresh: () => void
  scopeFilter?: "all" | "global" | "project"
}

export function SkillsView({ skills: initialSkills, onRefresh, scopeFilter = "all" }: SkillsViewProps) {
  const [skills, setSkills] = useState<SkillProfile[]>(initialSkills)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSkills(initialSkills)
  }, [initialSkills])

  const handleCreated = async () => {
    setLoading(false)
    onRefresh()
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await api.toggleSkill(id, !enabled)
      onRefresh()
    } catch (err) {
      console.error("Failed to toggle skill:", err)
    }
  }

  const handleDelete = async (id: string) => {
    setSkillToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!skillToDelete) return
    try {
      await api.deleteSkill(skillToDelete)
      onRefresh()
    } catch (err) {
      console.error("Failed to delete skill:", err)
    } finally {
      setSkillToDelete(null)
    }
  }

  const filteredSkills = scopeFilter === "all" ? skills : skills.filter((s) => s.scope === scopeFilter)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{m.skills()}</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
          {m.add()}
        </Button>
      </div>

      <div className="space-y-2">
        {filteredSkills.map((skill) => (
          <div
            key={skill.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3",
              !skill.enabled && "opacity-60"
            )}
          >
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <HugeiconsIcon icon={Wrench01Icon} className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{skill.name}</span>
              </div>
              {skill.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">{skill.description}</p>
              )}
            </div>
            <button
              onClick={() => handleToggle(skill.id, skill.enabled)}
              className="text-muted-foreground hover:text-foreground"
              title={skill.enabled ? m.disable() : m.enable()}
            >
              {skill.enabled ? (
                <HugeiconsIcon icon={ToggleRight} className="size-5 text-emerald-500" />
              ) : (
                <HugeiconsIcon icon={ToggleLeft} className="size-5" />
              )}
            </button>
            <button
              onClick={() => handleDelete(skill.id)}
              className="text-muted-foreground hover:text-destructive"
              title={m.delete()}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </button>
          </div>
        ))}
        {filteredSkills.length === 0 && skills.length > 0 && (
          <p className="text-sm text-muted-foreground">{scopeFilter === "global" ? m.no_global_skills() : m.no_project_skills()}</p>
        )}
      </div>

      {skills.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
          <HugeiconsIcon icon={Wrench01Icon} className="mx-auto size-6 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{m.no_skills()}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {m.no_skills_desc()}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete()}
        description={m.delete_skill_confirm()}
        onConfirm={handleDeleteConfirm}
        confirmLabel={m.delete()}
        variant="destructive"
      />

      <CreateSkillDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </div>
  )
}
