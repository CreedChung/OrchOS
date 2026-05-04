import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Alert01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
  Delete02Icon,
  Edit02Icon,
  Folder01Icon,
  FolderIcon,
  GitBranchIcon,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type InboxThread } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard-context";
import { useConversationStore } from "@/lib/stores/conversation";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type {
  Command,
  Goal,
  Problem,
  Project,
  ProjectCommitActivity,
  ProjectGitStatus,
  ProjectPreviewStatus,
} from "@/lib/types";
import { toast } from "sonner";

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

function getHeatmapLevelClass(level: number) {
  if (level >= 4) return "bg-emerald-500";
  if (level === 3) return "bg-emerald-500/75";
  if (level === 2) return "bg-emerald-500/50";
  if (level === 1) return "bg-emerald-500/25";
  return "bg-muted";
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
  const { refreshAll, handleCommand, runtimes } = useDashboard();
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectData, setEditingProjectData] = useState({ name: "", path: "", repositoryUrl: "" });
  const [savingProject, setSavingProject] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deletingProjectPending, setDeletingProjectPending] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<ProjectPreviewStatus | null>(null);
  const [startingPreview, setStartingPreview] = useState(false);
  const [gitStatus, setGitStatus] = useState<ProjectGitStatus | null>(null);
  const [gitStatusLoading, setGitStatusLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const [sendingInstallCommand, setSendingInstallCommand] = useState(false);
  const [commitActivity, setCommitActivity] = useState<ProjectCommitActivity | null>(null);
  const [commitActivityLoading, setCommitActivityLoading] = useState(false);

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
  const editingProject = projects.find((project) => project.id === editingProjectId) ?? null;
  const deletingProjectItem = projects.find((project) => project.id === deletingProjectId) ?? null;

  useEffect(() => {
    let cancelled = false;
    const loadPreviewStatus = async () => {
      if (!activeProjectId) {
        setPreviewStatus(null);
        return;
      }
      try {
        const status = await api.getProjectPreview(activeProjectId);
        if (!cancelled) setPreviewStatus(status);
      } catch {
        if (!cancelled) setPreviewStatus(null);
      }
    };
    void loadPreviewStatus();
    return () => { cancelled = true; };
  }, [activeProjectId]);

  useEffect(() => {
    let cancelled = false;
    const loadGitStatus = async () => {
      if (!activeProjectId) {
        setGitStatus(null);
        setSelectedBranch("");
        return;
      }
      setGitStatusLoading(true);
      try {
        const status = await api.getProjectGitStatus(activeProjectId);
        if (!cancelled) {
          setGitStatus(status);
          setSelectedBranch(status.branch);
        }
      } catch (error) {
        if (!cancelled) {
          setGitStatus({
            projectId: activeProjectId,
            branch: "unknown",
            branches: [],
            modified: [],
            staged: [],
            untracked: [],
            isGitRepo: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (!cancelled) setGitStatusLoading(false);
      }
    };
    void loadGitStatus();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  useEffect(() => {
    let cancelled = false;
    const loadCommitActivity = async () => {
      if (!activeProjectId) {
        setCommitActivity(null);
        return;
      }
      setCommitActivityLoading(true);
      try {
        const activity = await api.getProjectCommitActivity(activeProjectId);
        if (!cancelled) setCommitActivity(activity);
      } catch (error) {
        if (!cancelled) {
          setCommitActivity({
            projectId: activeProjectId,
            totalCommits: 0,
            activeDays: 0,
            maxCommitsPerDay: 0,
            days: [],
            recentCommits: [],
            isGitRepo: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (!cancelled) setCommitActivityLoading(false);
      }
    };
    void loadCommitActivity();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

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
      await refreshAll();
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

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectData({
      name: project.name,
      path: project.path,
      repositoryUrl: project.repositoryUrl ?? "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!editingProjectId || !editingProjectData.name.trim() || !editingProjectData.path.trim()) return;
    setSavingProject(true);
    try {
      await api.updateProject(editingProjectId, {
        name: editingProjectData.name.trim(),
        path: editingProjectData.path.trim(),
        repositoryUrl: editingProjectData.repositoryUrl.trim() || undefined,
      });
      setEditDialogOpen(false);
      await refreshAll();
    } catch (err) {
      console.error("Failed to update project:", err);
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProjectId) return;
    setDeletingProjectPending(true);
    try {
      await api.deleteProject(deletingProjectId);
      if (activeProjectId === deletingProjectId) {
        setActiveProjectId(null);
      }
      toast.success("项目已删除");
      await refreshAll();
    } catch (err) {
      console.error("Failed to delete project:", err);
      toast.error(err instanceof Error ? err.message : "项目删除失败");
    } finally {
      setDeletingProjectPending(false);
    }
  };

  const handleOpenPreview = async () => {
    if (!activeProject) return;

    const previewTab = window.open("about:blank", "_blank", "noopener,noreferrer");
    if (!previewTab) {
      toast.error("浏览器拦截了新标签页，请允许弹窗后重试。");
      return;
    }

    previewTab.document.write("<title>Starting preview...</title><p style=\"font-family: sans-serif; padding: 16px;\">Starting project preview...</p>");
    setStartingPreview(true);

    try {
      const status = await api.startProjectPreview(activeProject.id);
      setPreviewStatus(status);
      if (!status.running || !status.url) {
        previewTab.close();
        toast.error(status.error || "项目预览启动失败");
        return;
      }
      previewTab.location.href = status.url;
      toast.success("项目预览已启动");
    } catch (error) {
      previewTab.close();
      toast.error(error instanceof Error ? error.message : "项目预览启动失败");
    } finally {
      setStartingPreview(false);
    }
  };

  const handleSwitchBranch = async (branch: string) => {
    if (!activeProjectId || !branch || branch === gitStatus?.branch) return;
    setSelectedBranch(branch);
    setSwitchingBranch(true);
    try {
      const result = await api.switchProjectBranch(activeProjectId, branch);
      if (!result.success) {
        throw new Error(result.error || "Failed to switch branch");
      }
      toast.success(`已切换到 ${branch}`);
      const [nextGitStatus, nextCommitActivity] = await Promise.all([
        api.getProjectGitStatus(activeProjectId),
        api.getProjectCommitActivity(activeProjectId),
      ]);
      setGitStatus(nextGitStatus);
      setSelectedBranch(nextGitStatus.branch);
      setCommitActivity(nextCommitActivity);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "分支切换失败");
      setSelectedBranch(gitStatus?.branch ?? "");
    } finally {
      setSwitchingBranch(false);
    }
  };

  const handleInstallDependencies = async () => {
    if (!activeProjectId) return;
    setSendingInstallCommand(true);
    try {
      const enabledRuntimeNames = runtimes.filter((runtime) => runtime.enabled).map((runtime) => runtime.name);
      await handleCommand({
        instruction: "Install this project's dependencies using the appropriate package manager lockfile, verify install completes successfully, and report any issues blocking local development.",
        agentNames: enabledRuntimeNames,
        projectIds: [activeProjectId],
      });
      toast.success("已发送依赖安装任务给 agent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "发送依赖安装任务失败");
    } finally {
      setSendingInstallCommand(false);
    }
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
                  <div
                    key={project.id}
                    onClick={() => setActiveProjectId(project.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveProjectId(project.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group relative flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
                    <div className="min-w-0 flex-1 pr-14">
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
                        "absolute top-2 right-2 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[9px] font-semibold tabular-nums transition-opacity group-hover:opacity-0",
                        isActive ? "bg-primary/10 text-primary/70" : "bg-foreground/5 text-muted-foreground/50",
                      )}>
                        {count}
                      </span>
                    )}
                    <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditProject(project);
                        }}
                        title={m.edit()}
                        className="hover:bg-muted"
                      >
                        <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeletingProjectId(project.id);
                          setDeleteConfirmOpen(true);
                        }}
                        title={m.delete()}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                      </Button>
                    </div>
                  </div>
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
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" onClick={() => void handleInstallDependencies()} disabled={sendingInstallCommand}>
                        {sendingInstallCommand ? <Spinner size="sm" className="text-current" /> : <HugeiconsIcon icon={Download01Icon} className="mr-1.5 size-4" />}
                        {sendingInstallCommand ? "Sending to Agent..." : "Ask Agent to Install Dependencies"}
                      </Button>
                      <Button type="button" onClick={() => void handleOpenPreview()} disabled={startingPreview}>
                        <HugeiconsIcon icon={PlayCircleIcon} className="mr-1.5 size-4" />
                        {startingPreview ? "Starting..." : previewStatus?.running ? "Open Preview" : "Start Preview"}
                      </Button>
                      {previewStatus?.running && previewStatus.url && (
                        <a
                          href={previewStatus.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline-offset-4 hover:underline"
                        >
                          {previewStatus.url}
                        </a>
                      )}
                    </div>
                    {(previewStatus?.error || previewStatus?.command) && (
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {previewStatus.command && <p>Command: <span className="font-mono">{previewStatus.command}</span></p>}
                        {previewStatus.error && <p className="text-red-500">{previewStatus.error}</p>}
                      </div>
                    )}

                    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                      <section className="rounded-xl border border-border/40 bg-card/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Git Branch</h3>
                            <p className="mt-1 text-xs text-muted-foreground">切换项目分支，并查看当前工作区改动。</p>
                          </div>
                          {gitStatusLoading && <Spinner size="sm" className="text-muted-foreground" />}
                        </div>
                        {gitStatus?.isGitRepo ? (
                          <>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <div className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-background px-3 py-2 text-xs text-foreground/80">
                                <HugeiconsIcon icon={GitBranchIcon} className="size-3.5 text-primary" />
                                <span className="font-medium">{gitStatus.branch}</span>
                              </div>
                              <Select value={selectedBranch} onValueChange={(value) => void handleSwitchBranch(value)}>
                                <SelectTrigger size="sm" className="min-w-52">
                                  <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                  {gitStatus.branches.map((branch) => (
                                    <SelectItem key={branch.name} value={branch.name}>
                                      {branch.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {switchingBranch && <Spinner size="sm" className="text-muted-foreground" />}
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                              <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2 text-xs">
                                <p className="text-muted-foreground">Staged</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">{gitStatus.staged.length}</p>
                              </div>
                              <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2 text-xs">
                                <p className="text-muted-foreground">Modified</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">{gitStatus.modified.length}</p>
                              </div>
                              <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2 text-xs">
                                <p className="text-muted-foreground">Untracked</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">{gitStatus.untracked.length}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="mt-4 rounded-lg border border-dashed border-border/40 bg-background/50 px-4 py-4 text-sm text-muted-foreground">
                            {gitStatus?.error || "This project is not a Git repository yet."}
                          </div>
                        )}
                      </section>

                      <section className="rounded-xl border border-border/40 bg-card/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Commit Activity</h3>
                            <p className="mt-1 text-xs text-muted-foreground">最近 12 周提交热力图和最近提交记录。</p>
                          </div>
                          {commitActivityLoading && <Spinner size="sm" className="text-muted-foreground" />}
                        </div>
                        {commitActivity?.isGitRepo ? (
                          <>
                            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span>{commitActivity.totalCommits} commits</span>
                              <span>{commitActivity.activeDays} active days</span>
                              <span>max/day {commitActivity.maxCommitsPerDay}</span>
                            </div>
                            <div className="mt-4 grid grid-cols-7 gap-1 sm:grid-cols-12">
                              {commitActivity.days.map((day) => (
                                <div
                                  key={day.date}
                                  title={`${day.date}: ${day.count} commits`}
                                  className={cn("h-4 rounded-sm", getHeatmapLevelClass(day.level))}
                                />
                              ))}
                            </div>
                            <div className="mt-4 space-y-2">
                              {commitActivity.recentCommits.map((commit) => (
                                <div key={`${commit.hash}-${commit.date}`} className="rounded-lg border border-border/30 bg-background/60 px-3 py-2">
                                  <div className="flex items-center justify-between gap-3 text-xs">
                                    <span className="font-mono text-primary">{commit.hash}</span>
                                    <span className="text-muted-foreground">{commit.date}</span>
                                  </div>
                                  <p className="mt-1 text-sm text-foreground">{commit.message}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{commit.author}</p>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="mt-4 rounded-lg border border-dashed border-border/40 bg-background/50 px-4 py-4 text-sm text-muted-foreground">
                            {commitActivity?.error || "No commit activity available."}
                          </div>
                        )}
                      </section>
                    </div>

                    <section className="mt-4 rounded-xl border border-border/40 bg-card/60 p-4">
                      <h3 className="text-sm font-semibold text-foreground">Dependency Setup</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        依赖安装不会在当前页面本地直接执行，而是作为项目任务发送给 agent，由 agent 在这个项目上下文里处理。
                      </p>
                    </section>
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
            <div className="relative">
              <Input
                value={formData.path}
                onChange={(event) => setFormData((prev) => ({ ...prev, path: event.target.value }))}
                placeholder="/root/Projects/TermoraX"
                className="pr-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDirectoryPicker(true)}
                className="absolute right-1 top-1 h-8"
              >
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

      <AppDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title={editingProject ? `${m.edit()} ${editingProject.name}` : `${m.edit()} ${m.project()}`}
        description="Update the project name, local path, or repository URL."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {m.cancel()}
            </Button>
            <Button onClick={() => void handleSaveProject()} disabled={savingProject || !editingProjectData.name.trim() || !editingProjectData.path.trim()}>
              {savingProject ? "Saving..." : m.save()}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/80">Project Name</label>
            <Input
              value={editingProjectData.name}
              onChange={(event) => setEditingProjectData((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="TermoraX"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/80">Project Path</label>
            <div className="relative">
              <Input
                value={editingProjectData.path}
                onChange={(event) => setEditingProjectData((prev) => ({ ...prev, path: event.target.value }))}
                placeholder="/root/Projects/TermoraX"
                className="pr-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDirectoryPicker(true)}
                className="absolute right-1 top-1 h-8"
              >
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
                value={editingProjectData.repositoryUrl}
                onChange={(event) => setEditingProjectData((prev) => ({ ...prev, repositoryUrl: event.target.value }))}
                placeholder="https://github.com/owner/repo.git"
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </AppDialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete()}
        description={deletingProjectItem ? `Delete project "${deletingProjectItem.name}"? This action cannot be undone.` : "Delete this project? This action cannot be undone."}
        onConfirm={() => void handleDeleteProject()}
        confirmLabel={deletingProjectPending ? "Deleting..." : m.delete()}
        cancelLabel={m.cancel()}
        variant="destructive"
      />

      <DirectoryPickerDialog
        open={showDirectoryPicker}
        onOpenChange={setShowDirectoryPicker}
        currentPath={(editDialogOpen ? editingProjectData.path : formData.path) || undefined}
        onSelect={(path) => {
          if (editDialogOpen) {
            setEditingProjectData((prev) => ({ ...prev, path }));
            return;
          }
          setFormData((prev) => ({ ...prev, path }));
        }}
      />
    </>
  );
}
