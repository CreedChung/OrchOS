import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Delete02Icon,
  Edit02Icon,
  File02Icon,
  InformationCircleIcon,
  PlayCircleIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { InfoCard, InfoCardContent, InfoCardDescription } from "@/components/ui/info-card";
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { cn, getRuntimeIcon } from "@/lib/utils";
import { type Conversation, type ConversationMessage } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard-context";
import { useConversationStore } from "@/lib/stores/conversation";
import { m } from "@/paraglide/messages";

export type ConversationBoardColumnId = "planning" | "in_progress" | "review" | "completed";
export type ConversationBoardFilter = "all" | ConversationBoardColumnId;

interface ConversationBoardCard {
  conversation: Conversation;
  title: string;
  summary: string;
  updatedAt: string;
  column: ConversationBoardColumnId;
  hasUserMessage: boolean;
}

const EMPTY_CONVERSATION_MESSAGES: ConversationMessage[] = [];

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

interface BoardViewProps {
  boardFilter: ConversationBoardFilter;
}

export function BoardView({ boardFilter }: BoardViewProps) {
  const navigate = useNavigate();
  const { runtimes } = useDashboard();
  const [renameCardId, setRenameCardId] = useState<string | null>(null);
  const [renameCardTitle, setRenameCardTitle] = useState("");
  const conversationBoardColumns: Array<{
    id: ConversationBoardColumnId;
    label: string;
    icon: typeof PlayCircleIcon;
    tone: string;
    bgAccent: string;
  }> = [
    {
      id: "review",
      label: m.board_today(),
      icon: InformationCircleIcon,
      tone: "text-violet-600 dark:text-violet-400",
      bgAccent: "bg-violet-500/5 dark:bg-violet-500/10",
    },
    {
      id: "planning",
      label: m.board_planning(),
      icon: File02Icon,
      tone: "text-amber-600 dark:text-amber-400",
      bgAccent: "bg-amber-500/5 dark:bg-amber-500/10",
    },
    {
      id: "in_progress",
      label: m.board_in_progress(),
      icon: PlayCircleIcon,
      tone: "text-sky-600 dark:text-sky-400",
      bgAccent: "bg-sky-500/5 dark:bg-sky-500/10",
    },
    {
      id: "completed",
      label: m.board_completed(),
      icon: CheckmarkCircle02Icon,
      tone: "text-emerald-600 dark:text-emerald-400",
      bgAccent: "bg-emerald-500/5 dark:bg-emerald-500/10",
    },
  ];

  const {
    conversations,
    activeConversationId,
    pendingConversationId,
    messagesByConversationId,
    setActiveConversationId,
    updateConversation,
    deleteConversation,
  } = useConversationStore();

  const boardCards = useMemo<ConversationBoardCard[]>(() => {
    return conversations
      .filter((item) => !item.deleted)
      .map((item) => {
        const itemMessages = messagesByConversationId[item.id] ?? EMPTY_CONVERSATION_MESSAGES;
        const firstUserMessage = itemMessages.find((message) => message.role === "user")?.content?.trim() ?? "";

        return {
          conversation: item,
          title: item.title || firstUserMessage || m.untitled_conversation(),
                        summary: firstUserMessage || m.board_waiting_for_input(),
          updatedAt: item.updatedAt,
          column: resolveConversationBoardColumn(item, itemMessages, pendingConversationId),
          hasUserMessage: !!firstUserMessage,
        };
      })
      .filter((card) => card.hasUserMessage)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [conversations, messagesByConversationId, pendingConversationId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background px-4 py-4 md:px-6">
      <div className="mx-auto flex w-full max-w-full min-h-0 flex-1 flex-col gap-3 px-0 pb-2 md:px-6">
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch lg:overflow-x-auto">
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
                      const cardRuntime = runtimes.find((runtime) => runtime.id === card.conversation.runtimeId);
                      const runtimeIcon = cardRuntime
                        ? getRuntimeIcon({
                            id: cardRuntime.registryId || cardRuntime.id,
                            name: cardRuntime.name,
                            command: cardRuntime.command,
                          })
                        : undefined;
                      const runtimeLabel = cardRuntime?.name || m.creation_placeholder();

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
                                <div className="pointer-events-none absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover/card:pointer-events-auto group-hover/card:opacity-100">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                     title={m.board_rename_conversation()}
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
                                     title={m.board_delete_conversation()}
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
                                  {runtimeIcon ? (
                                    <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground/80">
                                      <img src={runtimeIcon} alt="" className="size-3 object-contain" />
                                      {runtimeLabel}
                                    </div>
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
                        <span className="text-xs text-muted-foreground/30">{m.board_no_tasks()}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
        </div>
        </div>

        <RenameDialog
          open={renameCardId !== null}
           title={m.board_rename_conversation()}
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
