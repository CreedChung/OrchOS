import { cn } from "#/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Robot02Icon,
  Add01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "#/components/ui/button"
import { ScrollArea } from "#/components/ui/scroll-area"
import { m } from "#/paraglide/messages"
import type { AgentProfile } from "#/lib/types"

interface AgentListProps {
  agents: AgentProfile[]
  activeAgentId: string | null
  onSelectAgent: (id: string) => void
  onCreateAgent: () => void
}

const agentStatusColor: Record<AgentProfile["status"], string> = {
  idle: "bg-muted-foreground",
  active: "bg-emerald-500",
  error: "bg-red-500",
}

const agentStatusLabel: Record<AgentProfile["status"], string> = {
  idle: m.idle_status(),
  active: m.active(),
  error: m.status_error(),
}

export function AgentList({
  agents,
  activeAgentId,
  onSelectAgent,
  onCreateAgent,
}: AgentListProps) {
  const enabledAgents = agents.filter((a) => a.enabled)
  const disabledAgents = agents.filter((a) => !a.enabled)

  return (
    <div className="flex h-full w-72 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{m.agents()}</h2>
        <Button variant="ghost" size="icon-sm" onClick={onCreateAgent} title={m.create_agent()}>
          <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {enabledAgents.length > 0 && (
            <>
              {enabledAgents.map((agent) => (
                <AgentItem
                  key={agent.id}
                  agent={agent}
                  isActive={agent.id === activeAgentId}
                  onClick={() => onSelectAgent(agent.id)}
                />
              ))}
            </>
          )}

          {disabledAgents.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {m.disabled_agents()}
                </span>
              </div>
              {disabledAgents.map((agent) => (
                <AgentItem
                  key={agent.id}
                  agent={agent}
                  isActive={agent.id === activeAgentId}
                  onClick={() => onSelectAgent(agent.id)}
                />
              ))}
            </>
          )}

          {agents.length === 0 && (
            <div className="py-8 text-center">
              <HugeiconsIcon icon={Robot02Icon} className="mx-auto size-6 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{m.no_agents_available()}</p>
              <p className="text-xs text-muted-foreground/60 mt-1 px-4">{m.no_agent_instances_desc()}</p>
              <Button size="sm" className="mt-3" onClick={onCreateAgent}>
                <HugeiconsIcon icon={Add01Icon} className="size-3 mr-1" />
                {m.create_agent()}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function AgentItem({
  agent,
  isActive,
  onClick,
}: {
  agent: AgentProfile
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-foreground/80 hover:bg-accent/50",
        !agent.enabled && "opacity-50"
      )}
    >
      <div className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
        isActive ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
      )}>
        {agent.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-medium truncate", isActive && "text-accent-foreground")}>
          {agent.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className={cn("size-1.5 rounded-full", agentStatusColor[agent.status])} />
          <span className="text-[10px] text-muted-foreground">{agentStatusLabel[agent.status]}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{agent.model}</p>
      </div>
    </button>
  )
}
