import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Target01Icon, FolderGitIcon } from "@hugeicons/core-free-icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { m } from "@/paraglide/messages";
import type { Goal, Project } from "@/lib/types";

type GoalStatusFilter = "all" | "active" | "completed" | "paused";

const goalStatusLabel: Record<string, string> = {
  active: m.goal_active(),
  completed: m.goal_completed(),
  paused: m.goal_paused(),
};

interface GoalListProps {
  goals: Goal[];
  projects: Project[];
  activeGoalId: string | null;
  statusFilter: GoalStatusFilter;
  searchQuery: string;
  onSelectGoal: (id: string) => void;
}

const goalStatusColor: Record<Goal["status"], string> = {
  active: "bg-blue-500",
  completed: "bg-emerald-500",
  paused: "bg-amber-500",
};

export function GoalList({
  goals,
  projects,
  activeGoalId,
  statusFilter,
  searchQuery,
  onSelectGoal,
}: GoalListProps) {
  // Filter goals
  const filtered = goals.filter((g) => {
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    if (searchQuery && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group goals by project
  const goalsByProject = new Map<string, Goal[]>();
  const unassigned: Goal[] = [];

  for (const goal of filtered) {
    if (goal.projectId) {
      const list = goalsByProject.get(goal.projectId) || [];
      list.push(goal);
      goalsByProject.set(goal.projectId, list);
    } else {
      unassigned.push(goal);
    }
  }

  // Sort projects: those with goals first
  const projectsWithGoals = projects.filter((p) => goalsByProject.has(p.id));
  const projectsWithoutGoals = projects.filter((p) => !goalsByProject.has(p.id));

  return (
    <div className="flex h-full w-72 flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <h2 className="text-sm font-semibold text-foreground">{m.goals()}</h2>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Projects with goals */}
          {projectsWithGoals.map((project) => {
            const projectGoals = goalsByProject.get(project.id) || [];
            return (
              <div key={project.id} className="space-y-0.5">
                {/* Project header */}
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <HugeiconsIcon icon={FolderGitIcon} className="size-3.5 text-primary/70" />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {project.name}
                  </span>
                  <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                    {projectGoals.length}
                  </span>
                </div>
                {/* Goals under this project */}
                {projectGoals.map((goal) => (
                  <GoalItem
                    key={goal.id}
                    goal={goal}
                    project={project}
                    isActive={goal.id === activeGoalId}
                    onClick={() => onSelectGoal(goal.id)}
                  />
                ))}
              </div>
            );
          })}

          {/* Unassigned goals */}
          {unassigned.length > 0 && (
            <div className="space-y-0.5">
              {projects.length > 0 && (
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <HugeiconsIcon
                    icon={Target01Icon}
                    className="size-3.5 text-muted-foreground/50"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {m.no_project()}
                  </span>
                  <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                    {unassigned.length}
                  </span>
                </div>
              )}
              {unassigned.map((goal) => (
                <GoalItem
                  key={goal.id}
                  goal={goal}
                  isActive={goal.id === activeGoalId}
                  onClick={() => onSelectGoal(goal.id)}
                />
              ))}
            </div>
          )}

          {/* Empty projects (no goals) */}
          {projectsWithoutGoals.map((project) => (
            <div key={project.id} className="flex items-center gap-2 px-2 py-1.5 opacity-50">
              <HugeiconsIcon icon={FolderGitIcon} className="size-3.5 text-muted-foreground/50" />
              <span className="text-xs text-muted-foreground truncate">{project.name}</span>
              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/50">0</span>
            </div>
          ))}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="py-8 text-center">
              <HugeiconsIcon
                icon={Target01Icon}
                className="mx-auto size-6 text-muted-foreground/30 mb-2"
              />
              <p className="text-sm text-muted-foreground">{m.no_goal_selected()}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{m.no_goal_selected_desc()}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function GoalItem({
  goal,
  project,
  isActive,
  onClick,
}: {
  goal: Goal;
  project?: Project;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
        isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-accent/50",
      )}
    >
      <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
        <div className={cn("size-1.5 rounded-full", goalStatusColor[goal.status])} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-medium truncate", isActive && "text-accent-foreground")}>
          {goal.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1 py-0 h-4", isActive && "border-accent-foreground/20")}
          >
            {goalStatusLabel[goal.status] || goal.status}
          </Badge>
          {project?.repositoryUrl && (
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] text-muted-foreground hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <HugeiconsIcon icon={FolderGitIcon} className="size-2.5 inline" />
            </a>
          )}
        </div>
      </div>
    </button>
  );
}
