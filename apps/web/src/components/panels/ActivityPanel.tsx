import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { useUser } from "@clerk/clerk-react";
import { type UIMessage } from "ai";
import {
  Alert01Icon,
  ArrowRight01Icon,
  InformationCircleIcon,
  Robot02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { ActivityEntry, Goal, Problem, Project } from "@/lib/types";
import { useConversationStore } from "@/lib/stores/conversation";
import { MessageBubble, mapConversationMessagesToUiMessages } from "@/components/chat/ConversationFlow";

interface ActivityPanelProps {
  activities: ActivityEntry[];
  goals: Goal[];
  projects: Project[];
  problems: Problem[];
  collapsed: boolean;
  activeView: "inbox" | "creation" | "agents" | "mcp-servers" | "skills" | "projects" | "observability";
}

function readThreadTone(status: Goal["status"]) {
  if (status === "completed") return "bg-emerald-500";
  if (status === "paused") return "bg-amber-500";
  return "bg-sky-500";
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toISOString().split("T")[0]} ${date.toISOString().split("T")[1]?.slice(0, 5) ?? ""}`;
}

function getProjectTaskGroups(goals: Goal[], activeProjectId?: string) {
  const scopedGoals = activeProjectId ? goals.filter((goal) => goal.projectId === activeProjectId) : goals;

  return {
    current: scopedGoals.filter((goal) => goal.status === "active").slice(0, 6),
    completed: scopedGoals.filter((goal) => goal.status === "completed").slice(0, 4),
    paused: scopedGoals.filter((goal) => goal.status === "paused").slice(0, 4),
  };
}

function getAttentionItems(problems: Problem[], goals: Goal[], activeProjectId?: string) {
  const scopedProblems = activeProjectId
    ? problems.filter((problem) => {
        const goal = goals.find((item) => item.id === problem.goalId);
        return goal?.projectId === activeProjectId;
      })
    : problems;

  return scopedProblems.filter((problem) => problem.status === "open").slice(0, 8);
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 px-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        {title}
      </div>
      <div className="h-px flex-1 bg-border/50" />
      {meta ? <div className="text-[10px] text-muted-foreground/50">{meta}</div> : null}
    </div>
  );
}

export function ActivityPanel({ activities, goals, projects, problems, collapsed, activeView }: ActivityPanelProps) {
  const { user } = useUser();
  const { conversations, activeConversationId, messagesByConversationId } = useConversationStore();

  if (collapsed) {
    return null;
  }

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const activeProjectId = activeConversation?.projectId;
  const activeProject = projects.find((project) => project.id === activeProjectId);
  const conversationMessages = activeConversationId ? (messagesByConversationId[activeConversationId] ?? []) : [];
  const flowMessages = mapConversationMessagesToUiMessages(conversationMessages);
  const threadGoals = activeConversationId
    ? goals.filter((goal) => goal.commandId && goal.projectId === activeProjectId).slice(0, 6)
    : [];
  const projectGroups = getProjectTaskGroups(goals, activeProjectId);
  const attentionItems = getAttentionItems(problems, goals, activeProjectId);
  const recentActivities = activities.slice(0, 8);
  const hasProjectTasks =
    projectGroups.current.length > 0 || projectGroups.paused.length > 0 || projectGroups.completed.length > 0;
  const panelContext = activeProject
    ? `${activeProject.name} · ${m.project()}`
    : activeView === "creation"
      ? "当前线程与项目态势"
      : "当前页面上下文态势";

  return (
    <aside className="flex h-full w-80 flex-col border-l border-border bg-sidebar">
      <div className="flex h-11 items-center gap-2 border-b border-border bg-background px-4">
        <div className="truncate text-sm font-medium text-foreground">工作面板</div>
        <div className="truncate text-xs text-muted-foreground">{panelContext}</div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 py-3">
          {activeView === "creation" && flowMessages.length > 0 ? (
            <section>
              <SectionHeader title="Conversation Flow" meta={`${flowMessages.length} messages`} />
              <div className="space-y-4 px-3">
                {flowMessages.map((message) => (
                  <MessageBubble key={message.id} msg={message as UIMessage} userImageUrl={user?.imageUrl} />
                ))}
              </div>
            </section>
          ) : null}

          {threadGoals.length > 0 ? (
            <section>
              <SectionHeader title="Current Thread" meta={`${threadGoals.length} goals`} />
              <div className="space-y-2 px-3">
                {threadGoals.map((goal) => (
                  <div key={goal.id} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("size-1.5 shrink-0 rounded-full", readThreadTone(goal.status))} />
                      <div className="min-w-0 flex-1 truncate text-xs font-medium text-foreground/85">{goal.title}</div>
                      <Badge variant="outline" className="text-[9px] uppercase tracking-[0.16em]">
                        {goal.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground/70">{formatTime(goal.updatedAt)}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {hasProjectTasks ? (
            <section>
              <SectionHeader
                title="Project Tasks"
                meta={activeProject ? activeProject.name : projects.length > 0 ? `${projects.length} projects` : undefined}
              />
              <div className="space-y-3 px-3">
                {projectGroups.current.length > 0 ? (
                  <div>
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-sky-600/80">进行中</div>
                    <div className="space-y-2">
                      {projectGroups.current.map((goal) => (
                        <div key={goal.id} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                          <div className="text-xs font-medium text-foreground/85">{goal.title}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground/70">{formatTime(goal.updatedAt)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {projectGroups.paused.length > 0 ? (
                  <div>
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-amber-600/80">已暂停</div>
                    <div className="space-y-2">
                      {projectGroups.paused.map((goal) => (
                        <div key={goal.id} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                          <div className="text-xs font-medium text-foreground/85">{goal.title}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground/70">{formatTime(goal.updatedAt)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {projectGroups.completed.length > 0 ? (
                  <div>
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-600/80">最近完成</div>
                    <div className="space-y-2">
                      {projectGroups.completed.map((goal) => (
                        <div key={goal.id} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                          <div className="text-xs font-medium text-foreground/85">{goal.title}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground/70">{formatTime(goal.updatedAt)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {attentionItems.length > 0 ? (
            <section>
              <SectionHeader title="Needs Attention" meta={`${attentionItems.length} open`} />
              <div className="space-y-2 px-3">
                {attentionItems.map((problem) => (
                  <div key={problem.id} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                    <div className="flex items-start gap-2">
                      <HugeiconsIcon
                        icon={problem.priority === "critical" ? Alert01Icon : InformationCircleIcon}
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0",
                          problem.priority === "critical" ? "text-destructive" : "text-amber-500",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-foreground/85">{problem.title}</div>
                        {problem.context ? (
                          <div className="mt-1 line-clamp-3 text-[11px] text-muted-foreground/75">{problem.context}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {recentActivities.length > 0 ? (
            <section>
              <SectionHeader title="Recent Activity" meta={`${recentActivities.length} items`} />
              <div className="space-y-2 px-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
                      <HugeiconsIcon icon={Robot02Icon} className="size-3 text-primary/70" />
                      <span className="font-medium text-foreground/80">{activity.agent}</span>
                      <HugeiconsIcon icon={ArrowRight01Icon} className="size-2.5" />
                      <span>{activity.action}</span>
                    </div>
                    {activity.detail ? (
                      <div className="mt-1 text-[11px] text-muted-foreground/75">{activity.detail}</div>
                    ) : null}
                    {activity.reasoning ? (
                      <div className="mt-2 rounded border border-border/25 bg-muted/20 px-2.5 py-2 text-[11px] text-foreground/70">
                        {activity.reasoning}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}
