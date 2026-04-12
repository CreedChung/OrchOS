import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, ArrowRight01Icon, Shield01Icon } from "@hugeicons/core-free-icons"
import type { Problem } from "#/lib/types"

interface CreateRuleDialogProps {
  open: boolean
  onClose: () => void
  problem: Problem | null
  onSubmit: (data: { name: string; condition: string; action: string }) => void
}

const conditionLabels: Record<string, string> = {
  test_failed: "Test failed",
  lint_error: "Lint error",
  lint_warning: "Lint warning",
  review_rejected: "Review rejected",
  build_failed: "Build failed",
  build_success: "Build success",
}

const actionLabels: Record<string, string> = {
  auto_fix: "Auto fix",
  ignore: "Ignore",
  assign_reviewer: "Assign reviewer",
  archive: "Archive",
  notify: "Notify",
}

function inferCondition(problem: Problem): string {
  const title = problem.title.toLowerCase()
  if (title.includes("test")) return "test_failed"
  if (title.includes("lint")) return "lint_error"
  if (title.includes("review") || title.includes("pr") || title.includes("reject")) return "review_rejected"
  if (title.includes("build")) return "build_failed"
  return "test_failed"
}

function inferAction(problem: Problem): string {
  const title = problem.title.toLowerCase()
  if (title.includes("lint") || title.includes("info") || title.includes("success")) return "ignore"
  if (title.includes("review")) return "assign_reviewer"
  return "auto_fix"
}

export function CreateRuleDialog({ open, onClose, problem, onSubmit }: CreateRuleDialogProps) {
  const [name, setName] = useState("")
  const [condition, setCondition] = useState("test_failed")
  const [action, setAction] = useState("auto_fix")

  if (!open || !problem) return null

  // Auto-fill based on problem
  const defaultName = `Auto-handle: ${problem.title}`
  const defaultCondition = inferCondition(problem)
  const defaultAction = inferAction(problem)

  const currentName = name || defaultName
  const currentCondition = condition || defaultCondition
  const currentAction = action || defaultAction

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name: currentName, condition: currentCondition, action: currentAction })
    setName("")
    setCondition("test_failed")
    setAction("auto_fix")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Shield01Icon} className="size-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Create Rule</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </button>
        </div>

        {/* Source problem info */}
        <div className="mb-4 rounded-md border border-border/50 bg-accent/20 px-3 py-2">
          <p className="text-xs text-muted-foreground">From problem:</p>
          <p className="text-sm font-medium text-foreground">{problem.title}</p>
          {problem.context && (
            <p className="text-xs text-muted-foreground mt-0.5">{problem.context}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rule Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Rule Name
            </label>
            <input
              type="text"
              value={name || defaultName}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Condition -> Action */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Rule Logic
            </label>
            <div className="flex items-center gap-2">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(conditionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground shrink-0" />
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(actionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
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
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
