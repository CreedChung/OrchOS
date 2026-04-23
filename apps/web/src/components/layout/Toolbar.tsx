import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  PanelRight,
  PanelLeft,
  Menu01Icon,
  GitPullRequestIcon,
  SquareIcon,
  InformationCircleIcon,
  Robot02Icon,
  Globe02Icon,
  Folder01Icon,
  CodeIcon,
  CloudIcon,
  ArrowReloadHorizontalIcon,
  Wrench01Icon,
  PlayCircleIcon,
} from "@hugeicons/core-free-icons";
import { m } from "@/paraglide/messages";
import type { SidebarView, InboxSource } from "@/lib/types";

type SourceFilter = "all" | InboxSource;
export type ScopeFilter = "all" | "global" | "project";
export type AgentModelFilter = "all" | "local" | "cloud";

const scopeFilterConfig: Record<
  Exclude<ScopeFilter, "all">,
  { icon: typeof Globe02Icon; label: string; iconClassName: string }
> = {
  global: { icon: Globe02Icon, label: m.global(), iconClassName: "text-sky-500" },
  project: { icon: Folder01Icon, label: m.project(), iconClassName: "text-amber-500" },
};

const sourceFilterConfig: Record<
  InboxSource,
  { icon: typeof GitPullRequestIcon; label: string; iconClassName: string }
> =
  {
    github_pr: { icon: GitPullRequestIcon, label: m.prs(), iconClassName: "text-violet-500" },
    github_issue: { icon: SquareIcon, label: m.issues(), iconClassName: "text-emerald-500" },
    mention: { icon: InformationCircleIcon, label: m.mentions(), iconClassName: "text-sky-500" },
    agent_request: { icon: Robot02Icon, label: m.agents(), iconClassName: "text-amber-500" },
  };

const agentModelFilterConfig: Record<
  Exclude<AgentModelFilter, "all">,
  { icon: typeof CodeIcon; label: string; iconClassName: string }
> = {
  local: { icon: CodeIcon, label: m.model_local(), iconClassName: "text-emerald-500" },
  cloud: { icon: CloudIcon, label: m.model_cloud(), iconClassName: "text-sky-500" },
};

const allFilterConfig = {
  icon: Menu01Icon,
  label: m.all(),
  iconClassName: "text-muted-foreground/80",
};

