import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AgentModelTabs, type AgentModelFilter } from "@/components/layout/AgentModelTabs";
import { CapabilityModeTabs } from "@/components/layout/CapabilityModeTabs";
import { InboxSourceTabs, type SourceFilter } from "@/components/layout/InboxSourceTabs";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  PanelRight,
  PanelLeft,
  ArrowReloadHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { m } from "@/paraglide/messages";
import type { SidebarView } from "@/lib/types";
import { isCapabilityView, type CapabilityViewMode } from "@/lib/capability-routing";
export type ScopeFilter = "all" | "global" | "project";

interface ToolbarProps {
  activeView: SidebarView;
  loading?: boolean;
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
  onRefresh?: () => void;
  capabilityViewMode?: CapabilityViewMode;
  onCapabilityViewModeChange?: (mode: CapabilityViewMode) => void;
}

export function Toolbar({
  activeView,
  loading = false,
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
  onRefresh,
  capabilityViewMode = "mine",
  onCapabilityViewModeChange,
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
      {activeView === "inbox" && (
        <InboxSourceTabs value={sourceFilter} counts={inboxCounts} onChange={onSourceFilterChange} />
      )}

      {activeView === "agents" && (
        <AgentModelTabs value={agentModelFilter} counts={agentModelCounts} onChange={onAgentModelFilterChange} />
      )}

      {isCapabilityView(activeView) && onCapabilityViewModeChange ? (
        <CapabilityModeTabs view={activeView} mode={capabilityViewMode} onModeChange={onCapabilityViewModeChange} />
      ) : null}

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button variant="outline" size="icon-sm" onClick={onRefresh} title={m.refresh()}>
            {loading ? (
              <Spinner size="sm" className="size-3.5" />
            ) : (
              <HugeiconsIcon icon={ArrowReloadHorizontalIcon} className="size-3.5" />
            )}
          </Button>
        )}
        <div className="flex w-full max-w-xs items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 sm:px-2.5">
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
