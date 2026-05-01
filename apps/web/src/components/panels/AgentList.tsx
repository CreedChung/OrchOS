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
  width?: number;
  onWidthChange?: (width: number) => void;
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
  width = 288,
  onWidthChange,
  onSelectAgent,
  onAgentUpdated,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
}: AgentListProps) {
  const enabledAgents = agents.filter((a) => a.enabled);
  const disabledAgents = agents.filter((a) => !a.enabled);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onWidthChange) return;
    event.preventDefault();
    const sidebarEl = event.currentTarget.parentElement;
    const sidebarLeft = sidebarEl?.getBoundingClientRect().left ?? 0;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 200), 288);
      onWidthChange(nextWidth);
    };

    const handlePointerUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div 
      className="relative flex h-full shrink-0 flex-col border-r border-border bg-background"
      style={{ width: Math.min(width, 288), maxWidth: "18rem" }}
    >
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
      {onWidthChange && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize agent list"
          onPointerDown={handleResizeStart}
          className="absolute top-0 right-[-4px] z-10 h-full w-2 cursor-col-resize rounded-full transition-colors hover:bg-primary/15"
        />
      )}
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
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 pr-2.5 text-left transition-colors",
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-accent/50",
        !agent.enabled && "opacity-50",
      )}
    >
      <AvatarUpload
        agentId={agent.id}
        avatarUrl={agent.avatarUrl}
        name={agent.name}
        runtimeId={agent.runtimeId}
        runtime={runtime}
        size="sm"
        onUploaded={onAvatarUploaded}
        disableHover
      />
      <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <div className={cn("size-2 rounded-full shrink-0", agentStatusColor[agent.status])} />
        <p className={cn("truncate text-xs font-medium", isActive && "text-accent-foreground")}>
          {agent.name}
        </p>
      </div>
      <p className="pointer-events-none absolute right-2.5 max-w-[calc(100%-7rem)] truncate text-[10px] text-muted-foreground/60 transition-opacity group-hover:opacity-0">
        {agent.model}
      </p>
      <div className="ml-auto flex items-center gap-0.5 shrink-0">
        <div className="w-0 overflow-hidden opacity-0 transition-all group-hover:w-auto group-hover:opacity-100">
          <div className="flex items-center gap-0.5">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                title={m.edit_status()}
                className="hover:bg-muted"
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
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
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
