import { useState } from "react"
import { ScrollArea } from "#/components/ui/scroll-area"
import { Bot, PanelRightOpen, PanelRightClose, Brain, ArrowRight, CheckCircle2, XCircle, Clock } from "lucide-react"
import type { ActivityEntry } from "#/lib/types"

interface ActivityPanelProps {
  activities: ActivityEntry[]
}

function AcpFlow({ activities }: { activities: ActivityEntry[] }) {
  if (activities.length === 0) return null

  return (
    <div className="space-y-1 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">ACP Flow</span>
        <div className="flex-1 h-px bg-border/50" />
      </div>
      {activities.slice(0, 8).map((activity, idx) => {
        const isSuccess = activity.detail?.includes("pass") || activity.detail?.includes("success") || activity.detail?.includes("created")
        const isFailed = activity.detail?.includes("fail") || activity.detail?.includes("error") || activity.detail?.includes("rejected")
        const ResultIcon = isSuccess ? CheckCircle2 : isFailed ? XCircle : Clock

        return (
          <div key={activity.id} className="flex items-start gap-2 py-1">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Bot className={cn("size-3", isSuccess ? "text-emerald-500" : isFailed ? "text-red-500" : "text-muted-foreground")} />
                <ArrowRight className="size-2 text-muted-foreground/50" />
                <ResultIcon className={cn("size-3", isSuccess ? "text-emerald-500" : isFailed ? "text-red-500" : "text-muted-foreground")} />
              </div>
              {idx < activities.length - 1 && (
                <div className="mt-0.5 h-3 w-px bg-border/40" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-foreground/80">{activity.agent}</span>
              <span className="mx-1 text-[10px] text-muted-foreground/50">{"\u2192"}</span>
              <span className="text-[11px] text-foreground/60">{activity.action}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
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
            Timeline
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
        {/* ACP Flow */}
        <AcpFlow activities={activities} />

        {/* Detailed Timeline */}
        <div className="border-t border-border/50 p-3 space-y-0">
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
            </div>
          ))}
          {activities.length === 0 && (
            <div className="py-8 text-center">
              <Bot className="mx-auto size-6 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No activity yet</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
