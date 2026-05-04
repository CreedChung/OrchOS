import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import Avatar from "react-nice-avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Delete02Icon,
  Edit02Icon,
  File02Icon,
  Folder01Icon,
  InformationCircleIcon,
  PlayCircleIcon,
  Robot02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { InfoCard, InfoCardContent, InfoCardDescription } from "@/components/ui/info-card";
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { cn, getRuntimeIcon } from "@/lib/utils";
import { api, type Conversation, type ConversationMessage, type InboxThread } from "@/lib/api";
import type { AgentProfile, Command, Project, RuntimeProfile } from "@/lib/types";
import { useConversationStore } from "@/lib/stores/conversation";
import { decodeNiceAvatar } from "@/lib/avatar";
import { m } from "@/paraglide/messages";

export type ConversationBoardColumnId = "planning" | "in_progress" | "review" | "completed";
export type ConversationBoardFilter = "all" | ConversationBoardColumnId;

interface ConversationBoardCard {
  conversation: Conversation;
  title: string;
  summary: string;
  projectName?: string;
  updatedAt: string;
  column: ConversationBoardColumnId;
  hasUserMessage: boolean;
}

const EMPTY_CONVERSATION_MESSAGES: ConversationMessage[] = [];

const conversationBoardColumns: Array<{
  id: ConversationBoardColumnId;
  label: string;
  icon: typeof PlayCircleIcon;
  tone: string;
  bgAccent: string;
}> = [
  {
    id: "planning",
    label: "计划中",
    icon: File02Icon,
    tone: "text-amber-600 dark:text-amber-400",
    bgAccent: "bg-amber-500/5 dark:bg-amber-500/10",
  },
  {
    id: "in_progress",
    label: "进行中",
    icon: PlayCircleIcon,
    tone: "text-sky-600 dark:text-sky-400",
    bgAccent: "bg-sky-500/5 dark:bg-sky-500/10",
  },
  {
    id: "review",
    label: "待审查",
    icon: InformationCircleIcon,
    tone: "text-violet-600 dark:text-violet-400",
    bgAccent: "bg-violet-500/5 dark:bg-violet-500/10",
  },
  {
    id: "completed",
    label: "已完成",
    icon: CheckmarkCircle02Icon,
    tone: "text-emerald-600 dark:text-emerald-400",
    bgAccent: "bg-emerald-500/5 dark:bg-emerald-500/10",
  },
];

function formatConversationTime(value?: string) {
  if (!value) return "";

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function resolveConversationBoardColumn(
  conversation: Conversation,
  messages: ConversationMessage[],
  pendingConversationId: string | null,
): ConversationBoardColumnId {
  if (pendingConversationId === conversation.id) return "planning";

  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const hasUserMessage = messages.some((message) => message.role === "user");

  if ((lastAssistantMessage?.clarificationQuestions?.length ?? 0) > 0) {
    return "planning";
  }

  if (conversation.archived) {
    return "completed";
  }

  if (!hasUserMessage) {
    return "planning";
  }

  if (
    lastAssistantMessage?.error ||
    lastAssistantMessage?.trace?.some((item) => item.kind === "tool" && !!item.errorText)
  ) {
    return "in_progress";
  }

  if (lastAssistantMessage) {
    return "review";
  }

  return "in_progress";
}

function buildConversationLookup(threads: InboxThread[]) {
  const byConversationId = new Map<string, string>();
  for (const thread of threads) {
    if (thread.commandId && thread.conversationId && !byConversationId.has(thread.conversationId)) {
      byConversationId.set(thread.conversationId, thread.commandId);
    }
  }
  return byConversationId;
}

function ConversationActorChip({
  imageUrl,
  fallback,
  label,
}: {
  imageUrl?: string;
  fallback: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground/80 transition-colors hover:text-foreground">
      <div className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/50 text-[10px] font-semibold text-foreground/70">
        {imageUrl ? <img src={imageUrl} alt={label} className="size-full object-cover" /> : fallback}
      </div>
      <div className="truncate">{label}</div>
    </div>
  );
}

function AgentParticipantGroup({
  participants,
}: {
  participants: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    iconSrc?: string;
    fallback: string;
  }>;
}) {
  const visibleParticipants = participants.slice(0, 3);
  const extraCount = Math.max(participants.length - visibleParticipants.length, 0);
  const countLabel = `${participants.length} Agent${participants.length > 1 ? "s" : ""}`;

  return (
    <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground/80 transition-colors hover:text-foreground">
      <div className="flex shrink-0 items-center">
        {visibleParticipants.map((participant, index) => (
          <div
            key={participant.id}
            className={cn(
              "flex size-5 items-center justify-center overflow-hidden rounded-full border border-background bg-muted/50 text-[10px] font-semibold text-foreground/70",
              index > 0 && "-ml-1.5",
            )}
            title={participant.name}
          >
            {participant.iconSrc ? (
              <img src={participant.iconSrc} alt={participant.name} className="size-3 object-contain" />
            ) : (() => {
              const niceAvatarConfig = decodeNiceAvatar(participant.avatarUrl);
              if (niceAvatarConfig) {
                return <Avatar className="size-full" {...niceAvatarConfig} />;
              }
              if (participant.avatarUrl) {
                return <img src={participant.avatarUrl} alt={participant.name} className="size-full object-cover" />;
              }
              return <HugeiconsIcon icon={Robot02Icon} className="size-3 text-foreground/70" />;
            })()}
          </div>
        ))}
        {extraCount > 0 ? (
          <div className="-ml-1.5 flex size-5 items-center justify-center rounded-full border border-background bg-muted text-[9px] font-semibold text-muted-foreground">
            +{extraCount}
          </div>
        ) : null}
      </div>
      <div className="truncate">{countLabel}</div>
    </div>
  );
}

