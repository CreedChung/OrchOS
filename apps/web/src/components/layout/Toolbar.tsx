import { Button } from "@/components/ui/button";
import { type AgentModelFilter } from "@/components/layout/AgentModelTabs";
import { BoardFilterBar } from "@/components/panels/BoardFilterBar";
import type { ConversationBoardFilter } from "@/components/panels/BoardView";
import { CapabilityModeTabs } from "@/components/layout/CapabilityModeTabs";
import {
  InboxSourceTabs,
  type SourceFilter,
} from "@/components/layout/InboxSourceTabs";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, PanelLeft, PanelRight } from "@hugeicons/core-free-icons";
import { m } from "@/paraglide/messages";
import type { SidebarView } from "@/lib/types";
import {
  isCapabilityView,
  type CapabilityViewMode,
} from "@/lib/capability-routing";
export type ScopeFilter = "all" | "global" | "project";
export type { AgentModelFilter };

interface ToolbarProps {
  activeView: SidebarView;
  loading?: boolean;
  activityPanelOpen: boolean;
  onToggleActivityPanel: () => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
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
  capabilityViewMode?: CapabilityViewMode;
  onCapabilityViewModeChange?: (mode: CapabilityViewMode) => void;
  boardFilter?: ConversationBoardFilter;
  onBoardFilterChange?: (filter: ConversationBoardFilter) => void;
  onOpenCreateGoal?: () => void;
  onRefresh?: () => void | Promise<void>;
  children?: React.ReactNode;
}

export function Toolbar({
  activeView,
  activityPanelOpen,
  onToggleActivityPanel,
  sourceFilter,
  onSourceFilterChange,
  inboxCounts,
  agentModelFilter: _agentModelFilter,
  onAgentModelFilterChange: _onAgentModelFilterChange,
  agentModelCounts: _agentModelCounts,
  capabilityViewMode = "mine",
  onCapabilityViewModeChange,
  boardFilter = "all",
  onBoardFilterChange,
  onOpenCreateGoal,
  children,
}: ToolbarProps) {
  return (
    <div className="flex h-11 items-center gap-2 border-b border-border bg-background px-4">
      {activeView === "inbox" && (
        <InboxSourceTabs
          value={sourceFilter}
          counts={inboxCounts}
          onChange={onSourceFilterChange}
        />
      )}

      {activeView === "board" && onBoardFilterChange ? (
        <BoardFilterBar
          boardFilter={boardFilter}
          onBoardFilterChange={onBoardFilterChange}
        />
      ) : null}

      {isCapabilityView(activeView) && onCapabilityViewModeChange ? (
        <CapabilityModeTabs
          view={activeView}
          mode={capabilityViewMode}
          onModeChange={onCapabilityViewModeChange}
        />
      ) : null}

      <div className="flex-1" />

      {children}

      <div className="flex items-center gap-2">
        {activeView === "board" && onOpenCreateGoal ? (
          <Button variant="ghost" size="icon-sm" onClick={onOpenCreateGoal} title={m.add()}>
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
          </Button>
        ) : null}

        <Button
          variant="outline"
          size="icon-sm"
          onClick={onToggleActivityPanel}
          title={
            activityPanelOpen
              ? m.close_activity_panel()
              : m.open_activity_panel()
          }
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
