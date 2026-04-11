import { useState, useMemo } from "react"
import { cn } from "#/lib/utils"
import { ScrollArea } from "#/components/ui/scroll-area"
import { Separator } from "#/components/ui/separator"
import {
  Target,
  FolderGit2,
  Bot,
  History,
  ChevronRight,
  ChevronDown,
  Circle,
  Settings,
  Search,
  X,
  Plus,
  Folder,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu"
import type { Goal, AgentProfile, Project, HistoryEntry, Organization } from "#/lib/types"

interface SidebarProps {
  goals: Goal[]
  agents: AgentProfile[]
  projects: Project[]
  history: HistoryEntry[]
  organizations: Organization[]
  activeOrganizationId: string | null
  activeGoalId: string | null
  onGoalSelect: (id: string) => void
  onCreateGoal: () => void
  onOpenSettings: () => void
  onOrganizationChange: (id: string) => void
  onOrganizationRename: (id: string, name: string) => void
  onOrganizationDelete: (id: string) => void
  onGoalRename: (id: string, name: string) => void
  onGoalDelete: (id: string) => void
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  expanded,
  onToggle,
}: {
  icon: React.ElementType
  title: string
  count: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="size-3.5" />
      <span className="flex-1 text-left">{title}</span>
      <span className="text-[10px] tabular-nums">{count}</span>
      {expanded ? (
        <ChevronDown className="size-3" />
      ) : (
        <ChevronRight className="size-3" />
      )}
    </button>
  )
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

export function Sidebar({
  goals,
  agents,
  projects,
  history,
  organizations,
  activeOrganizationId,
  activeGoalId,
  onGoalSelect,
  onCreateGoal,
  onOpenSettings,
  onOrganizationChange,
  onOrganizationRename,
  onOrganizationDelete,
  onGoalRename,
  onGoalDelete,
}: SidebarProps) {
  const [goalsExpanded, setGoalsExpanded] = useState(true)
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [agentsExpanded, setAgentsExpanded] = useState(true)
  const [historyExpanded, setHistoryExpanded] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

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

  const filteredProjects = useMemo(
    () =>
      searchQuery
        ? projects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : projects,
    [projects, searchQuery]
  )

  const filteredHistory = useMemo(
    () =>
      searchQuery
        ? history.filter((h) => {
            const typeMatch = h.type.toLowerCase().includes(searchQuery.toLowerCase())
            const detailStr = JSON.stringify(h.detail).toLowerCase()
            const detailMatch = detailStr.includes(searchQuery.toLowerCase())
            return typeMatch || detailMatch
          })
        : history,
    [history, searchQuery]
  )

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-sidebar">
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

      {/* Search */}
      <div className="border-b border-border px-2 py-2">
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        <button
          onClick={onCreateGoal}
          className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <Plus className="size-3.5 shrink-0 opacity-60" />
          <span>New Goal</span>
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {/* Goals Section */}
          <SectionHeader
            icon={Target}
            title="Goals"
            count={filteredGoals.length}
            expanded={goalsExpanded}
            onToggle={() => setGoalsExpanded(!goalsExpanded)}
          />
          {goalsExpanded && (
            <div className="ml-1 space-y-0.5">
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

          <Separator className="my-1" />

          {/* Projects Section */}
          <SectionHeader
            icon={FolderGit2}
            title="Projects"
            count={filteredProjects.length}
            expanded={projectsExpanded}
            onToggle={() => setProjectsExpanded(!projectsExpanded)}
          />
          {projectsExpanded && (
            <div className="ml-1 space-y-0.5">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70"
                >
                  <Folder className="size-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{project.name}</span>
                </div>
              ))}
              {filteredProjects.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No projects</p>
              )}
            </div>
          )}

          <Separator className="my-1" />

          {/* Agents Section */}
          <SectionHeader
            icon={Bot}
            title="Agents"
            count={filteredAgents.length}
            expanded={agentsExpanded}
            onToggle={() => setAgentsExpanded(!agentsExpanded)}
          />
          {agentsExpanded && (
            <div className="ml-1 space-y-0.5">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70"
                >
                  <Bot className="size-3.5 shrink-0 opacity-60" />
                  <span className="flex-1 truncate">{agent.name}</span>
                  <Circle
                    className={cn("size-2 fill-current", agentStatusColor[agent.status])}
                  />
                </div>
              ))}
              {searchQuery && filteredAgents.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No matching agents</p>
              )}
            </div>
          )}

          <Separator className="my-1" />

          {/* History Section */}
          <SectionHeader
            icon={History}
            title="History"
            count={filteredHistory.length}
            expanded={historyExpanded}
            onToggle={() => setHistoryExpanded(!historyExpanded)}
          />
          {historyExpanded && (
            <div className="ml-1 space-y-0.5">
              {filteredHistory.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/60"
                >
                  <span className="font-medium text-sidebar-foreground/70">{entry.type}</span>
                  <span className="ml-1 truncate">{entry.timestamp.split("T")[1]?.slice(0, 5)}</span>
                </div>
              ))}
              {filteredHistory.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No history</p>
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
