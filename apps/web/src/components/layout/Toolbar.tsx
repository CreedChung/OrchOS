import { cn } from "#/lib/utils";
import { Button } from "#/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  PanelRight,
  PanelLeft,
  GitPullRequestIcon,
  SquareIcon,
  InformationCircleIcon,
  Robot02Icon,
  Clock01Icon,
  CheckmarkCircleIcon,
  CancelCircleIcon,
  Globe02Icon,
  Folder01Icon,
  CodeIcon,
  CloudIcon,
} from "@hugeicons/core-free-icons";
import { m } from "#/paraglide/messages";
import type { SidebarView, InboxSource } from "#/lib/types";

type SourceFilter = "all" | InboxSource;
type GoalStatusFilter = "all" | "active" | "completed" | "paused";
export type ScopeFilter = "all" | "global" | "project";
export type AgentModelFilter = "all" | "local" | "cloud";
export type CreationArchiveFilter = "all" | "active" | "archived";

const scopeFilterConfig: Record<
  Exclude<ScopeFilter, "all">,
  { icon: typeof Globe02Icon; label: string }
> = {
  global: { icon: Globe02Icon, label: m.global() },
  project: { icon: Folder01Icon, label: m.project() },
};

const sourceFilterConfig: Record<InboxSource, { icon: typeof GitPullRequestIcon; label: string }> =
  {
    github_pr: { icon: GitPullRequestIcon, label: m.prs() },
    github_issue: { icon: SquareIcon, label: m.issues() },
    mention: { icon: InformationCircleIcon, label: m.mentions() },
    agent_request: { icon: Robot02Icon, label: m.agents() },
  };

const goalStatusFilterConfig: Record<
  Exclude<GoalStatusFilter, "all">,
  { icon: typeof Clock01Icon; label: string }
> = {
  active: { icon: Clock01Icon, label: m.active() },
  completed: { icon: CheckmarkCircleIcon, label: m.completed() },
  paused: { icon: CancelCircleIcon, label: m.paused() },
};

const agentModelFilterConfig: Record<
  Exclude<AgentModelFilter, "all">,
  { icon: typeof CodeIcon; label: string }
> = {
  local: { icon: CodeIcon, label: m.model_local() },
  cloud: { icon: CloudIcon, label: m.model_cloud() },
};

interface ToolbarProps {
  activeView: SidebarView;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activityPanelOpen: boolean;
  onToggleActivityPanel: () => void;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (filter: SourceFilter) => void;
  inboxCounts: {
    all: number;
    github_pr: number;
    github_issue: number;
    mention: number;
    agent_request: number;
  };
  goalStatusFilter: GoalStatusFilter;
  onGoalStatusFilterChange: (filter: GoalStatusFilter) => void;
  goalCounts: { all: number; active: number; completed: number; paused: number };
  agentModelFilter: AgentModelFilter;
  onAgentModelFilterChange: (filter: AgentModelFilter) => void;
  agentModelCounts: { all: number; local: number; cloud: number };
  scopeFilter: ScopeFilter;
  onScopeFilterChange: (filter: ScopeFilter) => void;
  scopeCounts: { all: number; global: number; project: number };
  creationArchiveFilter: CreationArchiveFilter;
  onCreationArchiveFilterChange: (filter: CreationArchiveFilter) => void;
}

