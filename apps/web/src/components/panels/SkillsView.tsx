import { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wrench01Icon,
  Add01Icon,
  Delete02Icon,
  ToggleLeft,
  ToggleRight,
  SparklesIcon,
  Download01Icon,
  Menu01Icon,
  Globe02Icon,
  Folder01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateSkillDialog } from "@/components/dialogs/CreateSkillDialog";
import { api, type SkillMarketItem, type SkillProfile } from "@/lib/api";
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
  const [skills, setSkills] = useState<SkillProfile[]>(initialSkills);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null);
  const [installingMarketId, setInstallingMarketId] = useState<string | null>(null);
  const [marketItems, setMarketItems] = useState<SkillMarketItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketSearch, setMarketSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<"all" | "official" | "installed">("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");

  useEffect(() => {
    setSkills(initialSkills);
  }, [initialSkills]);

  useEffect(() => {
    if (mode !== "market") return;

    let cancelled = false;
    const loadMarket = async () => {
      setMarketLoading(true);
      try {
        const items = await api.listSkillMarket();
        if (!cancelled) setMarketItems(items);
      } catch (err) {
        console.error("Failed to load skill market:", err);
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

  const installedMarketSources = useMemo(() => new Set(skills.map((skill) => skill.sourceUrl).filter(Boolean)), [skills]);
  const installedMarketNames = useMemo(() => new Set(skills.map((skill) => skill.name.toLowerCase())), [skills]);
  const marketTags = useMemo(
    () => Array.from(new Set(marketItems.flatMap((item) => item.tags))).sort((a, b) => a.localeCompare(b)),
    [marketItems],
  );
  const filteredMarketItems = useMemo(() => {
    const query = marketSearch.trim().toLowerCase();
    return marketItems.filter((item) => {
      const isInstalled = installedMarketSources.has(item.source);
      if (marketFilter === "official" && item.sourceType !== "official") return false;
      if (marketFilter === "installed" && !isInstalled) return false;
      if (selectedTag !== "all" && !item.tags.includes(selectedTag)) return false;
      if (!query) return true;
      return [item.name, item.description, item.source, ...item.tags].some((value) => value.toLowerCase().includes(query));
    });
  }, [installedMarketSources, marketFilter, marketItems, marketSearch, selectedTag]);

  const handleInstallMarketSkill = async (item: SkillMarketItem) => {
    setInstallingMarketId(item.id);
    try {
      const analysis = await api.analyzeSkillRepository({ source: item.source, scope: "global" });
      await api.installSkillRepository({
        analysisId: analysis.analysisId,
        selectedSkills: analysis.installableSkills.map((candidate) => candidate.relativePath),
        allowHighRisk: analysis.riskLevel === "high",
      });
      toast.success(`Installed ${item.name}`);
      onRefresh();
    } catch (err) {
      console.error("Failed to install market skill:", err);
      toast.error(`Failed to install ${item.name}`);
    } finally {
      setInstallingMarketId(null);
    }
  };

  const getMarketSkillBadge = (item: SkillMarketItem) => {
    if (installedMarketSources.has(item.source)) {
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
                  <h1 className="text-xl font-semibold text-foreground">Skills Market</h1>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Browse official skills, compare what is available, and install them into your workspace.
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
                      placeholder="Search skills in market"
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
                  </div>
                </div>

                {(marketLoading ? [] : filteredMarketItems).map((item) => {
                  const isInstalled = installedMarketSources.has(item.source);
                  const badge = getMarketSkillBadge(item);
                  return (
                  <section key={item.id} className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <HugeiconsIcon icon={SparklesIcon} className="size-5 text-primary" />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => void handleInstallMarketSkill(item)}
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
                      Source: {item.source}
                    </div>
                  </section>
                );
                })}

                {!marketLoading && filteredMarketItems.length === 0 ? (
                  <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-border/50 bg-background/60 px-6 py-16 text-center text-sm text-muted-foreground">
                    No skills matched the current market filters.
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(activeSkill.id, activeSkill.enabled)}
                    >
                      <HugeiconsIcon
                        icon={activeSkill.enabled ? ToggleRight : ToggleLeft}
                        className={cn("mr-1.5 size-4", activeSkill.enabled && "text-emerald-500")}
                      />
                      {activeSkill.enabled ? m.disable() : m.enable()}
                    </Button>
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
