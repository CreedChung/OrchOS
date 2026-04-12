import { useState } from "react"
import { cn } from "#/lib/utils"
import { m } from "#/paraglide/messages"
import { HugeiconsIcon } from "@hugeicons/react"
import { Play, Pause, Delete02Icon, MoreVertical, CheckmarkCircleIcon } from "@hugeicons/core-free-icons"
import type { Goal } from "#/lib/types"

interface GoalActionsProps {
  goal: Goal
  onPause: () => void
  onResume: () => void
  onDelete: () => void
}

const statusConfig = {
  active: { icon: Play, color: "text-emerald-500", bg: "bg-emerald-500/10", label: () => m.goal_active() },
  paused: { icon: Pause, color: "text-amber-500", bg: "bg-amber-500/10", label: () => m.goal_paused() },
  completed: { icon: CheckmarkCircleIcon, color: "text-blue-500", bg: "bg-blue-500/10", label: () => m.goal_completed() },
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
          <HugeiconsIcon icon={StatusIcon} className="size-3" />
          {config.label()}
        </span>

        {goal.status === "active" && (
          <button
            onClick={onPause}
            className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={m.pause_goal()}
          >
            <HugeiconsIcon icon={Pause} className="size-3.5" />
          </button>
        )}

        {goal.status === "paused" && (
          <button
            onClick={onResume}
            className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={m.resume_goal()}
          >
            <HugeiconsIcon icon={Play} className="size-3.5" />
          </button>
        )}

        {(goal.status === "active" || goal.status === "paused") && (
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <HugeiconsIcon icon={MoreVertical} className="size-3.5" />
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
                <HugeiconsIcon icon={Pause} className="size-3.5" />
                {m.pause()}
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
                <HugeiconsIcon icon={Play} className="size-3.5" />
                {m.resume()}
              </button>
            )}
            <button
              onClick={() => {
                if (confirm(m.delete_goal_confirm())) {
                  onDelete()
                }
                setShowMenu(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-destructive/10"
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
              {m.delete()}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
