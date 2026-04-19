import { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FolderGitIcon,
  Add01Icon,
  Delete02Icon,
  ToggleLeft,
  ToggleRight,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateMcpServerDialog } from "@/components/dialogs/CreateMcpServerDialog";
import { api, type McpServerProfile } from "@/lib/api";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface McpServersViewProps {
  servers: McpServerProfile[];
  onRefresh: () => void;
  scopeFilter?: "all" | "global" | "project";
}

export function McpServersView({
  servers: initialServers,
  onRefresh,
  scopeFilter = "all",
}: McpServersViewProps) {
  const [servers, setServers] = useState<McpServerProfile[]>(initialServers);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [, setLoading] = useState(false);

  useEffect(() => {
    setServers(initialServers);
  }, [initialServers]);

  const handleCreated = async () => {
    setLoading(false);
    onRefresh();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await api.toggleMcpServer(id, !enabled);
      onRefresh();
    } catch (err) {
      console.error("Failed to toggle MCP server:", err);
    }
  };

  const handleDelete = async (id: string) => {
    setServerToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serverToDelete) return;
    try {
      await api.deleteMcpServer(serverToDelete);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete MCP server:", err);
    } finally {
      setServerToDelete(null);
    }
  };

  const filteredServers = useMemo(
    () => (scopeFilter === "all" ? servers : servers.filter((s) => s.scope === scopeFilter)),
    [scopeFilter, servers],
  );

  const activeServer = filteredServers.find((server) => server.id === activeServerId) ?? null;

  useEffect(() => {
    if (filteredServers.length === 0) {
      setActiveServerId(null);
      return;
    }

    if (!filteredServers.some((server) => server.id === activeServerId)) {
      setActiveServerId(filteredServers[0].id);
    }
  }, [filteredServers, activeServerId]);

  const serverScopeLabel = (server: McpServerProfile) =>
    server.scope === "global" ? "Global" : m.project();

  return (
    <>
    <div className="flex flex-1 overflow-hidden">
      <div className="flex h-full w-72 flex-col border-r border-border bg-background">
        <div className="flex h-14 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{m.mcp_servers()}</h2>
          <Button variant="ghost" size="icon-sm" onClick={() => setCreateOpen(true)} title={m.add()}>
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-0.5 p-2">
            {filteredServers.map((server) => {
              const isActive = server.id === activeServerId;

              return (
                <button
                  key={server.id}
                  onClick={() => setActiveServerId(server.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/80 hover:bg-accent/50",
                    !server.enabled && "opacity-60",
                  )}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <HugeiconsIcon icon={FolderGitIcon} className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-xs font-medium", isActive && "text-accent-foreground")}>
                      {server.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{serverScopeLabel(server)}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
                      {server.command}
                    </p>
                  </div>
                </button>
              );
            })}

            {filteredServers.length === 0 && servers.length > 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {scopeFilter === "global" ? m.no_global_mcp_servers() : m.no_project_mcp_servers()}
                </p>
              </div>
            )}

            {servers.length === 0 && (
              <div className="py-8 text-center">
                <HugeiconsIcon
                  icon={FolderGitIcon}
                  className="mx-auto mb-2 size-6 text-muted-foreground/30"
                />
                <p className="text-sm text-muted-foreground">{m.no_mcp_servers()}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">{m.no_mcp_servers_desc()}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setCreateOpen(true)}
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
                  Add MCP Server
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeServer ? (
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-3xl space-y-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <HugeiconsIcon icon={FolderGitIcon} className="size-5 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold text-foreground">{activeServer.name}</h1>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {serverScopeLabel(activeServer)} • {activeServer.enabled ? m.active() : "Disabled"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(activeServer.id, activeServer.enabled)}
                  >
                    <HugeiconsIcon
                      icon={activeServer.enabled ? ToggleRight : ToggleLeft}
                      className={cn("mr-1.5 size-4", activeServer.enabled && "text-emerald-500")}
                    />
                    {activeServer.enabled ? m.disable() : m.enable()}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(activeServer.id)}>
                    <HugeiconsIcon icon={Delete02Icon} className="mr-1.5 size-4" />
                    {m.delete()}
                  </Button>
                </div>
              </div>

              <section className="rounded-lg border border-border/50 bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">Overview</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                      Command
                    </p>
                    <p className="mt-1 break-all font-mono text-sm text-foreground/80">
                      {activeServer.command}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                      Arguments
                    </p>
                    <p className="mt-1 break-all font-mono text-sm text-foreground/80">
                      {activeServer.args.length > 0 ? activeServer.args.join(" ") : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                      Environment Variables
                    </p>
                    <div className="mt-1 space-y-1">
                      {Object.entries(activeServer.env).length > 0 ? (
                        Object.entries(activeServer.env).map(([key, value]) => (
                          <p key={key} className="break-all font-mono text-sm text-foreground/80">
                            {key}={value}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-foreground/80">-</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{m.no_mcp_servers()}</p>
              <p className="mt-1 text-xs text-muted-foreground/60">{m.no_mcp_servers_desc()}</p>
            </div>
          </div>
        )}
      </div>
    </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete()}
        description={m.delete_mcp_confirm()}
        onConfirm={handleDeleteConfirm}
        confirmLabel={m.delete()}
        variant="destructive"
      />

      <CreateMcpServerDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
