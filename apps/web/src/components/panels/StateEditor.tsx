import { useState } from "react"
import { cn } from "#/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Edit02Icon, Tick02Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import type { Status, StateItem } from "#/lib/types"

interface StateEditorProps {
  state: StateItem
  onStatusChange: (newStatus: Status) => void
}

const statusOptions: Status[] = ["pending", "running", "success", "failed", "error", "warning"]

const statusLabelMap: Record<Status, string> = {
  success: "Success",
  failed: "Failed",
  error: "Error",
  pending: "Pending",
  running: "Running",
  warning: "Warning",
}

const statusPillClass: Record<Status, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400",
  error: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
}

export function StateEditor({ state, onStatusChange }: StateEditorProps) {
  const [editing, setEditing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<Status>(state.status)

  const handleSave = () => {
    onStatusChange(selectedStatus)
    setEditing(false)
  }

  const handleCancel = () => {
    setSelectedStatus(state.status)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-card px-3 py-2">
        <span className="min-w-[90px] text-sm font-medium text-foreground">{state.label}</span>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as Status)}
          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {statusLabelMap[status]}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          className="rounded p-1 text-emerald-500 hover:bg-emerald-500/10"
          title="Save"
        >
          <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
        </button>
        <button
          onClick={handleCancel}
          className="rounded p-1 text-red-500 hover:bg-red-500/10"
          title="Cancel"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 transition-colors hover:bg-accent/50">
      <span className="min-w-[90px] text-sm font-medium text-foreground">{state.label}</span>

      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
          statusPillClass[state.status]
        )}
      >
        {statusLabelMap[state.status]}
      </span>

      <div className="ml-auto flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Edit status"
        >
          <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