const boardFilterConfig = {
  waiting_user: { icon: InformationCircleIcon, iconClassName: "text-violet-500" },
  blocked: { icon: SquareIcon, iconClassName: "text-destructive" },
  in_progress: { icon: PlayCircleIcon, iconClassName: "text-sky-500" },
  completed: { icon: Robot02Icon, iconClassName: "text-emerald-500" },
} as const;

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
  agentModelFilter: AgentModelFilter;
  onAgentModelFilterChange: (filter: AgentModelFilter) => void;
  agentModelCounts: { all: number; local: number; cloud: number };
  boardCounts: {
    waiting_user: number;
    blocked: number;
    in_progress: number;
    completed: number;
  };
  scopeFilter: ScopeFilter;
  onScopeFilterChange: (filter: ScopeFilter) => void;
  scopeCounts: { all: number; global: number; project: number };
  onRefresh?: () => void;
  onOpenCapabilityMarket?: () => void;
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
  agentModelFilter,
  onAgentModelFilterChange,
  agentModelCounts,
  boardCounts,
  scopeFilter,
  onScopeFilterChange,
  scopeCounts,
  onRefresh,
  onOpenCapabilityMarket,
}: ToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(window.navigator.platform));
  }, []);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName;
      return (
        target.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT"
      );
    };

    const focusSearch = () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        focusSearch();
        return;
      }

      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditableTarget(e.target)) {
        e.preventDefault();
        focusSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-11 items-center gap-2 border-b border-border bg-background px-4">
      {/* Inbox: source-based filter tabs */}
      {activeView === "inbox" && (
        <div className="flex items-center gap-1.5">
          {(["all", "github_pr", "github_issue", "mention", "agent_request"] as SourceFilter[]).map(
            (filter) => {
              const config = filter === "all" ? allFilterConfig : sourceFilterConfig[filter];
              return (
                <button
                  key={filter}
                  onClick={() => onSourceFilterChange(filter)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors sm:gap-1.5 sm:px-2.5",
                    sourceFilter === filter
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <HugeiconsIcon icon={config.icon} className={cn("size-3", config.iconClassName)} />
                  <span className="hidden capitalize sm:inline">{config.label || filter}</span>
                  <span className="tabular-nums text-[10px] opacity-60">
                    {inboxCounts[filter as keyof typeof inboxCounts]}
                  </span>
                </button>
              );
            },
          )}
        </div>
      )}

      {/* Agents: model-based filter tabs */}
      {activeView === "agents" && (
        <div className="flex items-center gap-1.5">
          {(["all", "local", "cloud"] as AgentModelFilter[]).map((filter) => {
            const config = filter === "all" ? allFilterConfig : agentModelFilterConfig[filter];
            return (
              <button
                key={filter}
                onClick={() => onAgentModelFilterChange(filter)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors sm:gap-1.5 sm:px-2.5",
                  agentModelFilter === filter
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <HugeiconsIcon icon={config.icon} className={cn("size-3", config.iconClassName)} />
                <span className="hidden sm:inline">{config.label || filter}</span>
                <span className="tabular-nums text-[10px] opacity-60">
                  {agentModelCounts[filter]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {activeView === "projects" && (
        <div className="flex items-center gap-1.5">
          {(
            [
              { key: "waiting_user", label: "Waiting User", icon: InformationCircleIcon },
              { key: "blocked", label: "Blocked", icon: SquareIcon },
              { key: "in_progress", label: "In Progress", icon: PlayCircleIcon },
              { key: "completed", label: "Completed", icon: Robot02Icon },
            ] as const
          ).map((item) => (
            <div
              key={item.key}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground sm:gap-1.5 sm:px-2.5"
            >
              <HugeiconsIcon icon={item.icon} className={cn("size-3", boardFilterConfig[item.key].iconClassName)} />
              <span className="hidden sm:inline">{item.label}</span>
              <span className="tabular-nums text-[10px] opacity-60">{boardCounts[item.key]}</span>
            </div>
          ))}
        </div>
      )}

      {/* MCP Servers / Skills: scope-based filter tabs */}
      {(activeView === "mcp-servers" || activeView === "skills") && (
        <div className="flex items-center gap-1.5">
          {(["all", "global", "project"] as ScopeFilter[]).map((filter) => {
            const config = filter === "all" ? allFilterConfig : scopeFilterConfig[filter];
            return (
              <button
                key={filter}
                onClick={() => onScopeFilterChange(filter)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors sm:gap-1.5 sm:px-2.5",
                  scopeFilter === filter
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <HugeiconsIcon icon={config.icon} className={cn("size-3", config.iconClassName)} />
                <span className="hidden capitalize sm:inline">{config.label || filter}</span>
                <span className="tabular-nums text-[10px] opacity-60">{scopeCounts[filter]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: Refresh + Search + Activity panel toggle */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button variant="outline" size="icon-sm" onClick={onRefresh} title={m.refresh()}>
            <HugeiconsIcon icon={ArrowReloadHorizontalIcon} className="size-3.5" />
          </Button>
        )}
        {activeView === "skills" && onOpenCapabilityMarket && (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onOpenCapabilityMarket}
            title={m.skills()}
          >
            <HugeiconsIcon icon={Wrench01Icon} className="size-3.5" />
          </Button>
        )}
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 sm:px-2.5 w-full max-w-xs">
          <HugeiconsIcon icon={Search01Icon} className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={m.search()}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <span className="hidden shrink-0 text-[10px] text-muted-foreground/70 sm:inline">
            {isMac ? "Cmd+F" : "Ctrl+F"}
          </span>
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
