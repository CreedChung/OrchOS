import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AgentModelTabs, type AgentModelFilter } from "@/components/layout/AgentModelTabs";
import { CapabilityModeTabs } from "@/components/layout/CapabilityModeTabs";
import { InboxSourceTabs, type SourceFilter } from "@/components/layout/InboxSourceTabs";
import { HugeiconsIcon } from "@hugeicons/react";
import {
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
