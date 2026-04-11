import { useState, useEffect, useCallback, useMemo } from "react"
import { cn } from "#/lib/utils"
import { ScrollArea } from "#/components/ui/scroll-area"
import { Badge } from "#/components/ui/badge"
import {
  Flame,
  AlertTriangle,
  Info,
  CheckSquare,
  Square,
  Archive,
  Wrench,
  EyeOff,
  UserPlus,
  Shield,
  MoreHorizontal,
  Bot,
  ChevronDown,
  ChevronRight,
  Brain,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import type { Problem, ProblemPriority, ProblemStatus, Goal, ActivityEntry } from "#/lib/types"

interface ProblemInboxProps {
  problems: Problem[]
  goals: Goal[]
  activities: ActivityEntry[]
  onProblemAction: (problemId: string, action: string) => void
  onBulkAction: (ids: string[], status: ProblemStatus) => void
  onCreateRule: (problem: Problem) => void
}

const priorityConfig: Record<ProblemPriority, { icon: React.ElementType; label: string; colorClass: string; bgClass: string; borderClass: string }> = {
  critical: {
    icon: Flame,
    label: "Critical",
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/5",
    borderClass: "border-red-500/20",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/5",
    borderClass: "border-amber-500/20",
  },
  info: {
    icon: Info,
    label: "Info",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/5",
    borderClass: "border-blue-500/10",
  },
}

const actionIconMap: Record<string, React.ElementType> = {
  Fix: Wrench,
  Ignore: EyeOff,
  Assign: UserPlus,
  Archive: Archive,
  "Apply fix": Wrench,
  Override: Shield,
  Dismiss: EyeOff,
  "Apply suggestion": Wrench,
}

type PriorityFilter = "all" | "critical" | "warning" | "info"

export function ProblemInbox({ problems, goals, activities, onProblemAction, onBulkAction, onCreateRule }: ProblemInboxProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all")
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())

  const openProblems = useMemo(() => {
    let filtered = problems.filter((p) => p.status === "open")
    if (priorityFilter !== "all") {
      filtered = filtered.filter((p) => p.priority === priorityFilter)
    }
    return filtered
  }, [problems, priorityFilter])

  const counts = useMemo(() => ({
    all: problems.filter((p) => p.status === "open").length,
    critical: problems.filter((p) => p.status === "open" && p.priority === "critical").length,
    warning: problems.filter((p) => p.status === "open" && p.priority === "warning").length,
    info: problems.filter((p) => p.status === "open" && p.priority === "info").length,
  }), [problems])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === openProblems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(openProblems.map((p) => p.id)))
    }
  }

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault()
      setFocusedIndex((prev) => Math.min(prev + 1, openProblems.length - 1))
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault()
      setFocusedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "x" && focusedIndex >= 0 && focusedIndex < openProblems.length) {
      e.preventDefault()
      toggleSelect(openProblems[focusedIndex].id)
    } else if (e.key === "a" && focusedIndex >= 0 && focusedIndex < openProblems.length) {
      e.preventDefault()
      const problem = openProblems[focusedIndex]
      onProblemAction(problem.id, "Assign")
    } else if (e.key === "f" && focusedIndex >= 0 && focusedIndex < openProblems.length) {
      e.preventDefault()
      const problem = openProblems[focusedIndex]
      onProblemAction(problem.id, "Fix")
    } else if (e.key === "i" && focusedIndex >= 0 && focusedIndex < openProblems.length) {
      e.preventDefault()
      const problem = openProblems[focusedIndex]
      onProblemAction(problem.id, "Ignore")
    }
  }, [focusedIndex, openProblems, onProblemAction])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <div className="flex items-center gap-1.5">
          {(["all", "critical", "warning", "info"] as PriorityFilter[]).map((filter) => {
            const config = filter === "all" ? null : priorityConfig[filter]
            return (
              <button
                key={filter}
                onClick={() => setPriorityFilter(filter)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  priorityFilter === filter
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {config && <config.icon className="size-3" />}
                <span className="capitalize">{filter}</span>
                <span className="tabular-nums text-[10px] opacity-60">{counts[filter]}</span>
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
          <kbd className="rounded border border-border px-1 py-0.5 font-mono">j/k</kbd> navigate
          <kbd className="rounded border border-border px-1 py-0.5 font-mono">x</kbd> select
          <kbd className="rounded border border-border px-1 py-0.5 font-mono">f</kbd> fix
          <kbd className="rounded border border-border px-1 py-0.5 font-mono">i</kbd> ignore
          <kbd className="rounded border border-border px-1 py-0.5 font-mono">a</kbd> assign
        </div>
      </div>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border-b border-border bg-accent/30 px-4 py-2">
          <span className="text-xs font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => onBulkAction(Array.from(selectedIds), "fixed")}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            <Wrench className="size-3" />
            Auto fix
          </button>
          <button
            onClick={() => onBulkAction(Array.from(selectedIds), "ignored")}
            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            <EyeOff className="size-3" />
            Ignore all
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Select All */}
      {openProblems.length > 0 && (
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-1.5">
          <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
            {selectedIds.size === openProblems.length ? (
              <CheckSquare className="size-3.5" />
            ) : (
              <Square className="size-3.5" />
            )}
          </button>
          <span className="text-xs text-muted-foreground">
            {openProblems.length} problem{openProblems.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Problem List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {openProblems.map((problem, idx) => {
            const config = priorityConfig[problem.priority]
            const PriorityIcon = config.icon
            const isSelected = selectedIds.has(problem.id)
            const isFocused = idx === focusedIndex
            const goal = problem.goalId ? goals.find((g) => g.id === problem.goalId) : null

            return (
              <div key={problem.id} className="transition-colors hover:bg-accent/30">
                <div
                  className={cn(
                    "group flex gap-3 px-4 py-3",
                    config.bgClass,
                    isFocused && "ring-1 ring-in-ring ring-primary/30",
                    isSelected && "bg-accent/20",
                  )}
                  onClick={() => setFocusedIndex(idx)}
                >
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSelect(problem.id)
                  }}
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {isSelected ? (
                    <CheckSquare className="size-4 text-primary" />
                  ) : (
                    <Square className="size-4" />
                  )}
                </button>

                {/* Priority Icon */}
                <PriorityIcon className={cn("mt-0.5 size-4 shrink-0", config.colorClass)} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{problem.title}</span>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-wider px-1.5 py-0">
                      {config.label}
                    </Badge>
                  </div>

                  {/* Metadata */}
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {problem.source && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-foreground/70">agent:</span>
                        {problem.source}
                      </span>
                    )}
                    {problem.context && (
                      <>
                        <span className="text-muted-foreground/30">|</span>
                        <span className="truncate">{problem.context}</span>
                      </>
                    )}
                    {goal && (
                      <>
                        <span className="text-muted-foreground/30">|</span>
                        <span className="font-medium text-primary/70">{goal.title}</span>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {problem.actions && problem.actions.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {problem.actions.map((action) => {
                        const ActionIcon = actionIconMap[action] || Wrench
                        return (
                          <button
                            key={action}
                            onClick={(e) => {
                              e.stopPropagation()
                              onProblemAction(problem.id, action)
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            <ActionIcon className="size-3" />
                            {action}
                          </button>
                        )
                      })}

                      {/* View History */}
                      {problem.goalId && activities.some((a) => a.goalId === problem.goalId) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedHistory((prev) => {
                              const next = new Set(prev)
                              if (next.has(problem.id)) next.delete(problem.id)
                              else next.add(problem.id)
                              return next
                            })
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          {expandedHistory.has(problem.id) ? (
                            <ChevronDown className="size-3" />
                          ) : (
                            <ChevronRight className="size-3" />
                          )}
                          <Bot className="size-3" />
                          View History
                        </button>
                      )}

                      {/* Create Rule from this problem */}
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger className="ml-1 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-foreground">
                          <MoreHorizontal className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-40">
                          <DropdownMenuItem onClick={() => onCreateRule(problem)}>
                            <Shield className="size-3.5" />
                            Create rule from this
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="shrink-0 text-[10px] text-muted-foreground tabular-nums self-start mt-0.5">
                  {problem.createdAt.split("T")[1]?.slice(0, 5) || ""}
                </div>
              </div>

              {/* Expanded History */}
              {expandedHistory.has(problem.id) && problem.goalId && (
                <div className="ml-9 mr-4 mb-2 rounded-md border border-border/50 bg-card/50 px-3 py-2 space-y-1.5">
                  {activities
                    .filter((a) => a.goalId === problem.goalId)
                    .slice(0, 6)
                    .map((activity) => {
                      const isSuccess = activity.detail?.includes("pass") || activity.detail?.includes("success")
                      const isFailed = activity.detail?.includes("fail") || activity.detail?.includes("error")
                      return (
                        <div key={activity.id} className="flex items-start gap-2">
                          <Bot className={cn(
                            "size-3 mt-0.5 shrink-0",
                            isSuccess ? "text-emerald-500" : isFailed ? "text-red-500" : "text-muted-foreground"
                          )} />
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-medium text-foreground/80">{activity.agent}</span>
                            <span className="mx-1 text-[10px] text-muted-foreground/50">→</span>
                            <span className="text-[11px] text-foreground/60">{activity.action}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{activity.timestamp}</span>
                        </div>
                      )
                    })}
                  {activities.filter((a) => a.goalId === problem.goalId).length === 0 && (
                    <p className="text-[11px] text-muted-foreground">No activity recorded</p>
                  )}
                </div>
              )}
              </div>
            )
          })}

          {openProblems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <CheckSquare className="size-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-foreground">All clear</p>
              <p className="text-xs text-muted-foreground mt-1">No open problems to handle</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  )
}
