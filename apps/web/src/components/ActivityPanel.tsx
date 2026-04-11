import { useState } from "react"
import { ScrollArea } from "#/components/ui/scroll-area"
import { Separator } from "#/components/ui/separator"
import { Bot, PanelRightOpen, PanelRightClose, Brain } from "lucide-react"
import type { ActivityEntry } from "#/lib/types"

interface ActivityPanelProps {
  activities: ActivityEntry[]
}

export function ActivityPanel({ activities }: ActivityPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <aside className="flex h-full w-10 flex-col items-center border-l border-border bg-sidebar py-3">
        <button
          onClick={() => setCollapsed(false)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Expand activity panel"
        >
          <PanelRightOpen className="size-4" />
        </button>
        <div className="mt-3 flex flex-col items-center gap-1">
          {activities.slice(0, 6).map((a) => (
            <div key={a.id} className="size-1.5 rounded-full bg-primary/40" />
          ))}
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-72 flex-col border-l border-border bg-sidebar">
      {/* Header */}
      <div className="flex h-11 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Bot className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Agent Activity
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Collapse activity panel"
        >
          <PanelRightClose className="size-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0 p-3">
          {activities.map((activity, idx) => (
            <div key={activity.id}>
              <div className="group flex gap-2.5 py-2">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className="size-2 rounded-full bg-primary/60 ring-2 ring-sidebar" />
                  {idx < activities.length - 1 && (
                    <div className="mt-1 h-full w-px bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {activity.agent}
                    </span>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {activity.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80">{activity.action}</p>
                  {activity.detail && (
                    <p className="text-[11px] text-muted-foreground">{activity.detail}</p>
                  )}
                  {activity.reasoning && (
                    <div className="mt-1.5 rounded-md border border-border/50 bg-accent/30 px-2.5 py-1.5">
                      <div className="mb-1 flex items-center gap-1">
                        <Brain className="size-3 text-primary/70" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                          Reasoning
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {activity.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {idx < activities.length - 1 && <Separator className="!mt-0 opacity-0" />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}
