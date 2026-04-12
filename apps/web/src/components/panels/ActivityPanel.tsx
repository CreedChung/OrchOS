import { ScrollArea } from "#/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import { Robot02Icon, AiBrain01Icon, ArrowRight01Icon, CheckmarkCircleIcon, CancelCircleIcon, Clock01Icon, FileCodeIcon, Message01Icon, Workflow } from "@hugeicons/core-free-icons"
import { cn } from "#/lib/utils"
import { m } from "#/paraglide/messages"
import type { ActivityEntry } from "#/lib/types"

interface ActivityPanelProps {
  activities: ActivityEntry[]
  collapsed: boolean
  onToggle: () => void
}

function AcpFlow({ activities }: { activities: ActivityEntry[] }) {
  if (activities.length === 0) return null

  return (
    <div className="space-y-1 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">{m.acp_flow()}</span>
        <div className="flex-1 h-px bg-border/50" />
      </div>
      {activities.slice(0, 8).map((activity, idx) => {
        const isSuccess = activity.detail?.includes("pass") || activity.detail?.includes("success") || activity.detail?.includes("created")
        const isFailed = activity.detail?.includes("fail") || activity.detail?.includes("error") || activity.detail?.includes("rejected")
        const ResultIcon = isSuccess ? CheckmarkCircleIcon : isFailed ? CancelCircleIcon : Clock01Icon

        return (
          <div key={activity.id} className="flex items-start gap-2 py-1">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <HugeiconsIcon icon={Robot02Icon} className={cn("size-3", isSuccess ? "text-emerald-500" : isFailed ? "text-red-500" : "text-muted-foreground")} />
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-2 text-muted-foreground/50" />
                <HugeiconsIcon icon={ResultIcon} className={cn("size-3", isSuccess ? "text-emerald-500" : isFailed ? "text-red-500" : "text-muted-foreground")} />
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

function MessagesView({ activities }: { activities: ActivityEntry[] }) {
  if (activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <HugeiconsIcon icon={Message01Icon} className="mx-auto size-6 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">{m.no_messages_yet()}</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-0">
      {activities.map((activity) => (
        <div key={activity.id} className="group flex gap-2.5 py-2">
          <div className="flex flex-col items-center">
            <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon icon={Robot02Icon} className="size-3 text-primary/70" />
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-foreground">{activity.agent}</span>
              <span className="text-[10px] tabular-nums text-muted-foreground">{activity.timestamp}</span>
            </div>
            <p className="text-xs text-foreground/80">{activity.action}</p>
            {activity.detail && (
              <p className="text-[11px] text-muted-foreground">{activity.detail}</p>
            )}
            {activity.reasoning && (
              <div className="mt-1.5 rounded-md border border-border/50 bg-accent/30 px-2.5 py-1.5">
                <div className="mb-1 flex items-center gap-1">
                  <HugeiconsIcon icon={AiBrain01Icon} className="size-3 text-primary/70" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">{m.reasoning()}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{activity.reasoning}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function DiffView({ activities }: { activities: ActivityEntry[] }) {
  const activitiesWithDiff = activities.filter((a) => a.diff)

  if (activitiesWithDiff.length === 0) {
    return (
      <div className="py-8 text-center">
        <HugeiconsIcon icon={FileCodeIcon} className="mx-auto size-6 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">{m.no_diffs_yet()}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">{m.diffs_appear_when()}</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      {activitiesWithDiff.map((activity) => (
        <div key={activity.id} className="rounded-md border border-border/50 overflow-hidden">
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 border-b border-border/50">
            <HugeiconsIcon icon={Robot02Icon} className="size-3 text-primary/70" />
            <span className="text-[11px] font-medium text-foreground/80">{activity.agent}</span>
            <span className="text-[10px] text-muted-foreground">{activity.action}</span>
            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{activity.timestamp}</span>
          </div>
          <pre className="overflow-x-auto p-3 text-[11px] font-mono leading-relaxed">
            <code>{activity.diff}</code>
          </pre>
        </div>
      ))}
    </div>
  )
}

export function ActivityPanel({ activities, collapsed, onToggle }: ActivityPanelProps) {
  if (collapsed) {
    return null
  }

  return (
    <aside className="flex h-full w-72 flex-col border-l border-border bg-sidebar">
      {/* Header */}
      <div className="flex h-11 items-center justify-center border-b border-border px-3">
        <Tabs defaultValue="flow">
          <TabsList>
            <TabsTrigger value="flow">
              <HugeiconsIcon icon={Workflow} className="size-3" />
              {m.flow()}
            </TabsTrigger>
            <TabsTrigger value="messages">
              <HugeiconsIcon icon={Message01Icon} className="size-3" />
              {m.messages()}
            </TabsTrigger>
            <TabsTrigger value="diff">
              <HugeiconsIcon icon={FileCodeIcon} className="size-3" />
              {m.diff()}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <Tabs defaultValue="flow" className="flex flex-1 flex-col">
        <TabsContent value="flow" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <AcpFlow activities={activities} />
            {/* Detailed Timeline below flow */}
            <div className="border-t border-border/50 p-3 space-y-0">
              {activities.map((activity, idx) => (
                <div key={activity.id}>
                  <div className="group flex gap-2.5 py-2">
                    <div className="flex flex-col items-center">
                      <div className="size-2 rounded-full bg-primary/60 ring-2 ring-sidebar" />
                      {idx < activities.length - 1 && (
                        <div className="mt-1 h-full w-px bg-border" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-foreground">{activity.agent}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{activity.timestamp}</span>
                      </div>
                      <p className="text-xs text-foreground/80">{activity.action}</p>
                      {activity.detail && (
                        <p className="text-[11px] text-muted-foreground">{activity.detail}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="py-8 text-center">
                  <HugeiconsIcon icon={Robot02Icon} className="mx-auto size-6 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">{m.no_activity_yet()}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="messages" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <MessagesView activities={activities} />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="diff" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <DiffView activities={activities} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  )
}
