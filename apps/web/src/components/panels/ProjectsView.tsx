import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FolderIcon,
  Add01Icon,
  Delete02Icon,
  Download01Icon,
  Link01Icon,
  Edit02Icon,
  Loading01Icon,
  Target01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectoryPickerDialog } from "@/components/ui/directory-picker-dialog";
import { StateBoard } from "@/components/panels/StateBoard";
import { GoalActions } from "@/components/panels/GoalActions";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { isSystemProblem } from "@/lib/types";
import type {
  Project,
  Goal,
  StateItem,
  Artifact,
  ActivityEntry,
  Problem,
  Command,
} from "@/lib/types";

type GoalStatusFilter = "all" | "active" | "completed" | "paused";

const goalStatusColor: Record<Goal["status"], string> = {
  active: "bg-blue-500",
  completed: "bg-emerald-500",
  paused: "bg-amber-500",
};

const goalStatusLabel: Record<string, string> = {
  active: m.goal_active(),
  completed: m.goal_completed(),
  paused: m.goal_paused(),
};

interface ProjectsViewProps {
  projects: Project[];
  goals: Goal[];
  states: StateItem[];
  artifacts: Artifact[];
  activities: ActivityEntry[];
  problems: Problem[];
  activeGoalId: string | null;
  activeGoal: Goal | null;
  activeCommand: Command | undefined;
  onSelectGoal: (id: string) => void;
  onStateAction: (stateId: string, action: string) => void;
  onProblemAction: (problemId: string, action: string) => void;
  onPauseGoal: () => void;
  onResumeGoal: () => void;
  onDeleteGoal: (goalId?: string) => void;
  onRefresh: () => void;
}

