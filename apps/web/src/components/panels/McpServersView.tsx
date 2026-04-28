import { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FolderGitIcon,
  Add01Icon,
  Cancel01Icon,
  Delete02Icon,
  ToggleLeft,
  ToggleRight,
  Download01Icon,
  SparklesIcon,
  Menu01Icon,
  Globe02Icon,
  Folder01Icon,
  InformationCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Search01Icon,
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
import { McpMarketDetailView } from "@/components/panels/McpMarketDetailView";
import { api, type McpMarketItem, type McpMarketResponse, type McpServerProfile } from "@/lib/api";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";

interface McpServersViewProps {
  servers: McpServerProfile[];
  projects?: Project[];
  onRefresh: () => void;
  scopeFilter?: "all" | "global" | "project";
  onScopeFilterChange?: (filter: "all" | "global" | "project") => void;
  mode?: "mine" | "market";
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
}

export function McpServersView({
  servers: initialServers,
  projects = [],
  onRefresh,
  scopeFilter = "all",
  onScopeFilterChange,
  mode = "mine",
  sidebarWidth = 288,
  onSidebarWidthChange,
}: McpServersViewProps) {
  const MARKET_PAGE_SIZE = 30;
  const [servers, setServers] = useState<McpServerProfile[]>(initialServers);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);
  const [, setLoading] = useState(false);
  const [installingMarketId, setInstallingMarketId] = useState<string | null>(null);
  const [marketItems, setMarketItems] = useState<McpMarketItem[]>([]);
  const [marketTags, setMarketTags] = useState<string[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [selectedMarketItem, setSelectedMarketItem] = useState<McpMarketItem | null>(null);
  const [marketSearch, setMarketSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [marketPage, setMarketPage] = useState(1);
  const [marketPageMeta, setMarketPageMeta] = useState<Pick<McpMarketResponse, "page" | "pageSize" | "total" | "totalPages">>({
    page: 1,
    pageSize: MARKET_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
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
      setMarketError(null);
      try {
        const apiFilter = marketFilter.startsWith("category:") ? undefined : (marketFilter as "all" | "official" | "installed" | undefined);
        const result = await api.listMcpMarket({
          page: marketPage,
          pageSize: MARKET_PAGE_SIZE,
          search: marketSearch.trim() || undefined,
          filter: apiFilter,
          tag: selectedTag,
        });
        if (!cancelled) {
          setMarketItems(result.items);
          setMarketTags(result.tags);
          setMarketPageMeta({
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
          });
        }
      } catch (err) {
        console.error("Failed to load MCP market:", err);
        if (!cancelled) {
          setMarketItems([]);
          setMarketTags([]);
          setMarketPageMeta({ page: 1, pageSize: MARKET_PAGE_SIZE, total: 0, totalPages: 1 });
          setMarketError("MCP 市场加载失败，请确认服务端已启动并且 `/api/mcp-servers/market` 可访问。");
        }
      } finally {
        if (!cancelled) setMarketLoading(false);
      }
    };

    void loadMarket();
    return () => {
      cancelled = true;
    };
  }, [MARKET_PAGE_SIZE, marketFilter, marketPage, marketSearch, mode, selectedTag]);

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

  const scopeFilterButtons = [
    { value: "all" as const, icon: Menu01Icon, iconClassName: "text-muted-foreground/80", label: "All" },
    { value: "global" as const, icon: Globe02Icon, iconClassName: "text-sky-500", label: "Global" },
    { value: "project" as const, icon: Folder01Icon, iconClassName: "text-amber-500", label: "Project" },
  ];

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

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onSidebarWidthChange) return;
    event.preventDefault();
    const sidebarEl = event.currentTarget.parentElement;
    const sidebarLeft = sidebarEl?.getBoundingClientRect().left ?? 0;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 200), 288);
      onSidebarWidthChange(nextWidth);
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

  const installedMarketNames = useMemo(() => new Set(servers.map((server) => server.name.toLowerCase())), [servers]);
  useEffect(() => {
    setMarketPage(1);
  }, [marketSearch, marketFilter, selectedTag]);

  const marketPagination = useMemo(() => {
    const totalPages = marketPageMeta.totalPages;
    const currentPage = marketPageMeta.page;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "ellipsis-right", totalPages] as const;
    }

    if (currentPage >= totalPages - 3) {
      return [1, "ellipsis-left", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
    }

    return [1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages] as const;
  }, [marketPageMeta.page, marketPageMeta.totalPages]);

  const marketCategories = useMemo(() => {
    const categorySet = new Set<string>();
    for (const item of marketItems) {
      if (item.category) categorySet.add(item.category);
    }
    return Array.from(categorySet).sort();
  }, [marketItems]);

  const marketFilterGroups = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      icon: typeof Menu01Icon;
      activeClass: string;
      count: number;
    }> = [
      {
        key: "all",
        label: "全部",
        icon: Menu01Icon,
        activeClass: "bg-primary/10 text-primary ring-1 ring-primary/20",
        count: marketPageMeta.total,
      },
      {
        key: "official",
        label: "官方",
        icon: SparklesIcon,
        activeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20",
        count: marketItems.filter((item) => item.sourceType === "official").length,
      },
      {
        key: "installed",
        label: "已安装",
        icon: Download01Icon,
        activeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20",
        count: marketItems.filter((item) => item.installed || installedMarketNames.has(item.name.toLowerCase())).length,
      },
    ];

    for (const category of marketCategories) {
      groups.push({
        key: `category:${category}`,
        label: category,
        icon: Folder01Icon,
        activeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20",
        count: marketItems.filter((item) => item.category === category).length,
      });
    }

    return groups;
  }, [installedMarketNames, marketItems, marketCategories, marketPageMeta.total]);

  const displayedMarketItems = useMemo(() => {
    if (marketFilter.startsWith("category:")) {
      const category = marketFilter.slice("category:".length);
      return marketItems.filter((item) => item.category === category);
    }
    return marketItems;
  }, [marketFilter, marketItems]);

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
    if (item.installed) {
      return { label: "已安装", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
    }

    if (installedMarketNames.has(item.name.toLowerCase())) {
      return { label: "更新可用", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" };
    }

    return null;
  };

  useEffect(() => {
    setSelectedMarketItem((selected) =>
      selected ? marketItems.find((entry) => entry.id === selected.id) ?? selected : selected,
    );
  }, [marketItems]);

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
                  {selectedMarketItem ? (
                    <div className="mb-4 overflow-hidden rounded-xl border border-border/40 bg-card/70">
                      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                            当前预览
                          </p>
                          <p className="mt-1 truncate text-sm font-medium text-foreground">
                            {selectedMarketItem.name}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setSelectedMarketItem(null)}
                          title={m.dismiss()}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                        </Button>
                      </div>
                      <McpMarketDetailView item={selectedMarketItem} projects={projects} onRefresh={onRefresh} embedded />
                    </div>
                  ) : !marketLoading ? (
                    <div className="mb-4 rounded-xl border border-dashed border-border/50 bg-card/40 px-6 py-8 text-center">
                      <HugeiconsIcon icon={SparklesIcon} className="mx-auto mb-3 size-7 text-muted-foreground/25" />
                      <p className="text-sm font-medium text-foreground/80">选择一个 MCP 查看详情</p>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">
                        点击下方市场卡片后，这里会展示来源、命令和安装目标。
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-4">
                    <div className="relative w-full sm:max-w-sm">
                      <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                      <input
                        type="text"
                        value={marketSearch}
                        onChange={(e) => setMarketSearch(e.target.value)}
                        placeholder="Search MCP servers in market"
                        className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {marketFilterGroups.map((group) => (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => setMarketFilter(group.key)}
                          aria-pressed={marketFilter === group.key}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all",
                            marketFilter === group.key
                              ? group.activeClass
                              : "text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground",
                          )}
                        >
                          <HugeiconsIcon icon={group.icon} className="size-3.5" />
                          {group.label}
                          <span className="rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px] tabular-nums text-inherit">
                            {group.count}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTag("all")}
                        className={cn(
                          "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                          selectedTag === "all"
                            ? "border-border bg-foreground text-background"
                            : "border-border/50 bg-background text-muted-foreground hover:text-foreground",
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
                            "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                            selectedTag === tag
                              ? "border-border bg-foreground text-background"
                              : "border-border/50 bg-background text-muted-foreground hover:text-foreground",
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

                {(marketLoading ? [] : displayedMarketItems).map((item) => {
                  const isInstalled = item.installed;
                  const badge = getMarketMcpBadge(item);
                  return (
                  <section
                    key={item.id}
                    onClick={() => setSelectedMarketItem(item)}
                    className="cursor-pointer rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <HugeiconsIcon icon={SparklesIcon} className="size-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-8 p-0"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedMarketItem(item);
                          }}
                        >
                          <HugeiconsIcon icon={InformationCircleIcon} className="size-4 text-muted-foreground" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleInstallMarketServer(item);
                          }}
                          disabled={installingMarketId === item.id || isInstalled}
                        >
                          <HugeiconsIcon icon={Download01Icon} className="mr-1.5 size-4" />
                          {isInstalled ? "Installed" : installingMarketId === item.id ? "Installing..." : "Install"}
                        </Button>
                      </div>
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
                      {item.category ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                          {item.category}
                        </span>
                      ) : null}
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
                      <div className="break-all">Source: {item.source}</div>
                      <div>Command: {item.command}</div>
                      <div className="mt-1 break-all">Args: {item.args.join(" ")}</div>
                    </div>
                  </section>
                );
                })}

                {!marketLoading && marketError ? (
                  <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-6 py-16 text-center text-sm text-destructive">
                    {marketError}
                  </div>
                ) : null}

                {!marketLoading && !marketError && marketPageMeta.total === 0 ? (
                  <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-border/50 bg-background/60 px-6 py-16 text-center text-sm text-muted-foreground">
                    No MCP servers matched the current market filters.
                  </div>
                ) : null}

                {!marketLoading && !marketError && marketPageMeta.total > 0 ? (
                  <div className="md:col-span-2 xl:col-span-3 flex flex-col gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      第 {marketPageMeta.page} / {marketPageMeta.totalPages} 页，共 {marketPageMeta.total} 条
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMarketPage((page) => Math.max(1, page - 1))}
                          disabled={marketPageMeta.page === 1}
                        >
                          <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-1.5 size-3.5" />
                          上一页
                        </Button>
                      {marketPagination.map((entry) =>
                        typeof entry === "number" ? (
                          <Button
                            key={entry}
                            type="button"
                            variant={entry === marketPageMeta.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMarketPage(entry)}
                          >
                            {entry}
                          </Button>
                        ) : (
                          <span key={entry} className="px-1 text-sm text-muted-foreground">
                            ...
                          </span>
                        ),
                      )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMarketPage((page) => Math.min(marketPageMeta.totalPages, page + 1))}
                          disabled={marketPageMeta.page === marketPageMeta.totalPages}
                        >
                          下一页
                          <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1.5 size-3.5" />
                        </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <>
             <div 
               className="relative flex h-full shrink-0 flex-col border-r border-border bg-background"
               style={{ width: Math.min(sidebarWidth, 288), maxWidth: "18rem" }}
             >
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
          
           {onScopeFilterChange && mode === "mine" && (
            <div className="flex items-center justify-center gap-1 px-2 py-2.5 border-t border-border">
              {scopeFilterButtons.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => onScopeFilterChange(filter.value)}
                  aria-pressed={scopeFilter === filter.value}
                  title={filter.label}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-md transition-colors",
                    scopeFilter === filter.value
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <HugeiconsIcon icon={filter.icon} className={cn("size-3.5", filter.iconClassName)} />
                </button>
              ))}
            </div>
          )}

           {onSidebarWidthChange && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize MCP servers list"
              onPointerDown={handleResizeStart}
              className="absolute top-0 right-[-4px] z-10 h-full w-2 cursor-col-resize rounded-full transition-colors hover:bg-primary/15"
            />
          )}
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
