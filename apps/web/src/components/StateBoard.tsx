import { cn } from "#/lib/utils"
import { Badge } from "#/components/ui/badge"
import { StateItem } from "#/components/StateItem"
import { StateEditor } from "#/components/StateEditor"
import { StatusIcon } from "#/components/StatusIcon"
import type { Goal, StateItem as StateItemType, Artifact, Status } from "#/lib/types"
import { FileCode2, GitPullRequest, TestTube2, ScrollText, Pencil } from "lucide-react"

interface StateBoardProps {
  goal: Goal
  states: StateItemType[]
  artifacts: Artifact[]
  onStateAction: (stateId: string, action: string) => void
  onStateStatusChange?: (stateId: string, newStatus: Status) => void
  goalActions?: React.ReactNode
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

export function StateBoard({ goal, states, artifacts, onStateAction, onStateStatusChange, goalActions }: StateBoardProps) {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        {/* Goal Header */}
        <div className="mb-8">
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

        {/* System State Section */}
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="size-1.5 rounded-full bg-primary" />
            System State
          </h2>
          <div className="space-y-1.5">
            {states.map((state) => (
              onStateStatusChange ? (
                <StateEditor
                  key={state.id}
                  state={state}
                  onStatusChange={(newStatus) => onStateStatusChange(state.id, newStatus)}
                />
              ) : (
                <StateItem
                  key={state.id}
                  label={state.label}
                  status={state.status}
                  actions={state.actions}
                  onAction={(action) => onStateAction(state.id, action)}
                />
              )
            ))}
          </div>
        </section>

        {/* Artifacts Section */}
        {artifacts.length > 0 && (
          <section>
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
      </div>
    </main>
  )
}
