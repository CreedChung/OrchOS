import { Button } from "#/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, Cancel01Icon, SentIcon, Add01Icon, PanelRight, PanelLeft } from "@hugeicons/core-free-icons"
import type { SidebarView } from "#/lib/types"

interface ToolbarProps {
  activeView: SidebarView
  onNewCommand: () => void
  onCreateGoal: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  activityPanelOpen: boolean
  onToggleActivityPanel: () => void
}

export function Toolbar({ activeView, onNewCommand, onCreateGoal, searchQuery, onSearchChange, activityPanelOpen, onToggleActivityPanel }: ToolbarProps) {
  const showNewGoal = activeView === "goals" || activeView === "inbox"
  const showNewCommand = activeView === "goals" || activeView === "inbox"

  return (
    <div className="flex h-11 items-center gap-2 border-b border-border bg-background px-4">
      {/* Search */}
      <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 max-w-xs">
        <HugeiconsIcon icon={Search01Icon} className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
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

      <div className="flex-1" />

      {/* Actions — shown based on active view */}
      {(showNewGoal || showNewCommand) && (
        <div className="flex items-center gap-1.5">
          {showNewGoal && (
            <Button variant="outline" size="xs" onClick={onCreateGoal}>
              <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
              New Goal
            </Button>
          )}
          {showNewCommand && (
            <Button size="xs" onClick={onNewCommand}>
              <HugeiconsIcon icon={SentIcon} className="size-3.5" />
              Command
            </Button>
          )}
        </div>
      )}

      {/* Activity panel toggle */}
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onToggleActivityPanel}
        title={activityPanelOpen ? "Close activity panel" : "Open activity panel"}
      >
        {activityPanelOpen ? (
          <HugeiconsIcon icon={PanelLeft} className="size-4" />
        ) : (
          <HugeiconsIcon icon={PanelRight} className="size-4" />
        )}
      </Button>
    </div>
  )
}