interface BoardViewProps {
  agents: AgentProfile[];
  commands: Command[];
  runtimes: RuntimeProfile[];
  projects: Project[];
  boardFilter: ConversationBoardFilter;
}

export function BoardView({
  agents,
  commands,
  runtimes,
  projects,
  boardFilter,
}: BoardViewProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const [renameCardId, setRenameCardId] = useState<string | null>(null);
  const [renameCardTitle, setRenameCardTitle] = useState("");
  const [threads, setThreads] = useState<InboxThread[]>([]);

  const {
    conversations,
    activeConversationId,
    pendingConversationId,
    messagesByConversationId,
    setActiveConversationId,
    updateConversation,
    deleteConversation,
  } = useConversationStore();

  const displayUserName = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "User";
  const displayUserAvatarUrl = user?.imageUrl;
  const commandById = useMemo(() => new Map(commands.map((command) => [command.id, command])), [commands]);
  const conversationToCommandId = useMemo(() => buildConversationLookup(threads), [threads]);

  const boardCards = useMemo<ConversationBoardCard[]>(() => {
    return conversations
      .filter((item) => !item.deleted)
      .map((item) => {
        const itemMessages = messagesByConversationId[item.id] ?? EMPTY_CONVERSATION_MESSAGES;
        const firstUserMessage = itemMessages.find((message) => message.role === "user")?.content?.trim() ?? "";
        const projectName = projects.find((project) => project.id === item.projectId)?.name;

        return {
          conversation: item,
          title: item.title || firstUserMessage || m.untitled_conversation(),
          summary: firstUserMessage || "等待输入需求后进入计划",
          projectName,
          updatedAt: item.updatedAt,
          column: resolveConversationBoardColumn(item, itemMessages, pendingConversationId),
          hasUserMessage: !!firstUserMessage,
        };
      })
      .filter((card) => card.hasUserMessage)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [conversations, messagesByConversationId, pendingConversationId, projects, boardFilter]);

  useEffect(() => {
    let cancelled = false;

    const loadThreads = async () => {
      try {
        const result = await api.listInboxThreads();
        if (!cancelled) {
          setThreads(result);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load conversation thread mapping:", err);
        }
      }
    };

    void loadThreads();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background px-4 py-4 md:px-6">
      <div className="mx-auto flex w-full max-w-full min-h-0 flex-1 flex-col gap-3 px-0 pb-2 md:px-6 lg:flex-row lg:items-stretch lg:overflow-x-auto">
          {conversationBoardColumns
            .filter((column) => boardFilter === "all" || column.id === boardFilter)
            .map((column) => {
              const columnCards = boardCards.filter((card) => card.column === column.id);

              return (
                <div
                  key={column.id}
                  className={cn(
                    "flex min-h-[14rem] min-w-0 flex-col rounded-xl border border-border/30 bg-muted/10 lg:min-h-0 lg:flex-1 lg:basis-0",
                    column.bgAccent,
                  )}
                >
                  <div className="flex items-center gap-2.5 border-b border-border/20 px-4 py-3">
                    <HugeiconsIcon icon={column.icon} className={cn("size-3.5", column.tone, "opacity-70")} />
                    <span className="text-xs font-semibold tracking-wide text-foreground/50">{column.label}</span>
                    <span
                      className={cn(
                        "ml-auto inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                        columnCards.length > 0 ? cn(column.tone, "bg-foreground/5") : "bg-foreground/3 text-muted-foreground/50",
                      )}
                    >
                      {columnCards.length}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "min-h-0 flex-1 p-3",
                      columnCards.length === 0
                        ? "flex items-center justify-center"
                        : cn(
                            "grid content-start auto-rows-max gap-3 overflow-y-auto",
                            boardFilter === "all" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5",
                          ),
                    )}
                  >
                    {columnCards.map((card) => {
                      const isRenameDialogOpen = renameCardId === card.conversation.id;
                      const cardAgent = agents.find((agent) => agent.id === card.conversation.agentId);
                      const cardRuntime =
                        runtimes.find((runtime) => runtime.id === card.conversation.runtimeId) ??
                        runtimes.find((runtime) => runtime.id === cardAgent?.runtimeId);
                      const commandId = conversationToCommandId.get(card.conversation.id);
                      const cardCommand = commandId ? commandById.get(commandId) : undefined;
                      const cardAgentIcon = cardAgent
                        ? getRuntimeIcon({
                            id: cardRuntime?.registryId || cardRuntime?.id || cardAgent.runtimeId,
                            name: cardRuntime?.name || cardAgent.name,
                            command: cardRuntime?.command,
                          })
                        : undefined;
                      const participantNames =
                        cardCommand?.agentNames?.filter((name, index, list) => name && list.indexOf(name) === index) ?? [];
                      const participantAgents = participantNames
                        .map((name) => agents.find((agent) => agent.name === name))
                        .filter((agent): agent is AgentProfile => !!agent);
                      const fallbackParticipant = cardAgent
                        ? [
                            {
                              id: cardAgent.id,
                              name: cardAgent.name,
                              avatarUrl: cardAgent.avatarUrl,
                              iconSrc: cardAgentIcon,
                              fallback: "AI",
                            },
                          ]
                        : [];
                      const agentParticipants =
                        participantAgents.length > 0
                          ? participantAgents.map((agent) => {
                              const runtime = runtimes.find((item) => item.id === agent.runtimeId);
                              return {
                                id: agent.id,
                                name: agent.name,
                                avatarUrl: agent.avatarUrl,
                                iconSrc: getRuntimeIcon({
                                  id: runtime?.registryId || runtime?.id || agent.runtimeId,
                                  name: runtime?.name || agent.name,
                                  command: runtime?.command,
                                }),
                                fallback: "AI",
                              };
                            })
                          : fallbackParticipant;

                      return (
                        <div
                          key={card.conversation.id}
                          role="button"
                          tabIndex={isRenameDialogOpen ? -1 : 0}
                          onClick={() => {
                            if (isRenameDialogOpen) return;
                            setActiveConversationId(card.conversation.id);
                            void navigate({ to: "/dashboard/creation" });
                          }}
                          onKeyDown={(event) => {
                            if (isRenameDialogOpen) return;
                            if (event.key === "Enter") {
                              setActiveConversationId(card.conversation.id);
                              void navigate({ to: "/dashboard/creation" });
                            }
                          }}
                          className="group/card cursor-pointer rounded-xl text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none"
                        >
                          <InfoCard
                            showDismissButton={false}
                            className={cn(
                              "border-border/40 bg-background/80 p-4 text-left transition-all duration-200 group-hover/card:border-border/80 group-hover/card:bg-background",
                              activeConversationId === card.conversation.id && "border-border bg-background",
                            )}
                          >
                            <InfoCardContent className="gap-3">
                              <div className="relative min-w-0 flex-1">
                                <div className="min-w-0 flex items-center gap-2">
                                  <ConversationActorChip
                                    imageUrl={displayUserAvatarUrl}
                                    fallback={(displayUserName.trim()[0] || "U").toUpperCase()}
                                    label={displayUserName}
                                  />
                                </div>
                                <div className="pointer-events-none absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover/card:pointer-events-auto group-hover/card:opacity-100">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    title="重命名会话"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                    }}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      setRenameCardId(card.conversation.id);
                                      setRenameCardTitle(card.title);
                                    }}
                                    className="text-muted-foreground/60 hover:text-foreground"
                                  >
                                    <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    title="删除会话"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                    }}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      void deleteConversation(card.conversation.id);
                                    }}
                                    className="text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="line-clamp-1 text-sm font-medium text-foreground/90">{card.title}</div>
                                <InfoCardDescription className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/60">
                                  {card.summary}
                                </InfoCardDescription>
                              </div>

                              <div className="flex items-center justify-between gap-2 border-t border-border/15 pt-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground/80">
                                    <HugeiconsIcon icon={Folder01Icon} className="size-3 text-amber-500/80" />
                                    {card.projectName || "临时会话"}
                                  </div>
                                  {agentParticipants.length > 0 || fallbackParticipant.length > 0 ? (
                                    <AgentParticipantGroup participants={agentParticipants.length > 0 ? agentParticipants : fallbackParticipant} />
                                  ) : null}
                                  {activeConversationId !== card.conversation.id && (
                                    <span className="text-[11px] text-muted-foreground/40">{column.label}</span>
                                  )}
                                </div>
                                <span className="text-[11px] tabular-nums text-muted-foreground/45">
                                  {formatConversationTime(card.updatedAt)}
                                </span>
                              </div>
                            </InfoCardContent>
                          </InfoCard>
                        </div>
                      );
                    })}

                    {columnCards.length === 0 ? (
                      <div className="flex w-full flex-col items-center justify-center rounded-xl px-3 py-10 text-center">
                        <HugeiconsIcon icon={column.icon} className="mb-2 size-5 text-muted-foreground/15" />
                        <span className="text-xs text-muted-foreground/30">暂无任务</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
        </div>

        <RenameDialog
          open={renameCardId !== null}
          title="重命名会话"
          initialValue={renameCardTitle}
          placeholder={m.untitled_conversation()}
          onClose={() => {
            setRenameCardId(null);
            setRenameCardTitle("");
          }}
          onSubmit={(name) => {
            if (renameCardId && name !== renameCardTitle) {
              void updateConversation(renameCardId, { title: name });
            }
            setRenameCardId(null);
            setRenameCardTitle("");
          }}
        />
    </div>
  );
}
