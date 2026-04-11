import { cn } from "#/lib/utils"
import { Badge } from "#/components/ui/badge"
import { StatusIcon } from "#/components/StatusIcon"
import type { Goal, StateItem as StateItemType, Artifact, ActivityEntry, Status, Project } from "#/lib/types"
import {
  FileCode2,
  GitPullRequest,
  TestTube2,
  ScrollText,
  Pencil,
  FolderGit2,
  Bot,
  Flame,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from "lucide-react"

interface StateBoardProps {
  goal: Goal
  states: StateItemType[]
  artifacts: Artifact[]
  activities: ActivityEntry[]
  projects: Project[]
  problems: { critical: number; warning: number; info: number }
  onStateAction: (stateId: string, action: string) => void
  goalActions?: React.ReactNode
  onAutoModeToggle?: () => void
}

const artifactIconMap: Record<Artifact["type"], React.ElementType> = {
  file: FileCode2,
  pr: GitPullRequest,
  test: TestTube2,
  log: ScrollText,
}

const artifactStatusClass: Record<Status, string> = {
  success: "text-emerald-500",
  failed: "text-red-500",
  error: "text-amber-500",
  pending: "text-muted-foreground",
  running: "text-blue-500",
  warning: "text-yellow-500",
}

const goalStatusVariant: Record<Goal["status"], "outline" | "default" | "secondary" | "destructive"> = {
  active: "default",
  completed: "outline",
  paused: "secondary",
}

const stateStatusIcon: Record<Status, React.ElementType> = {
  success: CheckCircle2,
  failed: XCircle,
  error: XCircle,
  pending: Clock,
  running: Zap,
  warning: AlertTriangle,
}

const stateStatusColor: Record<Status, string> = {
  success: "text-emerald-500",
  failed: "text-red-500",
  error: "text-red-500",
  pending: "text-muted-foreground",
  running: "text-blue-500",
  warning: "text-amber-500",
}

const stateStatusBg: Record<Status, string> = {
  success: "bg-emerald-500/5 border-emerald-500/20",
  failed: "bg-red-500/5 border-red-500/20",
  error: "bg-red-500/5 border-red-500/20",
  pending: "bg-muted/30 border-border/50",
  running: "bg-blue-500/5 border-blue-500/20",
  warning: "bg-amber-500/5 border-amber-500/20",
}

export function StateBoard({ goal, states, artifacts, activities, projects, problems, onStateAction, goalActions, onAutoModeToggle }: StateBoardProps) {
  const isAutoMode = goal.status === "active"
  const failedStates = states.filter((s) => s.status === "failed" || s.status === "error")
  const successStates = states.filter((s) => s.status === "success")

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        {/* Goal Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <Badge variant={goalStatusVariant[goal.status]} className="text-[10px] uppercase tracking-wider">
              Goal
            </Badge>
            {goalActions}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {goal.title}
          </h1>
          {goal.description && (
            <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>
          )}

          {/* Project */}
          {goal.projectId && (() => {
            const project = projects.find((p) => p.id === goal.projectId)
            if (!project) return null
            return (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <FolderGit2 className="size-3" />
                <span>{project.name}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="font-mono text-[10px]">{project.path}</span>
              </div>
            )
          })()}

          {/* Success Criteria */}
          {goal.successCriteria.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {goal.successCriteria.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-accent/30 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  <div className="size-1 rounded-full bg-primary/50" />
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Constraints */}
          {goal.constraints.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {goal.constraints.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-[11px] text-amber-600 dark:text-amber-400"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Auto Mode Toggle */}
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <button
            onClick={onAutoModeToggle}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
              isAutoMode ? "bg-emerald-500" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                isAutoMode ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Auto Mode</span>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                isAutoMode
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}>
                {isAutoMode ? "ON" : "OFF"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAutoMode
                ? "System will auto-fix problems as they arise"
                : "Manual mode — you approve each action"}
            </p>
          </div>
        </div>

        {/* System Health */}
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="size-1.5 rounded-full bg-primary" />
            System Health
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className={cn(
              "rounded-lg border p-3",
              problems.critical > 0 ? "border-red-500/20 bg-red-500/5" : "border-border/50 bg-card"
            )}>
              <div className="flex items-center gap-2">
                <Flame className={cn("size-4", problems.critical > 0 ? "text-red-500" : "text-muted-foreground/30")} />
                <span className="text-2xl font-bold tabular-nums text-foreground">{problems.critical}</span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Critical</span>
            </div>
            <div className={cn(
              "rounded-lg border p-3",
              problems.warning > 0 ? "border-amber-500/20 bg-amber-500/5" : "border-border/50 bg-card"
            )}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn("size-4", problems.warning > 0 ? "text-amber-500" : "text-muted-foreground/30")} />
                <span className="text-2xl font-bold tabular-nums text-foreground">{problems.warning}</span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Warning</span>
            </div>
            <div className={cn(
              "rounded-lg border p-3",
              failedStates.length === 0 && successStates.length > 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/50 bg-card"
            )}>
              <div className="flex items-center gap-2">
                {failedStates.length === 0 && successStates.length > 0 ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="size-4 text-muted-foreground/30" />
                )}
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {states.length > 0 ? `${successStates.length}/${states.length}` : "—"}
                </span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">States OK</span>
            </div>
          </div>
        </section>

        {/* System State Section — the core */}
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="size-1.5 rounded-full bg-primary" />
            System State
          </h2>
          <div className="space-y-2">
            {states.map((state) => {
              const StatusIcon = stateStatusIcon[state.status]
              const isFailed = state.status === "failed" || state.status === "error"

              return (
                <div
                  key={state.id}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    stateStatusBg[state.status]
                  )}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={cn("size-4 shrink-0", stateStatusColor[state.status])} />
                    <span className="text-sm font-medium text-foreground">{state.label}</span>
                    <span className={cn(
                      "ml-auto text-xs font-semibold uppercase tracking-wider",
                      stateStatusColor[state.status]
                    )}>
                      {state.status}
                    </span>
                  </div>

                  {/* Action buttons for failed/error states */}
                  {isFailed && state.actions && state.actions.length > 0 && (
                    <div className="mt-2 ml-7 flex items-center gap-1.5">
                      {state.actions.map((action) => (
                        <button
                          key={action}
                          onClick={() => onStateAction(state.id, action)}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {states.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
                <p className="text-sm text-muted-foreground">No states yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">States will appear as the system runs</p>
              </div>
            )}
          </div>
        </section>

        {/* Artifacts Section */}
        {artifacts.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              Artifacts
            </h2>
            <div className="space-y-1">
              {artifacts.map((artifact) => {
                const Icon = artifactIconMap[artifact.type]
                return (
                  <div
                    key={artifact.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 text-sm font-medium text-foreground">
                      {artifact.name}
                    </span>
                    <StatusIcon status={artifact.status} className="ml-auto" />
                    {artifact.detail && (
                      <span
                        className={cn(
                          "text-xs",
                          artifactStatusClass[artifact.status]
                        )}
                      >
                        {artifact.detail === "modified" && (
                          <Pencil className="mr-0.5 inline size-3" />
                        )}
                        {artifact.detail}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Timeline — lightweight, last 5 entries */}
        {activities.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              Timeline
            </h2>
            <div className="space-y-0">
              {activities.slice(0, 5).map((activity, idx) => {
                const isSuccess = activity.detail?.includes("pass") || activity.detail?.includes("success") || activity.detail?.includes("created")
                const isFailed = activity.detail?.includes("fail") || activity.detail?.includes("error") || activity.detail?.includes("rejected")

                return (
                  <div key={activity.id} className="group flex gap-2.5 py-2">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "flex size-5 items-center justify-center rounded-full",
                        isSuccess ? "bg-emerald-500/10" : isFailed ? "bg-red-500/10" : "bg-muted"
                      )}>
                        <Bot className={cn(
                          "size-3",
                          isSuccess ? "text-emerald-500" : isFailed ? "text-red-500" : "text-muted-foreground"
                        )} />
                      </div>
                      {idx < Math.min(activities.length, 5) - 1 && (
                        <div className="mt-1 h-full w-px bg-border" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-foreground">{activity.agent}</span>
                        <span className="text-xs text-foreground/60">{activity.action}</span>
                        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{activity.timestamp}</span>
                      </div>
                      {activity.detail && (
                        <p className="text-[11px] text-muted-foreground">{activity.detail}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
