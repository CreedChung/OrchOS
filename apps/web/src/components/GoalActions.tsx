import { useState } from "react"
import { cn } from "#/lib/utils"
import { Play, Pause, Trash2, MoreVertical, CheckCircle, AlertCircle, Clock } from "lucide-react"
import type { Goal } from "#/lib/types"

interface GoalActionsProps {
  goal: Goal
  onPause: () => void
  onResume: () => void
  onDelete: () => void
}

const statusConfig = {
  active: { icon: Play, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Active" },
  paused: { icon: Pause, color: "text-amber-500", bg: "bg-amber-500/10", label: "Paused" },
  completed: { icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-500/10", label: "Completed" },
}

export function GoalActions({ goal, onPause, onResume, onDelete }: GoalActionsProps) {
  const [showMenu, setShowMenu] = useState(false)
  const config = statusConfig[goal.status]
  const StatusIcon = config.icon

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            config.bg,
            config.color
          )}
        >
          <StatusIcon className="size-3" />
          {config.label}
        </span>

        {goal.status === "active" && (
          <button
            onClick={onPause}
            className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Pause goal"
          >
            <Pause className="size-3.5" />
          </button>
        )}

        {goal.status === "paused" && (
          <button
            onClick={onResume}
            className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Resume goal"
          >
            <Play className="size-3.5" />
          </button>
        )}

        {(goal.status === "active" || goal.status === "paused") && (
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <MoreVertical className="size-3.5" />
          </button>
        )}
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-border bg-card py-1 shadow-lg">
            {goal.status === "active" && (
              <button
                onClick={() => {
                  onPause()
                  setShowMenu(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent"
              >
                <Pause className="size-3.5" />
                Pause
              </button>
            )}
            {goal.status === "paused" && (
              <button
                onClick={() => {
                  onResume()
                  setShowMenu(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent"
              >
                <Play className="size-3.5" />
                Resume
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("Are you sure you want to delete this goal?")) {
                  onDelete()
                }
                setShowMenu(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