export function Toolbar({
  activeView,
  searchQuery,
  onSearchChange,
  activityPanelOpen,
  onToggleActivityPanel,
  sourceFilter,
  onSourceFilterChange,
  inboxCounts,
  goalStatusFilter,
  onGoalStatusFilterChange,
  goalCounts,
  agentModelFilter,
  onAgentModelFilterChange,
  agentModelCounts,
  scopeFilter,
  onScopeFilterChange,
  scopeCounts,
  creationArchiveFilter,
  onCreationArchiveFilterChange,
}: ToolbarProps) {
  return (
    <div className="flex h-11 items-center gap-2 border-b border-border bg-background px-4">
      {activeView === "creation" && (
        <div className="flex items-center gap-1.5">
          {([
            { value: "all", label: m.all() },
            { value: "active", label: m.creation_active() },
            { value: "archived", label: m.creation_archived() },
          ] as const).map((filter) => (
            <button
              key={filter.value}
              onClick={() => onCreationArchiveFilterChange(filter.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                creationArchiveFilter === filter.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Inbox: source-based filter tabs */}
      {activeView === "inbox" && (
        <div className="flex items-center gap-1.5">
          {(["all", "github_pr", "github_issue", "mention", "agent_request"] as SourceFilter[]).map(
            (filter) => {
              const config = filter === "all" ? null : sourceFilterConfig[filter];
              return (
                <button
                  key={filter}
                  onClick={() => onSourceFilterChange(filter)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    sourceFilter === filter
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  {config && <HugeiconsIcon icon={config.icon} className="size-3" />}
                  <span className="capitalize">
                    {filter === "all" ? m.all() : config?.label || filter}
                  </span>
                  <span className="tabular-nums text-[10px] opacity-60">
                    {inboxCounts[filter as keyof typeof inboxCounts]}
                  </span>
                </button>
              );
            },
          )}
        </div>
      )}

      {/* Goals: status-based filter tabs */}
      {activeView === "goals" && (
        <div className="flex items-center gap-1.5">
          {(["all", "active", "completed", "paused"] as GoalStatusFilter[]).map((filter) => {
            const config = filter === "all" ? null : goalStatusFilterConfig[filter];
            return (
              <button
                key={filter}
                onClick={() => onGoalStatusFilterChange(filter)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  goalStatusFilter === filter
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {config && <HugeiconsIcon icon={config.icon} className="size-3" />}
                <span className="capitalize">
                  {filter === "all" ? m.all() : config?.label || filter}
                </span>
                <span className="tabular-nums text-[10px] opacity-60">{goalCounts[filter]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Agents: model-based filter tabs */}
      {(activeView === "agents" || activeView === "agent-detail") && (
        <div className="flex items-center gap-1.5">
          {(["all", "local", "cloud"] as AgentModelFilter[]).map((filter) => {
            const config = filter === "all" ? null : agentModelFilterConfig[filter];
            return (
              <button
                key={filter}
                onClick={() => onAgentModelFilterChange(filter)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  agentModelFilter === filter
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {config && <HugeiconsIcon icon={config.icon} className="size-3" />}
                <span>{filter === "all" ? m.all() : config?.label || filter}</span>
                <span className="tabular-nums text-[10px] opacity-60">
                  {agentModelCounts[filter]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* MCP Servers / Skills: scope-based filter tabs */}
      {(activeView === "mcp-servers" || activeView === "skills") && (
        <div className="flex items-center gap-1.5">
          {(["all", "global", "project"] as ScopeFilter[]).map((filter) => {
            const config = filter === "all" ? null : scopeFilterConfig[filter];
            return (
              <button
                key={filter}
                onClick={() => onScopeFilterChange(filter)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  scopeFilter === filter
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {config && <HugeiconsIcon icon={config.icon} className="size-3" />}
                <span className="capitalize">
                  {filter === "all" ? m.all() : config?.label || filter}
                </span>
                <span className="tabular-nums text-[10px] opacity-60">{scopeCounts[filter]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: Search + Activity panel toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 w-full max-w-xs">
          <HugeiconsIcon icon={Search01Icon} className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={m.search()}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </button>
          )}
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={onToggleActivityPanel}
          title={activityPanelOpen ? m.close_activity_panel() : m.open_activity_panel()}
        >
          {activityPanelOpen ? (
            <HugeiconsIcon icon={PanelLeft} className="size-4" />
          ) : (
            <HugeiconsIcon icon={PanelRight} className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
