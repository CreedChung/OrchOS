import { cn } from "@/lib/utils";
import { AppleSwitch } from "@/components/unlumen-ui/apple-switch";
import { Badge } from "@/components/ui/badge";
import { StatusIcon } from "@/components/panels/StatusIcon";
import { m } from "@/paraglide/messages";
import type {
  Goal,
  StateItem as StateItemType,
  Artifact,
  ActivityEntry,
  Status,
  Project,
  Command,
  Problem,
} from "@/lib/types";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  FileCodeIcon,
  GitPullRequestIcon,
  TestTube01Icon,
  DocumentCodeIcon,
  Edit02Icon,
  FolderGitIcon,
  Robot02Icon,
  Fire02Icon,
  Alert01Icon,
  CheckmarkCircleIcon,
  CancelCircleIcon,
  Clock01Icon,
  ZapIcon,
  SentIcon,
  EyeIcon,
} from "@hugeicons/core-free-icons";

interface StateBoardProps {
  goal: Goal;
  states: StateItemType[];
  artifacts: Artifact[];
  activities: ActivityEntry[];
  projects: Project[];
  command?: Command;
  problems: { critical: number; warning: number; info: number };
  systemProblems?: Problem[];
  onStateAction: (stateId: string, action: string) => void;
  onProblemAction?: (problemId: string, action: string) => void;
  goalActions?: React.ReactNode;
  onAutoModeToggle?: () => void;
}

const artifactIconMap: Record<Artifact["type"], IconSvgElement> = {
  file: FileCodeIcon,
  pr: GitPullRequestIcon,
  test: TestTube01Icon,
  log: DocumentCodeIcon,
};

const artifactStatusClass: Record<Status, string> = {
  success: "text-emerald-500",
  failed: "text-red-500",
  error: "text-amber-500",
  pending: "text-muted-foreground",
  running: "text-blue-500",
  warning: "text-yellow-500",
};

const goalStatusVariant: Record<
  Goal["status"],
  "outline" | "default" | "secondary" | "destructive"
> = {
  active: "default",
  completed: "outline",
  paused: "secondary",
};

const stateStatusIcon: Record<Status, IconSvgElement> = {
  success: CheckmarkCircleIcon,
  failed: CancelCircleIcon,
  error: CancelCircleIcon,
  pending: Clock01Icon,
  running: ZapIcon,
  warning: Alert01Icon,
};

const stateStatusColor: Record<Status, string> = {
  success: "text-emerald-500",
  failed: "text-red-500",
  error: "text-red-500",
  pending: "text-muted-foreground",
  running: "text-blue-500",
  warning: "text-amber-500",
};

const stateStatusBg: Record<Status, string> = {
  success: "bg-emerald-500/5 border-emerald-500/20",
  failed: "bg-red-500/5 border-red-500/20",
  error: "bg-red-500/5 border-red-500/20",
  pending: "bg-muted/30 border-border/50",
  running: "bg-blue-500/5 border-blue-500/20",
  warning: "bg-amber-500/5 border-amber-500/20",
};

const commandStatusColor: Record<string, string> = {
  sent: "text-blue-500",
  executing: "text-amber-500",
  completed: "text-emerald-500",
  failed: "text-red-500",
};

