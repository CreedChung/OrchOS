import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppleSwitch } from "@/components/unlumen-ui/apple-switch";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wrench01Icon,
  Add01Icon,
  Delete02Icon,
  SparklesIcon,
  Download01Icon,
  Menu01Icon,
  Globe02Icon,
  Folder01Icon,
  Search01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  InformationCircleIcon,
  FolderGitIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { CreateSkillDialog } from "@/components/dialogs/CreateSkillDialog";
import { api, type SkillMarketItem, type SkillProfile, type SkillMarketResponse } from "@/lib/api";
import { useConversationStore } from "@/lib/stores/conversation";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";

interface SkillsViewProps {
  skills: SkillProfile[];
  projects: Project[];
  onRefresh: () => void;
  scopeFilter?: "all" | "global" | "project";
  onScopeFilterChange?: (filter: "all" | "global" | "project") => void;
  mode?: "mine" | "market";
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
}

export function SkillsView({
  skills: initialSkills,
  projects,
  onRefresh,
  scopeFilter = "all",
  onScopeFilterChange,
  mode = "mine",
  sidebarWidth = 288,
  onSidebarWidthChange,
}: SkillsViewProps) {
  const MARKET_PAGE_SIZE = 30;
  const navigate = useNavigate();
  const [skills, setSkills] = useState<SkillProfile[]>(initialSkills);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null);
  const [installingMarketId, setInstallingMarketId] = useState<string | null>(null);
  const [marketItems, setMarketItems] = useState<SkillMarketItem[]>([]);
  const [marketTags, setMarketTags] = useState<string[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [marketSearch, setMarketSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [marketPage, setMarketPage] = useState(1);
  const [marketPageMeta, setMarketPageMeta] = useState<Pick<SkillMarketResponse, "page" | "pageSize" | "total" | "totalPages">>({
    page: 1,
    pageSize: MARKET_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const createConversation = useConversationStore((state) => state.createConversation);
  const loadMessages = useConversationStore((state) => state.loadMessages);

  useEffect(() => {
    setSkills(initialSkills);
  }, [initialSkills]);

  useEffect(() => {
    if (mode !== "market") return;

    let cancelled = false;
    const loadMarket = async () => {
      setMarketLoading(true);
      setMarketError(null);
      try {
        const apiFilter = marketFilter.startsWith("category:") ? undefined : (marketFilter as "all" | "official" | "installed" | undefined);
        const result = await api.listSkillMarket({
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
        console.error("Failed to load skill market:", err);
        if (!cancelled) {
          setMarketItems([]);
          setMarketTags([]);
          setMarketPageMeta({ page: 1, pageSize: MARKET_PAGE_SIZE, total: 0, totalPages: 1 });
          setMarketError("技能市场加载失败，请确认服务端已启动并且 `/api/skills/market` 可访问。");
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

  const handleCreated = async () => {
    onRefresh();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await api.toggleSkill(id, !enabled);
      onRefresh();
    } catch (err) {
      console.error("Failed to toggle skill:", err);
    }
  };

  const handleDelete = async (id: string) => {
    setSkillToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!skillToDelete) return;
    try {
      await api.deleteSkill(skillToDelete);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete skill:", err);
    } finally {
      setSkillToDelete(null);
    }
  };

  const filteredSkills = useMemo(
    () => (scopeFilter === "all" ? skills : skills.filter((s) => s.scope === scopeFilter)),
    [scopeFilter, skills],
  );

  const scopeFilterButtons = [
    { value: "all" as const, icon: Menu01Icon, iconClassName: "text-muted-foreground/80", label: "All" },
    { value: "global" as const, icon: Globe02Icon, iconClassName: "text-sky-500", label: "Global" },
    { value: "project" as const, icon: Folder01Icon, iconClassName: "text-amber-500", label: "Project" },
  ];

  const activeSkill = filteredSkills.find((skill) => skill.id === activeSkillId) ?? null;

  useEffect(() => {
    if (filteredSkills.length === 0) {
      setActiveSkillId(null);
      return;
    }

    if (!filteredSkills.some((skill) => skill.id === activeSkillId)) {
      setActiveSkillId(filteredSkills[0].id);
    }
  }, [filteredSkills, activeSkillId]);

  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

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

  const skillScopeLabel = (skill: SkillProfile) => {
    if (skill.scope === "global") return "Global";
    if (skill.projectId) return projectNameById.get(skill.projectId) ?? m.project();
    return m.project();
  };

  const sourceTypeLabel = (skill: SkillProfile) =>
    skill.sourceType === "repository" ? "Repository" : "Manual";

  const installedMarketNames = useMemo(() => new Set(skills.map((skill) => skill.name.toLowerCase())), [skills]);

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
      activeClass: string;
      count: number;
    }> = [
      {
        key: "all",
        label: "全部",
        activeClass: "bg-primary/10 text-primary ring-1 ring-primary/20",
        count: marketPageMeta.total,
      },
      {
        key: "official",
        label: "官方",
        activeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20",
        count: marketItems.filter((item) => item.sourceType === "official").length,
      },
      {
        key: "installed",
        label: "已安装",
        activeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20",
        count: marketItems.filter((item) => item.installed || installedMarketNames.has(item.name.toLowerCase())).length,
      },
    ];

    for (const category of marketCategories) {
      groups.push({
        key: `category:${category}`,
        label: category,
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

  const handleInstallMarketSkill = async (item: SkillMarketItem) => {
    if (!item.installable || !item.installSource) {
      toast.info("该条目当前只有索引信息，请先打开原始页面查看详情。", {
        action: item.browseUrl
          ? {
              label: "打开",
              onClick: () => window.open(item.browseUrl, "_blank", "noopener,noreferrer"),
            }
          : undefined,
      });
      return;
    }

    setInstallingMarketId(item.id);
    try {
      const conversation = await createConversation({});
      const instruction = [
        `请安装这个 skill repo：${item.installSource}`,
        `技能名称：${item.name}`,
        item.description ? `说明：${item.description}` : undefined,
        "安装方式：将这个 repo 地址作为技能来源处理，并在安装前检查仓库内容与风险。",
      ]
        .filter(Boolean)
        .join("\n");

      await api.sendConversationMessage(conversation.id, instruction);
      await loadMessages(conversation.id, { force: true });
      await navigate({ to: "/dashboard/creation" });
      toast.success(`已将 ${item.name} 的仓库地址发送给 agent`);
    } catch (err) {
      console.error("Failed to send market skill to agent:", err);
      toast.error(`发送 ${item.name} 给 agent 失败`);
    } finally {
      setInstallingMarketId(null);
    }
  };

  const getMarketSkillBadge = (item: SkillMarketItem) => {
    if (item.installed) {
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
            <div className="mx-auto max-w-6xl p-6">
              <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent p-8 pb-10">
                <div className="absolute -right-8 -top-8 size-40 rounded-full bg-primary/5 blur-2xl" />
                <div className="absolute -bottom-12 left-1/2 size-48 rounded-full bg-primary/4 blur-3xl" />
                <div className="relative flex items-start gap-5">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/10">
                    <HugeiconsIcon icon={SparklesIcon} className="size-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Skills Market</h1>
                    <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      Browse official skills, compare what is available, and install them into your workspace.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-card/80 p-4 backdrop-blur-sm lg:flex-row lg:items-center lg:gap-4">
                  <div className="relative flex-1 lg:max-w-xs">
                    <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                    <input
                      type="text"
                      value={marketSearch}
                      onChange={(e) => setMarketSearch(e.target.value)}
                      placeholder="Search skills in market..."
                      className="h-9 w-full rounded-lg border border-border/60 bg-background/80 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/10"
                    />
                  </div>
                  <div className="h-5 w-px shrink-0 bg-border/60 max-lg:hidden" />
                  <div className="flex flex-wrap gap-1.5">
                    {marketFilterGroups.map((group) => (
                      <button
                        key={group.key}
                        type="button"
                        onClick={() => setMarketFilter(group.key)}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                          marketFilter === group.key
                            ? group.activeClass
                            : "text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {group.label}
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px] tabular-nums text-inherit">
                          {group.count}
                        </span>
                      </button>
                    ))}
                  </div>
                  {marketTags.length > 0 && (
                    <>
                      <div className="h-5 w-px shrink-0 bg-border/60 max-lg:hidden" />
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedTag("all")}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                            selectedTag === "all"
                              ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                              : "text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground",
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
                              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                              selectedTag === tag
                                ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                                : "text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground",
                            )}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {(marketLoading ? [] : displayedMarketItems).map((item) => {
                    const isInstalled = item.installed;
                    const badge = getMarketSkillBadge(item);
                    const isOfficial = item.sourceType === "official";
                    return (
                      <section
                        key={item.id}
                        onClick={() => navigate({ to: "/dashboard/skills/$skillId", params: { skillId: item.id } })}
                        className={cn(
                         "group relative cursor-pointer overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:border-border/80 hover:-translate-y-0.5",
                         isOfficial ? "border-primary/20 hover:border-primary/40" : "border-border/40",
                      )}
                    >
                      {isOfficial && (
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary/30 to-primary/60" />
                      )}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className={cn(
                            "flex size-10 items-center justify-center rounded-xl transition-colors",
                            isOfficial
                              ? "bg-primary/10 group-hover:bg-primary/15"
                              : "bg-muted/60 group-hover:bg-muted/80",
                          )}>
                            <HugeiconsIcon
                              icon={isOfficial ? SparklesIcon : FolderGitIcon}
                              className={cn("size-5", isOfficial ? "text-primary" : "text-muted-foreground")}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            {badge && (
                              <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", badge.className)}>
                                {badge.label}
                              </span>
                            )}
                            {item.browseUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="size-8 p-0"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void navigate({ to: "/dashboard/skills/$skillId", params: { skillId: item.id } });
                                }}
                              >
                                <HugeiconsIcon icon={InformationCircleIcon} className="size-4 text-muted-foreground" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant={isInstalled ? "outline" : "default"}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleInstallMarketSkill(item);
                              }}
                              disabled={!item.installable || installingMarketId === item.id || isInstalled}
                              title={item.installable ? undefined : "该条目目前仅提供索引，暂无可直接安装的仓库地址"}
                              className="shrink-0"
                            >
                              <HugeiconsIcon icon={Download01Icon} className="mr-1.5 size-3.5" />
                              {isInstalled
                                ? "Installed"
                                : !item.installable
                                  ? "Indexed"
                                  : installingMarketId === item.id
                                    ? "Sending..."
                                    : "Install"}
                            </Button>
                          </div>
                        </div>

                        <h2 className="mt-3 text-sm font-semibold text-foreground">{item.name}</h2>
                        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground/80">{item.description}</p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.category && (
                            <span className="rounded-md bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary/80">
                              {item.category}
                            </span>
                          )}
                          {item.tags.map((tag) => (
                            <span key={tag} className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground/70">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3 rounded-md border border-border/40 bg-background/50 px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground/60 truncate">
                          {item.installSource || item.browseUrl || item.source}
                        </div>
                      </div>
                    </section>
                  );
                  })}

                  {marketLoading && (
                    <div className="sm:col-span-2 xl:col-span-3 flex items-center justify-center rounded-xl border border-border/30 bg-card/50 py-20">
                      <div className="flex flex-col items-center gap-3">
                        <Spinner size="lg" className="text-primary" />
                        <p className="text-sm text-muted-foreground">Loading skills...</p>
                      </div>
                    </div>
                  )}

                  {!marketLoading && marketError && (
                    <div className="sm:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
                      <HugeiconsIcon icon={InformationCircleIcon} className="mx-auto mb-3 size-8 text-destructive/50" />
                      <p className="text-sm text-destructive">{marketError}</p>
                    </div>
                  )}

                  {!marketLoading && !marketError && marketPageMeta.total === 0 && (
                    <div className="sm:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-border/40 bg-muted/20 px-6 py-20 text-center">
                      <HugeiconsIcon icon={SparklesIcon} className="mx-auto mb-3 size-10 text-muted-foreground/20" />
                      <p className="text-sm font-medium text-muted-foreground">No skills found</p>
                      <p className="mt-1 text-xs text-muted-foreground/60">Try adjusting your search or filters</p>
                    </div>
                  )}

                  {!marketLoading && !marketError && marketPageMeta.total > 0 && (
                    <div className="sm:col-span-2 xl:col-span-3 flex flex-col gap-3 rounded-xl border border-border/30 bg-card/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Page <span className="font-medium text-foreground">{marketPageMeta.page}</span> of {marketPageMeta.totalPages}
                        <span className="mx-1.5 text-border">·</span>
                        {marketPageMeta.total} skills
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMarketPage((page) => Math.max(1, page - 1))}
                          disabled={marketPageMeta.page === 1}
                          className="gap-1"
                        >
                          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
                          Prev
                        </Button>
                        <div className="flex items-center gap-1">
                          {marketPagination.map((entry) =>
                            typeof entry === "number" ? (
                              <button
                                key={entry}
                                type="button"
                                onClick={() => setMarketPage(entry)}
                                className={cn(
                                  "inline-flex size-8 items-center justify-center rounded-md text-xs font-medium transition-colors",
                                  entry === marketPageMeta.page
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                              >
                                {entry}
                              </button>
                            ) : (
                              <span key={entry} className="px-1 text-xs text-muted-foreground/50">
                                ...
                              </span>
                            ),
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMarketPage((page) => Math.min(marketPageMeta.totalPages, page + 1))}
                          disabled={marketPageMeta.page === marketPageMeta.totalPages}
                          className="gap-1"
                        >
                          Next
                          <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
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
            <h2 className="text-sm font-semibold text-foreground">{m.skills()}</h2>
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
              {filteredSkills.map((skill) => {
                const isActive = skill.id === activeSkillId;

                return (
                  <button
                    key={skill.id}
                    onClick={() => setActiveSkillId(skill.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/80 hover:bg-accent/50",
                      !skill.enabled && "opacity-60",
                    )}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <HugeiconsIcon icon={Wrench01Icon} className="size-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-xs font-medium",
                          isActive && "text-accent-foreground",
                        )}
                      >
                        {skill.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {skillScopeLabel(skill)}
                      </p>
                      {skill.description && (
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/70">
                          {skill.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredSkills.length === 0 && skills.length > 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {scopeFilter === "global" ? m.no_global_skills() : m.no_project_skills()}
                  </p>
                </div>
              )}

              {skills.length === 0 && (
                <div className="py-8 text-center">
                  <HugeiconsIcon
                    icon={Wrench01Icon}
                    className="mx-auto mb-2 size-6 text-muted-foreground/30"
                  />
                  <p className="text-sm text-muted-foreground">{m.no_skills()}</p>
                  <p className="mx-auto mt-1 max-w-44 text-xs text-muted-foreground/60">
                    {m.no_skills_desc()}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => setCreateOpen(true)}
                  >
                    <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
                    Add Skill
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
              aria-label="Resize skills list"
              onPointerDown={handleResizeStart}
              className="absolute top-0 right-[-4px] z-10 h-full w-2 cursor-col-resize rounded-full transition-colors hover:bg-primary/15"
            />
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {activeSkill ? (
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-3xl space-y-6 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <HugeiconsIcon icon={Wrench01Icon} className="size-5 text-primary" />
                      </div>
                      <div>
                        <h1 className="text-xl font-semibold text-foreground">
                          {activeSkill.name}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {sourceTypeLabel(activeSkill)} • {skillScopeLabel(activeSkill)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                      Browse reusable capabilities, inspect how others packaged them, and enable the
                      ones you want to expose in agent configuration.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5">
                      <AppleSwitch
                        checked={activeSkill.enabled}
                        onCheckedChange={() => handleToggle(activeSkill.id, activeSkill.enabled)}
                        size="sm"
                        aria-label={activeSkill.enabled ? m.disable() : m.enable()}
                      />
                      <span className="text-sm text-foreground">
                        {activeSkill.enabled ? m.disable() : m.enable()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(activeSkill.id)}
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
                        Status
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {activeSkill.enabled ? m.active() : "Disabled"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                        Description
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {activeSkill.description || m.no_skills_desc()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                        Install Path
                      </p>
                      <p className="mt-1 break-all font-mono text-sm text-foreground/80">
                        {activeSkill.installPath || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                        Manifest Path
                      </p>
                      <p className="mt-1 break-all font-mono text-sm text-foreground/80">
                        {activeSkill.manifestPath || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                        Source URL
                      </p>
                      <p className="mt-1 break-all font-mono text-sm text-foreground/80">
                        {activeSkill.sourceUrl || "-"}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </ScrollArea>
          ) : null}
        </div>
        </>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete()}
        description={m.delete_skill_confirm()}
        onConfirm={handleDeleteConfirm}
        confirmLabel={m.delete()}
        variant="destructive"
      />

      <CreateSkillDialog
        open={createOpen}
        projects={projects}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

    </>
  );
}
