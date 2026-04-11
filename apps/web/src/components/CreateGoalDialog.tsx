import { useState } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { cn } from "#/lib/utils"

interface CreateGoalDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { title: string; description?: string; successCriteria: string[]; constraints?: string[] }) => void
}

export function CreateGoalDialog({ open, onClose, onSubmit }: CreateGoalDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [criteria, setCriteria] = useState<string[]>([""])
  const [constraints, setConstraints] = useState<string[]>([])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validCriteria = criteria.filter((c) => c.trim())
    if (!title.trim() || validCriteria.length === 0) return
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      successCriteria: validCriteria,
      constraints: constraints.filter((c) => c.trim()),
    })
    setTitle("")
    setDescription("")
    setCriteria([""])
    setConstraints([])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Create New Goal</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Goal Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement login system"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should this goal accomplish?"
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Success Criteria */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Success Criteria *
            </label>
            <div className="space-y-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => {
                      const next = [...criteria]
                      next[i] = e.target.value
                      setCriteria(next)
                    }}
                    placeholder="e.g. tests pass"
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCriteria([...criteria, ""])}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
              >
                <Plus className="size-3" /> Add criterion
              </button>
            </div>
          </div>

          {/* Constraints */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Constraints
            </label>
            <div className="space-y-2">
              {constraints.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => {
                      const next = [...constraints]
                      next[i] = e.target.value
                      setConstraints(next)
                    }}
                    placeholder="e.g. use typescript"
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setConstraints(constraints.filter((_, j) => j !== i))}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setConstraints([...constraints, ""])}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
              >
                <Plus className="size-3" /> Add constraint
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || criteria.filter((c) => c.trim()).length === 0}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
                title.trim() && criteria.filter((c) => c.trim()).length > 0
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Create Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
