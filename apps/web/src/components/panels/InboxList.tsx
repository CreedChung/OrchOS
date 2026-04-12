import { cn } from "#/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  GitPullRequestIcon,
  SquareIcon,
  InformationCircleIcon,
  Robot02Icon,
  CheckmarkBadge01Icon,
} from "@hugeicons/core-free-icons"
import { ScrollArea } from "#/components/ui/scroll-area"
import { Badge } from "#/components/ui/badge"
import { m } from "#/paraglide/messages"
import type { Problem, InboxSource } from "#/lib/types"
import { isInboxItem } from "#/lib/types"

type SourceFilter = "all" | InboxSource

const sourceConfig: Record<InboxSource, { icon: typeof GitPullRequestIcon; colorClass: string; bgClass: string }> = {
  github_pr: {
    icon: GitPullRequestIcon,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
  },
  github_issue: {
    icon: SquareIcon,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
  },
  mention: {
    icon: InformationCircleIcon,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
  },
  agent_request: {
    icon: Robot02Icon,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
  },
}

const sourceLabel: Record<InboxSource, string> = {
  github_pr: m.pull_request(),
  github_issue: m.issue(),
  mention: m.mention(),
  agent_request: m.agent_request(),
}

interface InboxListProps {
  problems: Problem[]
  activeInboxId: string | null
  sourceFilter: SourceFilter
  onSelectItem: (id: string) => void
}

export function InboxList({
  problems,
  activeInboxId,
  sourceFilter,
  onSelectItem,
}: InboxListProps) {
  const inboxItems = problems.filter((p) => {
    if (p.status !== "open" || !isInboxItem(p)) return false
    if (sourceFilter !== "all" && p.source !== sourceFilter) return false
    return true
  })

  return (
    <div className="flex h-full w-72 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{m.inbox()}</h2>
        <div className="flex items-center gap-1 h-7">
          {inboxItems.length > 0 && (
            <span className="text-[10px] tabular-nums text-muted-foreground">{inboxItems.length}</span>
          )}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {inboxItems.map((item) => {
            const source = item.source as InboxSource
            const config = sourceConfig[source]
            const isActive = item.id === activeInboxId

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground/80 hover:bg-accent/50"
                )}
              >
                <div className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md",
                  isActive ? config.bgClass : config.bgClass
                )}>
                  <HugeiconsIcon icon={config.icon} className={cn("size-3.5", config.colorClass)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-medium truncate", isActive && "text-accent-foreground")}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                      {sourceLabel[source]}
                    </Badge>
                    {item.priority === "critical" && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                        {m.critical()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {item.createdAt.split("T")[1]?.slice(0, 5) || ""}
                  </p>
                </div>
              </button>
            )
          })}

          {inboxItems.length === 0 && (
            <div className="py-8 text-center">
              <div className="mx-auto size-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <HugeiconsIcon icon={CheckmarkBadge01Icon} className="size-5 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground">{m.inbox_is_empty()}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{m.no_new_items()}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
