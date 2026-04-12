import { useState, useCallback } from "react"
import { cn } from "#/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  GitPullRequestIcon,
  SquareIcon,
  InformationCircleIcon,
  Robot02Icon,
  Target01Icon,
  ViewOffIcon,
  MoreHorizontal,
  CheckmarkBadge01Icon,
} from "@hugeicons/core-free-icons"
import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import { m } from "#/paraglide/messages"
import type { Problem, InboxSource } from "#/lib/types"

const sourceConfig: Record<InboxSource, { icon: typeof GitPullRequestIcon; label: string; colorClass: string; bgClass: string; borderClass: string }> = {
  github_pr: {
    icon: GitPullRequestIcon,
    label: m.pull_request(),
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/5",
    borderClass: "border-purple-500/20",
  },
  github_issue: {
    icon: SquareIcon,
    label: m.issue(),
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/5",
    borderClass: "border-green-500/20",
  },
  mention: {
    icon: InformationCircleIcon,
    label: m.mention(),
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/5",
    borderClass: "border-blue-500/10",
  },
  agent_request: {
    icon: Robot02Icon,
    label: m.agent_request(),
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/5",
    borderClass: "border-amber-500/20",
  },
}

interface InboxDetailProps {
  item: Problem
  onConvertToGoal: (problemId: string, suggestedGoal?: string) => void
  onDismiss: (problemId: string) => void
}

export function InboxDetail({ item, onConvertToGoal, onDismiss }: InboxDetailProps) {
  const [converting, setConverting] = useState(false)

  const source = item.source as InboxSource
  const config = sourceConfig[source]
  const SourceIcon = config.icon

  const handleConvert = useCallback(() => {
    setConverting(true)
    onConvertToGoal(item.id, item.suggestedGoal)
  }, [item.id, item.suggestedGoal, onConvertToGoal])

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className={cn("flex size-12 items-center justify-center rounded-lg", config.bgClass)}>
              <HugeiconsIcon icon={SourceIcon} className={cn("size-5", config.colorClass)} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground">{item.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[9px] uppercase tracking-wider px-1.5 py-0">
                  {config.label}
                </Badge>
                {item.priority === "critical" && (
                  <Badge variant="destructive" className="text-[9px] uppercase tracking-wider px-1.5 py-0">
                    {m.critical()}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {item.createdAt.split("T")[0]} {item.createdAt.split("T")[1]?.slice(0, 5)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Context */}
        {item.context && (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              {m.context()}
            </h2>
            <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
              <p className="text-sm text-foreground whitespace-pre-wrap">{item.context}</p>
            </div>
          </section>
        )}

        {/* Suggested Goal */}
        {item.suggestedGoal && (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              {m.suggested()}
            </h2>
            <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-2.5">
              <HugeiconsIcon icon={Target01Icon} className="size-4 shrink-0 text-primary/60" />
              <span className="text-sm font-medium text-primary">{item.suggestedGoal}</span>
            </div>
          </section>
        )}

        {/* Actions */}
        <section>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleConvert}
              disabled={converting}
              className="inline-flex items-center gap-1.5"
            >
              <HugeiconsIcon icon={Target01Icon} className="size-3.5" />
              {converting ? m.converting() : m.convert_to_goal()}
            </Button>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm">
                  <HugeiconsIcon icon={MoreHorizontal} className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-36">
                <DropdownMenuItem onClick={() => onDismiss(item.id)}>
                  <HugeiconsIcon icon={ViewOffIcon} className="size-3.5" />
                  {m.dismiss()}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>
      </div>
    </main>
  )
}

export function InboxEmptyState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto size-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
          <HugeiconsIcon icon={CheckmarkBadge01Icon} className="size-5 text-emerald-500" />
        </div>
        <p className="text-sm text-muted-foreground">{m.inbox_is_empty()}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{m.no_new_items()}</p>
      </div>
    </div>
  )
}

export function InboxNoSelection() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{m.no_inbox_selected()}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{m.no_inbox_selected_desc()}</p>
      </div>
    </div>
  )
}
