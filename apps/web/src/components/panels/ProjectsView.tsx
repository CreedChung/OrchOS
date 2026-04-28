import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Alert01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Folder01Icon,
  FolderIcon,
  Link01Icon,
  PlayCircleIcon,
  PauseIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { DirectoryPickerDialog } from "@/components/ui/directory-picker-dialog";
import { api, type InboxThread } from "@/lib/api";
import { useConversationStore } from "@/lib/stores/conversation";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { Command, Goal, Problem, Project } from "@/lib/types";

interface ProjectsViewProps {
  projects: Project[];
  goals: Goal[];
  problems: Problem[];
  commands: Command[];
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().split("T")[0]} ${date.toISOString().split("T")[1]?.slice(0, 5) ?? ""}`;
}

function buildConversationLookup(threads: InboxThread[]) {
  const byCommandId = new Map<string, string>();
  for (const thread of threads) {
    if (thread.commandId && thread.conversationId && !byCommandId.has(thread.commandId)) {
      byCommandId.set(thread.commandId, thread.conversationId);
    }
  }
  return byCommandId;
}

const goalStatusConfig: Record<string, { icon: typeof PlayCircleIcon; label: string; className: string }> = {
  in_progress: { icon: PlayCircleIcon, label: "In Progress", className: "text-sky-500" },
  paused: { icon: PauseIcon, label: "Paused", className: "text-amber-500" },
  completed: { icon: CheckmarkCircle02Icon, label: "Completed", className: "text-emerald-500" },
  open: { icon: Clock01Icon, label: "Open", className: "text-muted-foreground" },
};

function getGoalStatus(goal: Goal, relatedProblems: Problem[]): string {
  if (goal.status === "completed") return "completed";
  const openProblems = relatedProblems.filter((p) => p.status === "open");
  const waitingUser = openProblems.some((p) => (p.source || "").includes("agent_request"));
  if (waitingUser) return "waiting_user";
  if (goal.status === "paused" || openProblems.length > 0) return "blocked";
  return "in_progress";
}

export function ProjectsView({
  projects,
  goals,
  problems,
  commands,
  sidebarWidth = 288,
  onSidebarWidthChange,
}: ProjectsViewProps) {
  const navigate = useNavigate();
  const {
    conversations,
    loadConversations,
    loadMessages,
    setActiveConversationId,
  } = useConversationStore();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [formData, setFormData] = useState({ name: "", path: "", repositoryUrl: "" });

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    let cancelled = false;
    const loadThreads = async () => {
      try {
        const result = await api.listInboxThreads();
        if (!cancelled) setThreads(result);
      } catch (err) {
        if (!cancelled) console.error("Failed to load board thread mapping:", err);
      }
    };
    void loadThreads();
    return () => { cancelled = true; };
  }, []);

  const commandById = useMemo(() => new Map(commands.map((c) => [c.id, c])), [commands]);
  const conversationByCommandId = useMemo(() => buildConversationLookup(threads), [threads]);

  const goalsByProject = useMemo(() => {
    const grouped = new Map<string, Goal[]>();
    for (const goal of goals) {
      const key = goal.projectId ?? "__unassigned__";
      const list = grouped.get(key) ?? [];
      list.push(goal);
      grouped.set(key, list);
    }
    return grouped;
  }, [goals]);

  const projectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const goal of goals) {
      if (goal.status !== "completed") {
        const key = goal.projectId ?? "__unassigned__";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }, [goals]);

  useEffect(() => {
    if (activeProjectId && !projects.some((project) => project.id === activeProjectId)) {
      setActiveProjectId(null);
    }
  }, [projects, activeProjectId]);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;

  const projectGoals = useMemo(() => {
    if (!activeProjectId) return [];
    return (goalsByProject.get(activeProjectId) ?? []).sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
    );
  }, [activeProjectId, goalsByProject]);

  const openGoal = async (goal: Goal) => {
    const directConversationId = goal.commandId ? conversationByCommandId.get(goal.commandId) : undefined;
    const fallbackConversation = conversations.find((c) => c.projectId === goal.projectId);
    const targetConversationId = directConversationId || fallbackConversation?.id;
    if (targetConversationId) {
      setActiveConversationId(targetConversationId);
      await loadMessages(targetConversationId);
    }
    await navigate({ to: "/dashboard/creation" });
  };

  const handleCreateProject = async () => {
    if (!formData.name.trim() || !formData.path.trim()) return;
    setCreatingProject(true);
    try {
      await api.createProject({
        name: formData.name.trim(),
        path: formData.path.trim(),
        repositoryUrl: formData.repositoryUrl.trim() || undefined,
      });
      setShowCreateDialog(false);
      setFormData({ name: "", path: "", repositoryUrl: "" });
      const nextProjects = await api.listProjects();
      const nextProject = nextProjects.find((p) => p.name === formData.name.trim());
      if (nextProject) setActiveProjectId(nextProject.id);
      window.location.reload();
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreatingProject(false);
    }
  };

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

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        <div
          className="relative flex h-full shrink-0 flex-col border-r border-border bg-background"
          style={{ width: Math.min(sidebarWidth, 288), maxWidth: "18rem" }}
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">{m.project()}</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowCreateDialog(true)}
              title={m.add()}
            >
              <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-0.5 p-2">
              {projects.map((project) => {
                const isActive = project.id === activeProjectId;
                const count = projectCounts.get(project.id) ?? 0;
                return (
                  <button
                    key={project.id}
                    onClick={() => setActiveProjectId(project.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/80 hover:bg-accent/50",
                    )}
                  >
                    <div className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md",
                      isActive ? "bg-primary/10" : "bg-foreground/5",
                    )}>
                      <HugeiconsIcon icon={FolderIcon} className={cn(
                        "size-3.5",
                        isActive ? "text-primary" : "text-foreground/30",
                      )} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "truncate text-xs font-medium",
                        isActive && "text-accent-foreground",
                      )}>
                        {project.name}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {project.path}
                      </p>
                    </div>
                    {count > 0 && (
                      <span className={cn(
                        "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold tabular-nums",
                        isActive ? "bg-primary/10 text-primary/60" : "bg-foreground/5 text-muted-foreground/40",
                      )}>{count}</span>
                    )}
                  </button>
                );
              })}

              {projects.length === 0 && (
                <div className="py-8 text-center">
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    className="mx-auto mb-2 size-6 text-muted-foreground/30"
                  />
                  <p className="text-sm text-muted-foreground">{m.env_no_projects()}</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">{m.no_project()}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
                    {m.add()} {m.project()}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          {onSidebarWidthChange && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize project list"
              onPointerDown={handleResizeStart}
              className="absolute top-0 right-[-4px] z-10 h-full w-2 cursor-col-resize rounded-full transition-colors hover:bg-primary/15"
            />
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {activeProject ? (
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-3xl space-y-6 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <HugeiconsIcon icon={FolderIcon} className="size-5 text-primary" />
                      </div>
                      <div>
                        <h1 className="text-xl font-semibold text-foreground">
                          {activeProject.name}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {projectGoals.length} goals
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setActiveProjectId(null)}
                      title={m.dismiss()}
                      className="mt-3 text-muted-foreground hover:text-foreground"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                    </Button>
                    {activeProject.path && (
                      <p className="mt-3 max-w-2xl break-all font-mono text-xs text-muted-foreground">
                        {activeProject.path}
                      </p>
                    )}
                    {activeProject.repositoryUrl && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <HugeiconsIcon icon={Link01Icon} className="size-3" />
                        <span className="break-all">{activeProject.repositoryUrl}</span>
                      </div>
                    )}
                  </div>
                </div>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Goals</h3>
                  {projectGoals.length > 0 ? (
                    <div className="space-y-2">
                      {projectGoals.map((goal) => {
                        const relatedProblems = problems.filter((p) => p.goalId === goal.id);
                        const status = getGoalStatus(goal, relatedProblems);
                        const statusCfg = goalStatusConfig[status] ?? goalStatusConfig.open;
                        const command = goal.commandId ? commandById.get(goal.commandId) : undefined;

                        return (
                          <button
                            key={goal.id}
                            type="button"
                            onClick={() => void openGoal(goal)}
                            className="group flex w-full items-start gap-3 rounded-lg border border-border/40 bg-card px-4 py-3 text-left transition-all hover:border-border hover:shadow-sm"
                          >
                            <div className={cn(
                              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                              status === "completed" ? "bg-emerald-500/10" : status === "in_progress" ? "bg-sky-500/10" : status === "blocked" ? "bg-red-500/10" : "bg-violet-500/10",
                            )}>
                              <HugeiconsIcon icon={statusCfg.icon} className={cn("size-3", statusCfg.className)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground/90 group-hover:text-foreground">
                                {goal.title}
                              </p>
                              {command?.instruction && (
                                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/70">
                                  {command.instruction}
                                </p>
                              )}
                              {relatedProblems.length > 0 && (
                                <div className="mt-2 flex items-start gap-1.5 rounded-md border border-red-500/10 bg-red-500/5 px-2 py-1.5">
                                  <HugeiconsIcon icon={Alert01Icon} className="mt-px size-3 shrink-0 text-red-500/60" />
                                  <span className="text-[11px] leading-relaxed text-red-600/70 dark:text-red-400/70">
                                    {relatedProblems[0]?.title}
                                  </span>
                                </div>
                              )}
                              <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground/50">
                                <span className="tabular-nums">{formatTime(goal.updatedAt)}</span>
                                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", statusCfg.className, "bg-foreground/5")}>
                                  {statusCfg.label}
                                </span>
                                {goal.watchers.length > 0 && (
                                  <span className="truncate max-w-[80px]">{goal.watchers.join(", ")}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-background/60 px-6 py-12">
                      <HugeiconsIcon icon={Folder01Icon} className="mb-2 size-5 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">{m.no_project()}</p>
                    </div>
                  )}
                </section>
              </div>
            </ScrollArea>
          ) : projects.length > 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="flex max-w-sm flex-col items-center rounded-2xl border border-dashed border-border/50 bg-background/70 px-8 py-10 text-center">
                <HugeiconsIcon icon={Folder01Icon} className="mb-3 size-8 text-muted-foreground/25" />
                <p className="text-sm font-medium text-foreground/80">选择一个项目开始查看</p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  从左侧点击项目后，这里会显示当前项目的目标、活动和上下文信息。
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <HugeiconsIcon icon={Folder01Icon} className="mx-auto mb-2 size-6 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{m.env_no_projects()}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">{m.no_project()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AppDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title={`${m.add()} ${m.project()}`}
        description="Create a local project or connect a repository path."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateProject()} disabled={creatingProject || !formData.name.trim() || !formData.path.trim()}>
              {creatingProject ? "Creating..." : "Create Project"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/80">Project Name</label>
            <Input
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="TermoraX"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/80">Project Path</label>
            <div className="flex gap-2">
              <Input
                value={formData.path}
                onChange={(event) => setFormData((prev) => ({ ...prev, path: event.target.value }))}
                placeholder="/root/Projects/TermoraX"
              />
              <Button type="button" variant="outline" onClick={() => setShowDirectoryPicker(true)}>
                <HugeiconsIcon icon={Folder01Icon} className="size-3.5" />
                Browse
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/80">Repository URL</label>
            <div className="relative">
              <HugeiconsIcon icon={Link01Icon} className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={formData.repositoryUrl}
                onChange={(event) => setFormData((prev) => ({ ...prev, repositoryUrl: event.target.value }))}
                placeholder="https://github.com/owner/repo.git"
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </AppDialog>

      <DirectoryPickerDialog
        open={showDirectoryPicker}
        onOpenChange={setShowDirectoryPicker}
        currentPath={formData.path || undefined}
        onSelect={(path) => setFormData((prev) => ({ ...prev, path }))}
      />
    </>
  );
}
