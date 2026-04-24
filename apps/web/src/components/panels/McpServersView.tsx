import { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FolderGitIcon,
  Add01Icon,
  Delete02Icon,
  ToggleLeft,
  ToggleRight,
  Download01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateMcpServerDialog } from "@/components/dialogs/CreateMcpServerDialog";
import { api, type McpMarketItem, type McpServerProfile } from "@/lib/api";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";

interface McpServersViewProps {
  servers: McpServerProfile[];
  projects?: Project[];
  onRefresh: () => void;
  scopeFilter?: "all" | "global" | "project";
  mode?: "mine" | "market";
}

export function McpServersView({
  servers: initialServers,
  projects = [],
  onRefresh,
  scopeFilter = "all",
  mode = "mine",
}: McpServersViewProps) {
  const [servers, setServers] = useState<McpServerProfile[]>(initialServers);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [, setLoading] = useState(false);
  const [installingMarketId, setInstallingMarketId] = useState<string | null>(null);
  const [marketItems, setMarketItems] = useState<McpMarketItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketSearch, setMarketSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<"all" | "official" | "installed">("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [marketInstallScope, setMarketInstallScope] = useState<"global" | "project">("global");
  const [marketProjectId, setMarketProjectId] = useState<string>(projects[0]?.id ?? "");

  useEffect(() => {
    setServers(initialServers);
  }, [initialServers]);

  useEffect(() => {
    if (mode !== "market") return;

    let cancelled = false;
    const loadMarket = async () => {
      setMarketLoading(true);
      try {
        const items = await api.listMcpMarket();
        if (!cancelled) setMarketItems(items);
      } catch (err) {
        console.error("Failed to load MCP market:", err);
        if (!cancelled) setMarketItems([]);
      } finally {
        if (!cancelled) setMarketLoading(false);
      }
    };

    void loadMarket();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (marketInstallScope === "project" && !marketProjectId && projects[0]?.id) {
      setMarketProjectId(projects[0].id);
    }
  }, [marketInstallScope, marketProjectId, projects]);

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

  const installedMarketServers = useMemo(
    () => new Set(servers.map((server) => `${server.command}::${server.args.join(" ")}`)),
    [servers],
  );
  const installedMarketNames = useMemo(() => new Set(servers.map((server) => server.name.toLowerCase())), [servers]);
  const marketTags = useMemo(
    () => Array.from(new Set(marketItems.flatMap((item) => item.tags))).sort((a, b) => a.localeCompare(b)),
    [marketItems],
  );
  const filteredMarketItems = useMemo(() => {
    const query = marketSearch.trim().toLowerCase();
    return marketItems.filter((item) => {
      const isInstalled = installedMarketServers.has(`${item.command}::${item.args.join(" ")}`);
      if (marketFilter === "official" && item.sourceType !== "official") return false;
      if (marketFilter === "installed" && !isInstalled) return false;
      if (selectedTag !== "all" && !item.tags.includes(selectedTag)) return false;
      if (!query) return true;
      return [item.name, item.description, item.command, ...item.args, ...item.tags].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [installedMarketServers, marketFilter, marketItems, marketSearch, selectedTag]);

  const handleInstallMarketServer = async (item: McpMarketItem) => {
    if (marketInstallScope === "project" && !marketProjectId) {
      toast.error("Please select a project target first");
      return;
    }

    setInstallingMarketId(item.id);
    try {
      await api.createMcpServer({
        name: item.name,
        command: item.command,
        args: item.args,
        env: {},
        scope: marketInstallScope,
        projectId: marketInstallScope === "project" ? marketProjectId : undefined,
      });
      toast.success(`Installed ${item.name}`);
      onRefresh();
    } catch (err) {
      console.error("Failed to install MCP server:", err);
      toast.error(`Failed to install ${item.name}`);
    } finally {
      setInstallingMarketId(null);
    }
  };

  const getMarketMcpBadge = (item: McpMarketItem) => {
    if (installedMarketServers.has(`${item.command}::${item.args.join(" ")}`)) {
      return { label: "已安装", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
    }

    if (installedMarketNames.has(item.name.toLowerCase())) {
      return { label: "更新可用", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" };
    }

    return null;
  };

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        {mode === "market" ? (
          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-6xl space-y-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-foreground">MCP Market</h1>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Browse official MCP servers and install them into your workspace configuration.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="md:col-span-2 xl:col-span-3">
                  <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-4 lg:flex-row lg:items-center">
                    <input
                      type="text"
                      value={marketSearch}
                      onChange={(e) => setMarketSearch(e.target.value)}
                      placeholder="Search MCP servers in market"
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:max-w-xs"
                    />
                    <div className="flex flex-wrap gap-2">
                      {(["all", "official", "installed"] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setMarketFilter(filter)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            marketFilter === filter
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                          )}
                        >
                          {filter === "all" ? "全部" : filter === "official" ? "官方" : "已安装"}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTag("all")}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                          selectedTag === "all"
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                        )}
                      >
                        全部标签
                      </button>
                      {marketTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setSelectedTag(tag)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            selectedTag === tag
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={marketInstallScope} onValueChange={(value) => setMarketInstallScope(value as "global" | "project") }>
                        <SelectTrigger className="h-9 min-w-32 text-sm">
                          <SelectValue>{marketInstallScope === "global" ? "Global" : "Project"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="global">Global</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      {marketInstallScope === "project" ? (
                        <Select value={marketProjectId} onValueChange={(value) => setMarketProjectId(value ?? "") }>
                          <SelectTrigger className="h-9 min-w-40 text-sm" disabled={projects.length === 0}>
                            <SelectValue>
                              {projects.find((project) => project.id === marketProjectId)?.name || "Select project"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      ) : null}
                    </div>
                  </div>
                </div>

                {(marketLoading ? [] : filteredMarketItems).map((item) => {
                  const isInstalled = installedMarketServers.has(`${item.command}::${item.args.join(" ")}`);
                  const badge = getMarketMcpBadge(item);
                  return (
                  <section key={item.id} className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <HugeiconsIcon icon={SparklesIcon} className="size-5 text-primary" />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => void handleInstallMarketServer(item)}
                        disabled={installingMarketId === item.id || isInstalled}
                      >
                        <HugeiconsIcon icon={Download01Icon} className="mr-1.5 size-4" />
                        {isInstalled ? "Installed" : installingMarketId === item.id ? "Installing..." : "Install"}
                      </Button>
                    </div>

                    <h2 className="mt-4 text-base font-semibold text-foreground">{item.name}</h2>
                    {badge ? (
                      <div className="mt-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", badge.className)}>
                          {badge.label}
                        </span>
                      </div>
                    ) : null}
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
                      <div>Command: {item.command}</div>
                      <div className="mt-1 break-all">Args: {item.args.join(" ")}</div>
                    </div>
                  </section>
                );
                })}

                {!marketLoading && filteredMarketItems.length === 0 ? (
                  <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-border/50 bg-background/60 px-6 py-16 text-center text-sm text-muted-foreground">
                    No MCP servers matched the current market filters.
                  </div>
                ) : null}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <>
            <div className="flex h-full w-72 flex-col border-r border-border bg-background">
          <div className="flex h-14 items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">{m.mcp_servers()}</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCreateOpen(true)}
              title={m.add()}
            >
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
                      <p
                        className={cn(
                          "truncate text-xs font-medium",
                          isActive && "text-accent-foreground",
                        )}
                      >
                        {server.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {serverScopeLabel(server)}
                      </p>
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
                    {scopeFilter === "global"
                      ? m.no_global_mcp_servers()
                      : m.no_project_mcp_servers()}
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
                        <h1 className="text-xl font-semibold text-foreground">
                          {activeServer.name}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {serverScopeLabel(activeServer)} •{" "}
                          {activeServer.enabled ? m.active() : "Disabled"}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(activeServer.id)}
                    >
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
          </>
        )}
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