export function StateBoard({
  goal,
  states,
  artifacts,
  activities,
  projects,
  command,
  problems,
  systemProblems,
  onStateAction,
  onProblemAction,
  goalActions,
  onAutoModeToggle,
}: StateBoardProps) {
  const isAutoMode = goal.status === "active";
  const failedStates = states.filter((s) => s.status === "failed" || s.status === "error");
  const successStates = states.filter((s) => s.status === "success");

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        {/* Goal Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <Badge
              variant={goalStatusVariant[goal.status]}
              className="text-[10px] uppercase tracking-wider"
            >
              {m.goal()}
            </Badge>
            {goalActions}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{goal.title}</h1>
          {goal.description && (
            <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>
          )}

          {/* Command Origin — shows the originating command if this goal was created from one */}
          {command && (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <HugeiconsIcon
                  icon={SentIcon}
                  className={cn(
                    "size-3.5",
                    commandStatusColor[command.status] || "text-muted-foreground",
                  )}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.state_command()}
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase tracking-wider px-1.5 py-0"
                >
                  {command.status}
                </Badge>
              </div>
              <p className="text-sm text-foreground/90">{command.instruction}</p>
              {command.agentNames.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <HugeiconsIcon icon={Robot02Icon} className="size-3 text-muted-foreground" />
                  {command.agentNames.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-foreground/70"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Project */}
          {goal.projectId &&
            (() => {
              const project = projects.find((p) => p.id === goal.projectId);
              if (!project) return null;
              return (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={FolderGitIcon} className="size-3" />
                  <span>{project.name}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="font-mono text-[10px]">{project.path}</span>
                </div>
              );
            })()}

          {/* Watchers */}
          {goal.watchers.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <HugeiconsIcon icon={EyeIcon} className="size-3" />
              {goal.watchers.map((w) => (
                <span
                  key={w}
                  className="inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-foreground/70"
                >
                  {w}
                </span>
              ))}
            </div>
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

        {/* Auto Mode Toggle */}
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <AppleSwitch
            checked={isAutoMode}
            onCheckedChange={() => onAutoModeToggle()}
            size="sm"
            aria-label={m.auto_mode()}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{m.auto_mode()}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  isAutoMode
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {isAutoMode ? m.on() : m.off()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAutoMode ? m.auto_mode_on_desc() : m.auto_mode_off_desc()}
            </p>
          </div>
        </div>

        {/* System Health */}
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="size-1.5 rounded-full bg-primary" />
            {m.system_health()}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div
              className={cn(
                "rounded-lg border p-3",
                problems.critical > 0
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-border/50 bg-card",
              )}
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={Fire02Icon}
                  className={cn(
                    "size-4",
                    problems.critical > 0 ? "text-red-500" : "text-muted-foreground/30",
                  )}
                />
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {problems.critical}
                </span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {m.critical()}
              </span>
            </div>
            <div
              className={cn(
                "rounded-lg border p-3",
                problems.warning > 0
                  ? "border-amber-500/20 bg-amber-500/5"
                  : "border-border/50 bg-card",
              )}
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={Alert01Icon}
                  className={cn(
                    "size-4",
                    problems.warning > 0 ? "text-amber-500" : "text-muted-foreground/30",
                  )}
                />
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {problems.warning}
                </span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {m.warning()}
              </span>
            </div>
            <div
              className={cn(
                "rounded-lg border p-3",
                failedStates.length === 0 && successStates.length > 0
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-border/50 bg-card",
              )}
            >
              <div className="flex items-center gap-2">
                {failedStates.length === 0 && successStates.length > 0 ? (
                  <HugeiconsIcon icon={CheckmarkCircleIcon} className="size-4 text-emerald-500" />
                ) : (
                  <HugeiconsIcon icon={Alert01Icon} className="size-4 text-muted-foreground/30" />
                )}
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {states.length > 0 ? `${successStates.length}/${states.length}` : "—"}
                </span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {m.states_ok()}
              </span>
            </div>
          </div>
        </section>

        {/* System State Section — the core */}
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="size-1.5 rounded-full bg-primary" />
            {m.system_state()}
          </h2>
          <div className="space-y-2">
            {states.map((state) => {
              const StatusIcon = stateStatusIcon[state.status];
              const isFailed = state.status === "failed" || state.status === "error";

              return (
                <div
                  key={state.id}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    stateStatusBg[state.status],
                  )}
                >
                  <div className="flex items-center gap-3">
                    <HugeiconsIcon
                      icon={StatusIcon}
                      className={cn("size-4 shrink-0", stateStatusColor[state.status])}
                    />
                    <span className="text-sm font-medium text-foreground">{state.label}</span>
                    <span
                      className={cn(
                        "ml-auto text-xs font-semibold uppercase tracking-wider",
                        stateStatusColor[state.status],
                      )}
                    >
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
              );
            })}
            {states.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
                <p className="text-sm text-muted-foreground">{m.no_states_yet()}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{m.states_will_appear()}</p>
              </div>
            )}
          </div>
        </section>

        {/* System Problems — internal issues like test_failed, build_error */}
        {systemProblems && systemProblems.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="size-1.5 rounded-full bg-red-500" />
              {m.system_problems()}
            </h2>
            <div className="space-y-2">
              {systemProblems
                .filter((p) => p.status === "open")
                .map((problem) => (
                  <div
                    key={problem.id}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      problem.priority === "critical"
                        ? "bg-red-500/5 border-red-500/20"
                        : problem.priority === "warning"
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-blue-500/5 border-blue-500/10",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon
                        icon={problem.priority === "critical" ? Fire02Icon : Alert01Icon}
                        className={cn(
                          "size-4 shrink-0",
                          problem.priority === "critical"
                            ? "text-red-500"
                            : problem.priority === "warning"
                              ? "text-amber-500"
                              : "text-blue-500",
                        )}
                      />
                      <span className="text-sm font-medium text-foreground">{problem.title}</span>
                      <span className="ml-auto text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {problem.source?.replace(/_/g, " ")}
                      </span>
                    </div>
                    {problem.context && (
                      <p className="mt-1 ml-7 text-xs text-muted-foreground">{problem.context}</p>
                    )}
                    {problem.actions && problem.actions.length > 0 && onProblemAction && (
                      <div className="mt-2 ml-7 flex items-center gap-1.5">
                        {problem.actions.map((action) => (
                          <button
                            key={action}
                            onClick={() => onProblemAction(problem.id, action)}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Artifacts Section */}
        {artifacts.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              {m.artifacts()}
            </h2>
            <div className="space-y-1">
              {artifacts.map((artifact) => {
                const Icon = artifactIconMap[artifact.type];
                return (
                  <div
                    key={artifact.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <HugeiconsIcon icon={Icon} className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 text-sm font-medium text-foreground">
                      {artifact.name}
                    </span>
                    <StatusIcon status={artifact.status} className="ml-auto" />
                    {artifact.detail && (
                      <span className={cn("text-xs", artifactStatusClass[artifact.status])}>
                        {artifact.detail === "modified" && (
                          <HugeiconsIcon icon={Edit02Icon} className="mr-0.5 inline size-3" />
                        )}
                        {artifact.detail}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Activity Log — structured action log, last 5 */}
        {activities.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="size-1.5 rounded-full bg-primary" />
              {m.activity()}
            </h2>
            <div className="space-y-0">
              {activities.slice(0, 5).map((activity, idx) => {
                const isSuccess =
                  activity.detail?.includes("pass") ||
                  activity.detail?.includes("success") ||
                  activity.detail?.includes("created");
                const isFailed =
                  activity.detail?.includes("fail") ||
                  activity.detail?.includes("error") ||
                  activity.detail?.includes("rejected");

                return (
                  <div key={activity.id} className="group flex gap-2.5 py-2">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full",
                          isSuccess ? "bg-emerald-500/10" : isFailed ? "bg-red-500/10" : "bg-muted",
                        )}
                      >
                        <HugeiconsIcon
                          icon={Robot02Icon}
                          className={cn(
                            "size-3",
                            isSuccess
                              ? "text-emerald-500"
                              : isFailed
                                ? "text-red-500"
                                : "text-muted-foreground",
                          )}
                        />
                      </div>
                      {idx < Math.min(activities.length, 5) - 1 && (
                        <div className="mt-1 h-full w-px bg-border" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {activity.agent}
                        </span>
                        <span className="text-xs text-foreground/60">{activity.action}</span>
                        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                          {activity.timestamp}
                        </span>
                      </div>
                      {activity.detail && (
                        <p className="text-[11px] text-muted-foreground">{activity.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
