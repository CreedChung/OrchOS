import { useMemo } from "react"
import { cn } from "#/lib/utils"
import { ScrollArea } from "#/components/ui/scroll-area"
import {
  Inbox,
  Target,
  Bot,
  ChevronDown,
  Circle,
  Settings,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  Flame,
  AlertTriangle,
  Info,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu"
import type { Goal, AgentProfile, Organization, Problem, ProblemPriority, SidebarView } from "#/lib/types"
interface SidebarProps {
  goals: Goal[]
  agents: AgentProfile[]
  organizations: Organization[]
  problems: Problem[]
  activeOrganizationId: string | null
  activeView: SidebarView
  activeGoalId: string | null
  activeAgentId: string | null
  searchQuery: string
  onViewChange: (view: SidebarView) => void
  onGoalSelect: (id: string) => void
  onAgentSelect: (id: string) => void
  onOpenSettings: () => void
  onOrganizationChange: (id: string) => void
  onOrganizationRename: (id: string, name: string) => void
  onOrganizationDelete: (id: string) => void
  onGoalRename: (id: string, name: string) => void
  onGoalDelete: (id: string) => void
}

const agentStatusColor: Record<string, string> = {
  active: "text-emerald-500",
  idle: "text-muted-foreground",
  error: "text-red-500",
}

const goalStatusIcon: Record<Goal["status"], string> = {
  active: "●",
  completed: "✓",
  paused: "⏸",
}

const goalStatusColor: Record<Goal["status"], string> = {
  active: "text-emerald-500",
  completed: "text-blue-500",
  paused: "text-amber-500",
}

const priorityIcon: Record<ProblemPriority, React.ElementType> = {
  critical: Flame,
  warning: AlertTriangle,
  info: Info,
}

const priorityColor: Record<ProblemPriority, string> = {
  critical: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
}

const workspaceNav: { id: SidebarView; icon: React.ElementType; label: string }[] = [
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "goals", icon: Target, label: "Goals" },
]

const systemNav: { id: SidebarView; icon: React.ElementType; label: string }[] = [
  { id: "agents", icon: Bot, label: "Agents" },
]

export function Sidebar({
  goals,
  agents,
  organizations,
  problems,
  activeOrganizationId,
  activeView,
  activeGoalId,
  activeAgentId,
  searchQuery,
  onViewChange,
  onGoalSelect,
  onAgentSelect,
  onOpenSettings,
  onOrganizationChange,
  onOrganizationRename,
  onOrganizationDelete,
  onGoalRename,
  onGoalDelete,
}: SidebarProps) {

  const openProblemCount = problems.filter((p) => p.status === "open").length
  const criticalCount = problems.filter((p) => p.status === "open" && p.priority === "critical").length

  const filteredGoals = useMemo(
    () =>
      searchQuery
        ? goals.filter((g) => g.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : goals,
    [goals, searchQuery]
  )

  const filteredAgents = useMemo(
    () =>
      searchQuery
        ? agents.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : agents,
    [agents, searchQuery]
  )

  const filteredProblems = useMemo(
    () =>
      searchQuery
        ? problems.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || (p.context || "").toLowerCase().includes(searchQuery.toLowerCase()))
        : problems,
    [problems, searchQuery]
  )

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-sidebar">
      {/* Organization Selector */}
      <div className="flex h-11 items-center border-b border-border px-4">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Target className="size-3.5" />
            </span>
            <span className="truncate">
              {organizations.find((o) => o.id === activeOrganizationId)?.name || "Select organization"}
            </span>
            <ChevronDown className="ml-auto size-3 shrink-0 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-48">
            {organizations.length > 0 ? (
              organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => onOrganizationChange(org.id)}
                >
                  <span className="flex-1">{org.name}</span>
                  {org.id === activeOrganizationId && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No organizations found
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {activeOrganizationId && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="ml-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
              <DropdownMenuItem
                onClick={() => {
                  const org = organizations.find((o) => o.id === activeOrganizationId)
                  if (!org) return
                  const newName = prompt("Rename organization", org.name)
                  if (newName?.trim()) onOrganizationRename(org.id, newName.trim())
                }}
              >
                <Pencil className="size-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  if (confirm("Delete this organization?")) onOrganizationDelete(activeOrganizationId)
                }}
              >
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Navigation Items */}
      <div className="border-b border-border p-2 space-y-3">
        <div className="space-y-0.5">
          <span className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Workspace</span>
          {workspaceNav.map(({ id, icon: Icon, label }) => {
            const isInbox = id === "inbox"
            const isActive = activeView === id
            return (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {isInbox && openProblemCount > 0 && (
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    criticalCount > 0
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {openProblemCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="space-y-0.5">
          <span className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">System</span>
          {systemNav.map(({ id, icon: Icon, label }) => {
            const isActive = activeView === id
            return (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Context Panel: Changes based on active view */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {activeView === "inbox" && (
            <div className="space-y-0.5">
              {filteredProblems.filter((p) => p.status === "open").map((problem) => {
                const PriorityIcon = priorityIcon[problem.priority]
                return (
                  <button
                    key={problem.id}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  >
                    <PriorityIcon className={cn("size-3.5 shrink-0", priorityColor[problem.priority])} />
                    <span className="flex-1 truncate">{problem.title}</span>
                  </button>
                )
              })}
              {filteredProblems.filter((p) => p.status === "open").length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No open problems</p>
              )}
            </div>
          )}

          {activeView === "goals" && (
            <div className="space-y-0.5">
              {filteredGoals.map((goal) => (
                <div
                  key={goal.id}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    activeGoalId === goal.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <button
                    onClick={() => onGoalSelect(goal.id)}
                    className="flex flex-1 items-center gap-2 min-w-0"
                  >
                    <span className={cn("text-xs shrink-0", goalStatusColor[goal.status])}>
                      {goalStatusIcon[goal.status]}
                    </span>
                    <span className="truncate">{goal.title}</span>
                  </button>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-foreground cursor-pointer">
                      <MoreHorizontal className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-36">
                      <DropdownMenuItem
                        onClick={() => {
                          const newName = prompt("Rename goal", goal.title)
                          if (newName?.trim()) onGoalRename(goal.id, newName.trim())
                        }}
                      >
                        <Pencil className="size-3.5" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Delete this goal?")) onGoalDelete(goal.id)
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {searchQuery && filteredGoals.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No matching goals</p>
              )}
            </div>
          )}

          {activeView === "agents" && (
            <div className="space-y-0.5">
              {filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => onAgentSelect(agent.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    activeAgentId === agent.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Bot className="size-3.5 shrink-0 opacity-60" />
                  <span className="flex-1 truncate text-left">{agent.name}</span>
                  <Circle
                    className={cn("size-2 fill-current", agentStatusColor[agent.status])}
                  />
                </button>
              ))}
              {searchQuery && filteredAgents.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No matching agents</p>
              )}
            </div>
          )}

        </div>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="border-t border-border p-2">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <Settings className="size-3.5 shrink-0 opacity-60" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
