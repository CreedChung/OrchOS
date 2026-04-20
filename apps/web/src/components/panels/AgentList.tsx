import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Robot02Icon, Add01Icon, Edit02Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import type { AgentProfile } from "@/lib/types";

interface AgentListProps {
  agents: AgentProfile[];
  activeAgentId: string | null;
  loading?: boolean;
  onSelectAgent: (id: string) => void;
  onAgentUpdated?: () => void;
  onCreateAgent?: () => void;
  onEditAgent?: (id: string) => void;
  onDeleteAgent?: (id: string) => void;
}

const agentStatusColor: Record<AgentProfile["status"], string> = {
  idle: "bg-muted-foreground",
  active: "bg-emerald-500",
  error: "bg-red-500",
};

export function AgentList({
  agents,
  activeAgentId,
  loading,
  onSelectAgent,
  onAgentUpdated,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
}: AgentListProps) {
  const enabledAgents = agents.filter((a) => a.enabled);
  const disabledAgents = agents.filter((a) => !a.enabled);

  return (
    <div className="flex h-full w-72 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-semibold text-foreground">{m.agents()}</h2>
        {onCreateAgent && (
          <Button variant="ghost" size="icon-sm" onClick={onCreateAgent} title={m.add()}>
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
          </Button>
        )}
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {loading ? (
            <AgentListSkeleton />
          ) : (
            <>
              {enabledAgents.length > 0 && (
                <>
                  {enabledAgents.map((agent) => (
                    <AgentItem
                      key={agent.id}
                      agent={agent}
                      isActive={agent.id === activeAgentId}
                      onClick={() => onSelectAgent(agent.id)}
                      onAvatarUploaded={onAgentUpdated}
                      onEdit={onEditAgent ? () => onEditAgent(agent.id) : undefined}
                      onDelete={onDeleteAgent ? () => onDeleteAgent(agent.id) : undefined}
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
                      onAvatarUploaded={onAgentUpdated}
                      onEdit={onEditAgent ? () => onEditAgent(agent.id) : undefined}
                      onDelete={onDeleteAgent ? () => onDeleteAgent(agent.id) : undefined}
                    />
                  ))}
                </>
              )}

              {agents.length === 0 && (
                <div className="py-8 text-center">
                  <HugeiconsIcon
                    icon={Robot02Icon}
                    className="mx-auto size-6 text-muted-foreground/30 mb-2"
                  />
                  <p className="text-sm text-muted-foreground">{m.no_agents_available()}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 px-4">
                    {m.no_agent_instances_desc()}
                  </p>
                  {onCreateAgent && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={onCreateAgent}>
                      <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
                      Add Agent
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function AgentItem({
  agent,
  isActive,
  onClick,
  onAvatarUploaded,
  onEdit,
  onDelete,
}: {
  agent: AgentProfile;
  isActive: boolean;
  onClick: () => void;
  onAvatarUploaded?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
        isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-accent/50",
        !agent.enabled && "opacity-50",
      )}
    >
      <AvatarUpload
        agentId={agent.id}
        avatarUrl={agent.avatarUrl}
        name={agent.name}
        runtimeId={agent.runtimeId}
        size="sm"
        onUploaded={onAvatarUploaded}
      />
      <button onClick={onClick} className="min-w-0 flex-1 text-left flex items-center gap-2">
        <div className={cn("size-2 rounded-full shrink-0", agentStatusColor[agent.status])} />
        <p className={cn("text-xs font-medium", isActive && "text-accent-foreground")}>
          {agent.name}
        </p>
        <p className="text-[10px] text-muted-foreground/60 shrink-0 ml-auto">{agent.model}</p>
      </button>
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-0.5 shrink-0">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title={m.edit_status()}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
            >
              <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title={m.delete()}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function AgentListSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2">
          <div className="size-8 rounded-full bg-muted animate-pulse" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-3.5 w-24 bg-muted animate-pulse rounded" />
            <div className="h-2.5 w-12 bg-muted animate-pulse rounded" />
            <div className="h-2.5 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