export function ProjectsView({
  projects,
  goals,
  states,
  artifacts,
  activities,
  problems,
  activeGoalId,
  activeGoal,
  activeCommand,
  onSelectGoal,
  onStateAction,
  onProblemAction,
  onPauseGoal,
  onResumeGoal,
  onDeleteGoal,
  onRefresh,
}: ProjectsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"clone" | "local">("clone");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", path: "", repositoryUrl: "" });
  const [loading, setLoading] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneResults, setCloneResults] = useState<
    Record<string, { success: boolean; output?: string; error?: string; path: string }>
  >({});
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [goalStatusFilter, setGoalStatusFilter] = useState<GoalStatusFilter>("all");

  useEffect(() => {
    if (formData.repositoryUrl && formMode === "clone") {
      const repoName =
        formData.repositoryUrl
          .split("/")
          .pop()
          ?.replace(/\.git$/, "") || "";
      if (repoName && !formData.name) {
        setFormData((prev) => ({
          ...prev,
          name: repoName.charAt(0).toUpperCase() + repoName.slice(1),
          path: `~/Projects/${repoName}`,
        }));
      }
    }
  }, [formData.repositoryUrl, formMode]);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const goalsByProject = new Map<string, Goal[]>();
  const unassignedGoals: Goal[] = [];

  for (const goal of goals) {
    if (goal.projectId) {
      const list = goalsByProject.get(goal.projectId) || [];
      list.push(goal);
      goalsByProject.set(goal.projectId, list);
    } else {
      unassignedGoals.push(goal);
    }
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.path) return;
    setLoading(true);
    try {
      await api.createProject({
        name: formData.name,
        path: formData.path,
        repositoryUrl:
          formMode === "clone" ? formData.repositoryUrl.trim() || undefined : undefined,
      });
      const currentRepoUrl = formData.repositoryUrl;
      setFormData({ name: "", path: "", repositoryUrl: "" });
      setShowForm(false);
      onRefresh();

      if (formMode === "clone" && currentRepoUrl) {
        setTimeout(async () => {
          const newProjects = await api.listProjects();
          const newProject = newProjects.find(
            (p) => p.name === formData.name && p.repositoryUrl === currentRepoUrl,
          );
          if (newProject) {
            handleClone(newProject.id);
          }
        }, 500);
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setFormData({
      name: project.name,
      path: project.path,
      repositoryUrl: project.repositoryUrl || "",
    });
    setFormMode(project.repositoryUrl ? "clone" : "local");
    setShowForm(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.name || !formData.path) return;
    setLoading(true);
    try {
      await api.updateProject(editingId, {
        name: formData.name,
        path: formData.path,
        repositoryUrl: formData.repositoryUrl.trim() || undefined,
      });
      setFormData({ name: "", path: "", repositoryUrl: "" });
      setEditingId(null);
      setShowForm(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to update project:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(m.env_delete_project_confirm())) return;
    try {
      await api.deleteProject(id);
      if (expandedProjectId === id) setExpandedProjectId(null);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const handleClone = async (id: string, force: boolean = false) => {
    setCloningId(id);
    try {
      const result = await api.cloneProject(id, { force });
      setCloneResults((prev) => ({ ...prev, [id]: result }));
    } catch (err) {
      console.error("Failed to clone:", err);
      setCloneResults((prev) => ({
        ...prev,
        [id]: {
          success: false,
          output: "",
          error: err instanceof Error ? err.message : "Clone failed",
          path: "",
        },
      }));
    } finally {
      setCloningId(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", path: "", repositoryUrl: "" });
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjectId((prev) => (prev === projectId ? null : projectId));
  };

  const filteredGoalsForProject = (projectId: string) => {
    const projectGoals = goalsByProject.get(projectId) || [];
    if (goalStatusFilter === "all") return projectGoals;
    return projectGoals.filter((g) => g.status === goalStatusFilter);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex h-full w-72 flex-col border-r border-border bg-background">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <h2 className="text-sm font-semibold text-foreground">{m.project()}</h2>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setEditingId(null);
              setFormData({ name: "", path: "", repositoryUrl: "" });
              setFormMode("clone");
              setShowForm(true);
            }}
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
          </Button>
        </div>

        {goals.length > 0 && (
          <div className="flex items-center gap-1 border-b border-border px-3 py-1.5">
            {(["all", "active", "completed", "paused"] as GoalStatusFilter[]).map((filter) => {
              const count =
                filter === "all" ? goals.length : goals.filter((g) => g.status === filter).length;
              return (
                <button
                  key={filter}
                  onClick={() => setGoalStatusFilter(filter)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                    goalStatusFilter === filter
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  {filter === "all" ? m.all() : goalStatusLabel[filter] || filter}
                  <span className="tabular-nums opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {projects.map((project) => {
              const isExpanded = expandedProjectId === project.id;
              const projectGoals = filteredGoalsForProject(project.id);
              const totalGoals = goalsByProject.get(project.id)?.length || 0;
              const isCloning = cloningId === project.id;
              const cloneResult = cloneResults[project.id];
              const hasRepo = cloneResult?.success;

              return (
                <div key={project.id}>
                  <div className="flex items-center">
                    <button
                      onClick={() => setSelectedProjectId(project.id)}
                      className={cn(
                        "group flex flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors flex-nowrap hover:bg-accent/50",
                        selectedProjectId === project.id && "bg-accent",
                      )}
                    >
                      <HugeiconsIcon
                        icon={FolderIcon}
                        className="size-3.5 shrink-0 text-primary/70"
                      />
                      <span className="flex-1 truncate text-xs font-medium text-foreground">
                        {project.name}
                      </span>
                      {hasRepo && (
                        <Badge
                          variant="outline"
                          className="text-[8px] text-emerald-500 border-emerald-500/30 px-1 py-0 h-3.5"
                        >
                          Cloned
                        </Badge>
                      )}
                      {totalGoals > 0 && (
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {totalGoals}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(project);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                        title={m.edit()}
                      >
                        <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                        title={m.delete()}
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                      </Button>
                    </button>
                    {totalGoals > 0 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleProject(project.id)}
                        className="shrink-0"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          className={cn("size-3.5 transition-transform", isExpanded && "rotate-90")}
                        />
                      </Button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="ml-5 space-y-0.5 border-l border-border/50 pl-2 pb-1">
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        {project.repositoryUrl && (
                          <a
                            href={project.repositoryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <HugeiconsIcon icon={Link01Icon} className="size-2.5" />
                            {m.env_repo_link()}
                          </a>
                        )}
                        <span className="text-[10px] text-muted-foreground/50 truncate font-mono">
                          {project.path}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 px-2 py-0.5">
                        {project.repositoryUrl && (
                          <button
                            onClick={() => handleClone(project.id, !!cloneResult?.success)}
                            disabled={isCloning}
                            className={cn(
                              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                              isCloning
                                ? "bg-muted text-muted-foreground cursor-wait"
                                : "bg-primary/10 text-primary hover:bg-primary/20",
                            )}
                          >
                            <HugeiconsIcon
                              icon={isCloning ? Loading01Icon : Download01Icon}
                              className={cn("size-2.5", isCloning && "animate-spin")}
                            />
                            {isCloning ? "Cloning..." : "Clone"}
                          </button>
                        )}
                      </div>

                      {cloneResult && !cloneResult.success && cloneResult.error && (
                        <div className="mx-2 rounded bg-destructive/10 px-2 py-1 text-[9px] text-destructive">
                          {cloneResult.error}
                        </div>
                      )}
                      {cloneResult?.success && (
                        <div className="mx-2 rounded bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-600 dark:text-emerald-400">
                          Cloned to: {cloneResult.path}
                        </div>
                      )}

                      {projectGoals.map((goal) => (
                        <button
                          key={goal.id}
                          onClick={() => onSelectGoal(goal.id)}
                          className={cn(
                            "flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors",
                            goal.id === activeGoalId
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground/80 hover:bg-accent/50",
                          )}
                        >
                          <div
                            className={cn(
                              "mt-1 size-1.5 shrink-0 rounded-full",
                              goalStatusColor[goal.status],
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-xs font-medium truncate",
                                goal.id === activeGoalId && "text-accent-foreground",
                              )}
                            >
                              {goal.title}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] px-1 py-0 h-4 mt-0.5",
                                goal.id === activeGoalId && "border-accent-foreground/20",
                              )}
                            >
                              {goalStatusLabel[goal.status] || goal.status}
                            </Badge>
                          </div>
                        </button>
                      ))}
                      {projectGoals.length === 0 &&
                        goalStatusFilter !== "all" &&
                        totalGoals > 0 && (
                          <p className="px-2.5 py-1 text-[10px] text-muted-foreground/60">
                            No {goalStatusFilter} goals
                          </p>
                        )}
                      {totalGoals === 0 && (
                        <p className="px-2.5 py-1 text-[10px] text-muted-foreground/60">
                          No goals yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {unassignedGoals.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <HugeiconsIcon
                    icon={Target01Icon}
                    className="size-3.5 text-muted-foreground/50"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {m.no_project()}
                  </span>
                  <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                    {unassignedGoals.length}
                  </span>
                </div>
                {unassignedGoals
                  .filter((g) => goalStatusFilter === "all" || g.status === goalStatusFilter)
                  .map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => onSelectGoal(goal.id)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors",
                        goal.id === activeGoalId
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground/80 hover:bg-accent/50",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-1 size-1.5 shrink-0 rounded-full",
                          goalStatusColor[goal.status],
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-xs font-medium truncate",
                            goal.id === activeGoalId && "text-accent-foreground",
                          )}
                        >
                          {goal.title}
                        </p>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 mt-0.5">
                          {goalStatusLabel[goal.status] || goal.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
              </div>
            )}

            {projects.length === 0 && (
              <div className="py-8 text-center">
                <HugeiconsIcon
                  icon={FolderIcon}
                  className="mx-auto size-6 text-muted-foreground/30 mb-2"
                />
                <p className="text-sm text-muted-foreground">{m.env_no_projects()}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{m.env_no_projects_desc()}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ name: "", path: "", repositoryUrl: "" });
                    setFormMode("clone");
                    setShowForm(true);
                  }}
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
                  {m.add()} {m.project()}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeGoal ? (
          <StateBoard
            goal={activeGoal}
            states={states}
            artifacts={artifacts}
            activities={activities}
            projects={projects}
            command={activeCommand}
            problems={{
              critical: problems.filter(
                (p) =>
                  p.status === "open" &&
                  p.priority === "critical" &&
                  isSystemProblem(p) &&
                  p.goalId === activeGoalId,
              ).length,
              warning: problems.filter(
                (p) =>
                  p.status === "open" &&
                  p.priority === "warning" &&
                  isSystemProblem(p) &&
                  p.goalId === activeGoalId,
              ).length,
              info: problems.filter(
                (p) =>
                  p.status === "open" &&
                  p.priority === "info" &&
                  isSystemProblem(p) &&
                  p.goalId === activeGoalId,
              ).length,
            }}
            systemProblems={problems.filter(
              (p) => p.status === "open" && isSystemProblem(p) && p.goalId === activeGoalId,
            )}
            onStateAction={onStateAction}
            onProblemAction={onProblemAction}
            onAutoModeToggle={activeGoal.status === "active" ? onPauseGoal : onResumeGoal}
            goalActions={
              <GoalActions
                goal={activeGoal}
                onPause={onPauseGoal}
                onResume={onResumeGoal}
                onDelete={onDeleteGoal}
              />
            }
          />
        ) : selectedProjectId ? (
          (() => {
            const selectedProject = projects.find((p) => p.id === selectedProjectId);
            const projectGoals = goalsByProject.get(selectedProjectId) || [];
            const isCloning = cloningId === selectedProjectId;
            const cloneResult = cloneResults[selectedProjectId];
            if (!selectedProject) return null;
            return (
              <div className="flex h-full flex-col overflow-hidden">
                <div className="flex h-14 items-center justify-between border-b border-border px-6">
                  <div className="flex items-center gap-3">
                    <HugeiconsIcon icon={FolderIcon} className="size-5 text-primary/70" />
                    <h2 className="text-sm font-semibold text-foreground">
                      {selectedProject.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleEdit(selectedProject)}
                      title={m.edit()}
                    >
                      <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(selectedProject.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title={m.delete()}
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-muted-foreground">{m.env_project_path()}</label>
                        <p className="mt-1 text-sm font-mono text-foreground">
                          {selectedProject.path}
                        </p>
                      </div>
                      {selectedProject.repositoryUrl && (
                        <div>
                          <label className="text-xs text-muted-foreground">{m.env_project_repo_url()}</label>
                          <a
                            href={selectedProject.repositoryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            <HugeiconsIcon icon={Link01Icon} className="size-3.5" />
                            {selectedProject.repositoryUrl}
                          </a>
                        </div>
                      )}
                    </div>
                    {selectedProject.repositoryUrl && (
                      <div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClone(selectedProject.id, !!cloneResult?.success)}
                          disabled={isCloning}
                        >
                          <HugeiconsIcon
                            icon={isCloning ? Loading01Icon : Download01Icon}
                            className={cn("size-3.5", isCloning && "animate-spin")}
                          />
                          {isCloning ? "Cloning..." : cloneResult?.success ? "Clone Again" : "Clone Repository"}
                        </Button>
                        {cloneResult && !cloneResult.success && cloneResult.error && (
                          <p className="mt-2 text-xs text-destructive">{cloneResult.error}</p>
                        )}
                        {cloneResult?.success && (
                          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                            Cloned to: {cloneResult.path}
                          </p>
                        )}
                      </div>
                    )}
                    <div>
                      <h3 className="mb-3 text-xs font-semibold text-muted-foreground">
                        {m.goal()} ({projectGoals.length})
                      </h3>
                      {projectGoals.length > 0 ? (
                        <div className="space-y-1">
                          {projectGoals.map((goal) => (
                            <button
                              key={goal.id}
                              onClick={() => onSelectGoal(goal.id)}
                              className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/50"
                            >
                              <div
                                className={cn(
                                  "mt-1.5 size-2 shrink-0 rounded-full",
                                  goalStatusColor[goal.status],
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {goal.title}
                                </p>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 mt-1">
                                  {goalStatusLabel[goal.status] || goal.status}
                                </Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{m.env_no_projects_desc()}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <HugeiconsIcon
                icon={Target01Icon}
                className="mx-auto size-8 text-muted-foreground/30 mb-3"
              />
              <p className="text-sm text-muted-foreground">{m.no_goal_selected()}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{m.no_goal_selected_desc()}</p>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">
                {editingId ? m.edit_status() : m.add()} {m.project()}
              </h2>
            </div>

            {!editingId && (
              <Tabs value={formMode} onValueChange={(v) => setFormMode(v as "clone" | "local")}>
                <TabsList>
                  <TabsTrigger value="clone">
                    <HugeiconsIcon icon={Download01Icon} className="size-4" />
                    Clone Remote
                  </TabsTrigger>
                  <TabsTrigger value="local">
                    <HugeiconsIcon icon={FolderIcon} className="size-4" />
                    Import Local
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {formMode === "clone" ? (
              <div className="space-y-3 mt-4">
                <div>
                  <label className="text-xs text-muted-foreground">
                    {m.env_project_repo_url()}
                  </label>
                  <input
                    type="text"
                    value={formData.repositoryUrl}
                    onChange={(e) => setFormData({ ...formData, repositoryUrl: e.target.value })}
                    placeholder={m.env_project_repo_placeholder()}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{m.env_project_name()}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={m.env_project_name_placeholder()}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{m.env_project_path()}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.path}
                      onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                      placeholder={m.env_project_path_placeholder()}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                      readOnly
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 px-0"
                      onClick={() => setShowDirectoryPicker(true)}
                      title="Browse for directory"
                      aria-label="Browse for directory"
                    >
                      <HugeiconsIcon icon={FolderIcon} className="size-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Auto-generated from repo name. Click Browse to choose a different location.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                <div>
                  <label className="text-xs text-muted-foreground">{m.env_project_name()}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={m.env_project_name_placeholder()}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Local Directory</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.path}
                      onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                      placeholder="/Users/username/Projects/my-project"
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                      readOnly
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 px-0"
                      onClick={() => setShowDirectoryPicker(true)}
                      title="Browse for directory"
                      aria-label="Browse for directory"
                    >
                      <HugeiconsIcon icon={FolderIcon} className="size-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Click Browse to select your local project directory
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                {m.cancel()}
              </Button>
              <Button
                size="sm"
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={loading || !formData.name || !formData.path}
              >
                {loading
                  ? m.creating()
                  : editingId
                    ? m.save()
                    : formMode === "clone"
                      ? "Clone & Create"
                      : "Import Project"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DirectoryPickerDialog
        open={showDirectoryPicker}
        onOpenChange={setShowDirectoryPicker}
        currentPath={formData.path || undefined}
        onSelect={(selectedPath) => {
          setFormData((prev) => {
            const dirName = selectedPath.split("/").pop() || selectedPath;
            const displayName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            return {
              ...prev,
              path: selectedPath,
              name: prev.name || displayName,
            };
          });
        }}
      />
    </div>
  );
}
