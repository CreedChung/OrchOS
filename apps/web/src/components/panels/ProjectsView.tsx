import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Alert01Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
  Folder01Icon,
  FolderIcon,
  InformationCircleIcon,
  Loading03Icon,
  PlayCircleIcon,
  Link01Icon,
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

type BoardColumnId = "waiting_user" | "blocked" | "in_progress" | "completed";

interface ProjectsViewProps {
  projects: Project[];
  goals: Goal[];
  problems: Problem[];
  commands: Command[];
}

interface BoardCard {
  goal: Goal;
  command?: Command;
  problems: Problem[];
  column: BoardColumnId;
}

const boardColumns: Array<{
  id: BoardColumnId;
  label: string;
  icon: typeof PlayCircleIcon;
  tone: string;
  bgAccent: string;
  borderAccent: string;
  dotColor: string;
}> = [
  { id: "waiting_user", label: "Waiting User", icon: InformationCircleIcon, tone: "text-violet-600 dark:text-violet-400", bgAccent: "bg-violet-500/5 dark:bg-violet-500/10", borderAccent: "border-l-violet-500", dotColor: "bg-violet-500" },
  { id: "blocked", label: "Blocked", icon: Alert01Icon, tone: "text-red-500 dark:text-red-400", bgAccent: "bg-red-500/5 dark:bg-red-500/10", borderAccent: "border-l-red-500", dotColor: "bg-red-500" },
  { id: "in_progress", label: "In Progress", icon: PlayCircleIcon, tone: "text-sky-600 dark:text-sky-400", bgAccent: "bg-sky-500/5 dark:bg-sky-500/10", borderAccent: "border-l-sky-500", dotColor: "bg-sky-500" },
  { id: "completed", label: "Completed", icon: CheckmarkCircle02Icon, tone: "text-emerald-600 dark:text-emerald-400", bgAccent: "bg-emerald-500/5 dark:bg-emerald-500/10", borderAccent: "border-l-emerald-500", dotColor: "bg-emerald-500" },
];

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().split("T")[0]} ${date.toISOString().split("T")[1]?.slice(0, 5) ?? ""}`;
}

function resolveBoardColumn(goal: Goal, relatedProblems: Problem[]): BoardColumnId {
  if (goal.status === "completed") return "completed";

  const openProblems = relatedProblems.filter((problem) => problem.status === "open");
  const waitingUser = openProblems.some((problem) => (problem.source || "").includes("agent_request"));
  if (waitingUser) return "waiting_user";

  if (goal.status === "paused" || openProblems.length > 0) return "blocked";

  return "in_progress";
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

export function ProjectsView({ projects, goals, problems, commands }: ProjectsViewProps) {
  const navigate = useNavigate();
  const {
    conversations,
    loadConversations,
    loadMessages,
    setActiveConversationId,
  } = useConversationStore();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | "__all__">("__all__");
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
      setLoadingThreads(true);
      try {
        const result = await api.listInboxThreads();
        if (!cancelled) setThreads(result);
      } catch (err) {
        if (!cancelled) console.error("Failed to load board thread mapping:", err);
      } finally {
        if (!cancelled) setLoadingThreads(false);
      }
    };

    void loadThreads();
    return () => {
      cancelled = true;
    };
  }, []);

  const commandById = useMemo(() => new Map(commands.map((command) => [command.id, command])), [commands]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const conversationByCommandId = useMemo(() => buildConversationLookup(threads), [threads]);

  const boardByProject = useMemo(() => {
    const grouped = new Map<string, { project?: Project; cards: BoardCard[] }>();

    for (const goal of goals) {
      const relatedProblems = problems.filter((problem) => problem.goalId === goal.id);
      const projectKey = goal.projectId ?? "__unassigned__";
      const entry = grouped.get(projectKey) ?? {
        project: goal.projectId ? projectById.get(goal.projectId) : undefined,
        cards: [],
      };

      entry.cards.push({
        goal,
        command: goal.commandId ? commandById.get(goal.commandId) : undefined,
        problems: relatedProblems,
        column: resolveBoardColumn(goal, relatedProblems),
      });
      grouped.set(projectKey, entry);
    }

    return Array.from(grouped.entries())
      .map(([projectId, value]) => ({
        projectId,
        project: value.project,
        cards: value.cards.sort((a, b) => Date.parse(b.goal.updatedAt) - Date.parse(a.goal.updatedAt)),
      }))
      .sort((a, b) => {
        if (a.projectId === "__unassigned__") return 1;
        if (b.projectId === "__unassigned__") return -1;
        return (a.project?.name || "").localeCompare(b.project?.name || "");
      });
  }, [commandById, goals, problems, projectById]);

  const visibleBoardProjects = useMemo(
    () =>
      selectedProjectId === "__all__"
        ? boardByProject
        : boardByProject.filter((entry) => entry.projectId === selectedProjectId),
    [boardByProject, selectedProjectId],
  );

  const projectCounts = useMemo(
    () =>
      new Map(
        boardByProject.map((entry) => [
          entry.projectId,
          entry.cards.filter((card) => card.column === "in_progress" || card.column === "waiting_user" || card.column === "blocked").length,
        ]),
      ),
    [boardByProject],
  );

  const openGoal = async (card: BoardCard) => {
    const directConversationId = card.goal.commandId ? conversationByCommandId.get(card.goal.commandId) : undefined;
    const fallbackConversation = conversations.find((conversation) => conversation.projectId === card.goal.projectId);
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
      const nextProject = nextProjects.find((project) => project.name === formData.name.trim());
      if (nextProject) {
        setSelectedProjectId(nextProject.id);
      }
      window.location.reload();
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-background">
      <div className="flex h-full w-64 flex-col border-r border-border/50 bg-muted/20">
        <div className="flex h-13 items-center justify-between border-b border-border/40 px-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">{m.project()}</h2>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => setShowCreateDialog(true)}
            title={m.add()}
            className="text-muted-foreground/50 hover:text-foreground"
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            <button
              type="button"
              onClick={() => setSelectedProjectId("__all__")}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all",
                selectedProjectId === "__all__"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-foreground/60 hover:bg-accent/40 hover:text-foreground",
              )}
            >
              <div className={cn(
                "flex size-6 items-center justify-center rounded-md",
                selectedProjectId === "__all__" ? "bg-primary/10" : "bg-foreground/5",
              )}>
                <HugeiconsIcon icon={Folder01Icon} className={cn(
                  "size-3",
                  selectedProjectId === "__all__" ? "text-primary/70" : "text-foreground/30",
                )} />
              </div>
              <span className="flex-1 truncate text-xs font-medium">全部项目</span>
              <span className={cn(
                "text-[10px] tabular-nums",
                selectedProjectId === "__all__" ? "text-foreground/50" : "text-muted-foreground/50",
              )}>{goals.length}</span>
            </button>

            {projects.map((project) => {
              const count = projectCounts.get(project.id) || 0;
              const isActive = selectedProjectId === project.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-foreground/60 hover:bg-accent/40 hover:text-foreground",
                  )}
                >
                  <div className={cn(
                    "flex size-6 items-center justify-center rounded-md",
                    isActive ? "bg-primary/10" : "bg-foreground/5",
                  )}>
                    <HugeiconsIcon icon={FolderIcon} className={cn(
                      "size-3",
                      isActive ? "text-primary/70" : "text-foreground/30",
                    )} />
                  </div>
                  <span className="flex-1 truncate text-xs font-medium">{project.name}</span>
                  {count > 0 && (
                    <span className={cn(
                      "inline-flex size-4 items-center justify-center rounded-full text-[9px] font-semibold tabular-nums",
                      isActive ? "bg-primary/10 text-primary/60" : "bg-foreground/5 text-muted-foreground/40",
                    )}>{count}</span>
                  )}
                </button>
              );
            })}

            {projects.length === 0 ? (
              <div className="flex flex-col items-center px-3 py-8">
                <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-foreground/3">
                  <HugeiconsIcon icon={FolderIcon} className="size-4 text-muted-foreground/20" />
                </div>
                <p className="mb-3 text-[11px] text-muted-foreground/40">{m.env_no_projects()}</p>
                <Button size="xs" variant="outline" onClick={() => setShowCreateDialog(true)}>
                  <HugeiconsIcon icon={Add01Icon} className="mr-1 size-3" />
                  {m.add()} {m.project()}
                </Button>
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-8 px-8 py-6">
          {loadingThreads ? (
            <div className="flex justify-end">
              <div className="inline-flex items-center gap-2 rounded-full bg-muted/20 px-3.5 py-1.5 text-[11px] text-muted-foreground/60">
                <HugeiconsIcon icon={Loading03Icon} className="size-3 animate-spin" />
                正在同步线程映射...
              </div>
            </div>
          ) : null}

          {visibleBoardProjects.map(({ projectId, project, cards }) => {
            const cardsByColumn = new Map<BoardColumnId, BoardCard[]>();
            for (const column of boardColumns) cardsByColumn.set(column.id, []);
            for (const card of cards) cardsByColumn.get(card.column)?.push(card);

            return (
              <section key={projectId}>
                {project && (
                  <div className="mb-5 flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/8">
                      <HugeiconsIcon icon={FolderIcon} className="size-3.5 text-primary/70" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
                    <span className="text-xs text-muted-foreground">{cards.length} tasks</span>
                  </div>
                )}
                <div className="grid gap-4 xl:grid-cols-4">
                  {boardColumns.map((column) => {
                    const columnCards = cardsByColumn.get(column.id) || [];

                    return (
                      <div
                        key={column.id}
                        className={cn(
                          "flex flex-col rounded-xl border border-border/40 bg-muted/20",
                          column.bgAccent,
                        )}
                      >
                        <div className="flex items-center gap-2.5 border-b border-border/30 px-4 py-3">
                          <div className={cn("size-1.5 rounded-full", column.dotColor)} />
                          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                            {column.label}
                          </span>
                          <span className={cn(
                            "ml-auto inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                            columnCards.length > 0
                              ? cn(column.tone, "bg-foreground/5")
                              : "text-muted-foreground/50 bg-foreground/3",
                          )}>
                            {columnCards.length}
                          </span>
                        </div>

                        <div className="flex-1 space-y-2.5 p-3">
                          {columnCards.map((card) => (
                            <button
                              key={card.goal.id}
                              type="button"
                              onClick={() => void openGoal(card)}
                              className={cn(
                                "group/card w-full rounded-lg border border-border/30 bg-background/80 px-3.5 py-3 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.03)] transition-all",
                                "hover:border-border hover:bg-background hover:shadow-[0_2px_8px_0_rgba(0,0,0,0.06)]",
                                "border-l-2",
                                column.borderAccent,
                              )}
                            >
                              <div className="mb-1.5 text-sm font-medium leading-snug text-foreground/90 group-hover/card:text-foreground">
                                {card.goal.title}
                              </div>

                              <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                <HugeiconsIcon icon={FolderIcon} className="size-2.5 text-amber-500/70" />
                                {project?.name || m.no_project()}
                              </div>

                              {card.command?.instruction ? (
                                <p className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/70">
                                  {card.command.instruction}
                                </p>
                              ) : null}

                              <div className="flex items-center justify-between gap-2 border-t border-border/20 pt-2 mt-1">
                                <span className="text-[10px] tabular-nums text-muted-foreground/50">
                                  {formatTime(card.goal.updatedAt)}
                                </span>
                                {card.goal.watchers.length > 0 ? (
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                                    <div className="size-1 rounded-full bg-muted-foreground/30" />
                                    <span className="truncate max-w-[80px]">{card.goal.watchers.join(", ")}</span>
                                  </div>
                                ) : null}
                              </div>

                              {card.problems.length > 0 ? (
                                <div className="mt-2 flex items-start gap-1.5 rounded-md border border-red-500/10 bg-red-500/5 px-2 py-1.5">
                                  <HugeiconsIcon icon={Alert01Icon} className="mt-px size-3 shrink-0 text-red-500/60" />
                                  <span className="text-[11px] leading-relaxed text-red-600/70 dark:text-red-400/70">
                                    {card.problems[0]?.title}
                                  </span>
                                </div>
                              ) : null}
                            </button>
                          ))}

                          {columnCards.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/40 bg-background/30 px-3 py-8">
                              <HugeiconsIcon icon={column.icon} className="mb-1.5 size-4 text-muted-foreground/20" />
                              <span className="text-[11px] text-muted-foreground/40">暂无任务</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {visibleBoardProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 px-6 py-20">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted/30">
                <HugeiconsIcon icon={Folder01Icon} className="size-5 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-foreground/50">当前还没有可展示的项目任务</p>
              <p className="mt-1 text-xs text-muted-foreground/40">创建一个项目以开始追踪任务</p>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <AppDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title={`${m.add()} ${m.project()}`}
        description="Create a local project or connect a repository path for board tracking."
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

          <div className="rounded-xl bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground/80">
              <HugeiconsIcon icon={Download01Icon} className="size-3.5 text-sky-500" />
              Project board entry
            </div>
            <p className="mt-2 leading-6">
              创建后该项目会直接出现在左侧列表和全局看板里。后续所有与该项目关联的任务都会自动聚合到这里。
            </p>
          </div>
        </div>
      </AppDialog>

      <DirectoryPickerDialog
        open={showDirectoryPicker}
        onOpenChange={setShowDirectoryPicker}
        currentPath={formData.path || undefined}
        onSelect={(path) => setFormData((prev) => ({ ...prev, path }))}
      />
    </div>
  );
}
