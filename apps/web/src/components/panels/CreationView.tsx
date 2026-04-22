import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Chat01Icon,
  Delete02Icon,
  Edit02Icon,
  Robot02Icon,
  ArrowUp01Icon,
  Folder01Icon,
  Upload04Icon,
  Mic01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "border-beam";
import { ArchiveRestore, ArchiveX, Star } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  selectContentClassName,
  selectItemClassName,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatDuration } from "@/lib/utils";
import { api, type ActivityEntry, type Conversation, type ConversationMessage, type Goal, type StateEntry } from "@/lib/api";
import type { AgentProfile, ControlSettings, Project, RuntimeProfile } from "@/lib/types";
import { useConversationStore } from "@/lib/stores/conversation";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import type { CreationArchiveFilter } from "@/components/layout/Toolbar";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import { ChatReasoningDrawer } from "@/components/chat/ChatReasoningDrawer";
import { ChatThinkingState } from "@/components/chat/ChatThinkingState";
import { ChatToolTimeline } from "@/components/chat/ChatToolTimeline";

interface CreationViewProps {
  agents: AgentProfile[];
  runtimes: RuntimeProfile[];
  projects: Project[];
  archiveFilter: CreationArchiveFilter;
  settings: ControlSettings | null;
  onSettingsChange: (settings: ControlSettings) => void;
}

interface GoalExecutionSnapshot {
  goal: Goal;
  states: StateEntry[];
  activities: ActivityEntry[];
}

const EMPTY_CONVERSATION_MESSAGES: ConversationMessage[] = [];

function prettifyToolName(name: string) {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildMessageParts(message: ConversationMessage): Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [];
  let reasoningBuffer = "";
  const toolPartsByCallId = new Map<string, Record<string, unknown>>();

  const flushReasoning = () => {
    const text = reasoningBuffer.trim();
    if (!text) return;
    parts.push({ type: "reasoning", text });
    reasoningBuffer = "";
  };

  for (const [index, event] of (message.trace ?? []).entries()) {
    if (event.kind === "thought" && event.text) {
      reasoningBuffer += event.text;
      continue;
    }

    flushReasoning();

    if (event.kind === "tool" && event.toolName) {
      const toolCallId = event.toolCallId || `${message.id}-tool-${index}`;
      const existing = toolPartsByCallId.get(toolCallId);

      if (existing) {
        if (event.state !== undefined) existing.state = event.state;
        if (event.input !== undefined) existing.input = event.input;
        if (event.output !== undefined) existing.output = event.output;
        if (event.errorText !== undefined) existing.errorText = event.errorText;
        continue;
      }

      const toolPart: Record<string, unknown> = {
        id: toolCallId,
        type: `tool-${event.toolName}`,
        toolCallId,
        toolDisplayName: prettifyToolName(event.toolName),
        state: event.state,
        input: event.input,
        output: event.output,
        errorText: event.errorText,
      };

      toolPartsByCallId.set(toolCallId, toolPart);
      parts.push(toolPart);
    }
  }

  flushReasoning();

  if (message.content) {
    parts.push({ type: "text", text: message.content });
  }

  return parts;
}

function MessageBubble({ msg, userImageUrl }: { msg: UIMessage; userImageUrl?: string }) {
  const isUser = msg.role === "user";
  const metadata = (msg.metadata ?? {}) as {
    responseTime?: number;
    error?: string;
    executionMode?: "sandbox" | "local";
    sandboxStatus?: "created" | "reused" | "fallback" | "required_failed";
    sandboxVmId?: string;
    projectId?: string;
    projectName?: string;
  };

  return (
    <div className="flex w-full gap-2">
      <span
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium leading-none mt-[3px] overflow-hidden",
          isUser
            ? "bg-primary/10 text-primary"
            : metadata.error
              ? "bg-destructive/10 text-destructive"
              : "bg-muted",
        )}
      >
        {isUser ? (
          userImageUrl ? (
            <img src={userImageUrl} alt="" className="size-full object-cover" />
          ) : (
            "U"
          )
        ) : (
          <img src="/logo.svg" alt="" className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
          <span className="font-medium text-foreground/60">{isUser ? m.user() : m.assistant()}</span>
          {metadata.responseTime != null && <span className="opacity-50">{formatDuration(metadata.responseTime)}</span>}
        </div>
        {msg.parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <div key={`${msg.id}-${index}`} className="text-sm leading-7 text-foreground/90">
                <ChatMarkdown content={part.text} />
              </div>
            );
          }

          if (part.type === "reasoning") {
            return (
              <ChatReasoningDrawer
                key={`${msg.id}-${index}`}
                text={part.text}
                metadata={metadata}
              />
            );
          }

          if (part.type.startsWith("tool-")) {
            return (
              <ChatToolTimeline
                key={`${msg.id}-${index}`}
                part={part as Record<string, unknown> & { type: string }}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

function mapConversationMessagesToUiMessages(messages: ConversationMessage[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    metadata: {
      responseTime: message.responseTime,
      error: message.error,
      executionMode: message.executionMode,
      sandboxStatus: message.sandboxStatus,
      sandboxVmId: message.sandboxVmId,
      projectId: message.projectId,
      projectName: message.projectName,
      clarificationQuestions: message.clarificationQuestions,
      createdAt: message.createdAt,
    },
    parts: buildMessageParts(message) as UIMessage["parts"],
  }));
}

function getStateTone(status: StateEntry["status"]) {
  if (status === "success") return "text-emerald-600 dark:text-emerald-400";
  if (status === "running") return "text-blue-600 dark:text-blue-400";
  if (status === "failed" || status === "error") return "text-destructive";
  return "text-muted-foreground";
}

function getGoalStatusLabel(goal: Goal, states: StateEntry[]) {
  if (goal.status === "completed") return "已完成";
  if (states.some((state) => state.status === "running")) return "执行中";
  if (states.some((state) => state.status === "failed" || state.status === "error")) return "已阻塞";
  if (states.some((state) => state.status === "success")) return "处理中";
  return "排队中";
}

function getActivityTone(activity?: ActivityEntry) {
  const detail = `${activity?.detail ?? ""} ${activity?.action ?? ""}`.toLowerCase();

  if (/fail|error|reject|blocked|阻塞|失败|错误/.test(detail)) {
    return "border-destructive/30 bg-destructive/5 text-destructive";
  }

  if (/success|complete|created|pass|完成|成功|已完成/.test(detail)) {
    return "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300";
  }

  return "border-sky-500/20 bg-sky-500/5 text-sky-700 dark:text-sky-300";
}

function ExecutionProgressCard({ snapshots }: { snapshots: GoalExecutionSnapshot[] }) {
  const activeGoalIndex = snapshots.findIndex(
    (snapshot) => snapshot.goal.status !== "completed",
  );
  const currentGoalNumber = activeGoalIndex >= 0 ? activeGoalIndex + 1 : snapshots.length;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">任务执行进度</div>
          <div className="text-xs text-muted-foreground">
            {snapshots.length > 0
              ? `当前进度：第 ${currentGoalNumber} / ${snapshots.length} 个任务`
              : "等待任务开始"}
          </div>
        </div>
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
          {snapshots.filter((snapshot) => snapshot.goal.status === "completed").length}/{snapshots.length} 完成
        </span>
      </div>

        <div className="mt-4 space-y-3">
          {snapshots.map((snapshot, index) => {
            const latestActivity = snapshot.activities[0];
            const recentActivities = snapshot.activities.slice(0, 3);

            return (
              <div key={snapshot.goal.id} className="rounded-xl border border-border/50 bg-background/80 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {index + 1}. {snapshot.goal.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {getGoalStatusLabel(snapshot.goal, snapshot.states)}
                    {latestActivity?.action ? ` · 最近动作：${latestActivity.action}` : ""}
                  </div>
                  </div>
                </div>

                {recentActivities.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {recentActivities.map((activity, activityIndex) => (
                      <div
                        key={activity.id}
                        className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              "mt-1 size-2 shrink-0 rounded-full border",
                              getActivityTone(activity),
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium text-foreground/85">{activity.action}</span>
                              <span className="text-muted-foreground">{activity.timestamp}</span>
                              {activityIndex === 0 ? (
                                <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  最新
                                </span>
                              ) : null}
                            </div>

                            {activity.detail ? (
                              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                {activity.detail}
                              </p>
                            ) : null}

                            {activity.reasoning ? (
                              <div className="mt-2 rounded-md border border-border/50 bg-background/80 px-2.5 py-2">
                                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-foreground/55">
                                  推理
                                </div>
                                <p className="whitespace-pre-wrap break-words text-[11px] leading-5 text-foreground/70">
                                  {activity.reasoning}
                                </p>
                              </div>
                            ) : null}

                            {activity.diff ? (
                              <details className="mt-2 group">
                                <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] text-foreground/65">
                                  <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px]">
                                    执行产物
                                  </span>
                                  <span className="truncate">查看本次变更 / 输出</span>
                                  <span className="ml-auto text-[10px] text-muted-foreground/60 transition-transform group-open:rotate-90">
                                    ›
                                  </span>
                                </summary>
                                <pre className="mt-2 overflow-x-auto rounded-md border border-border/50 bg-background p-2 text-[11px] leading-5 text-foreground/70">
                                  <code>{activity.diff}</code>
                                </pre>
                              </details>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {snapshot.states.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {snapshot.states.map((state) => (
                      <div key={state.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate text-foreground/85">{state.label}</span>
                      <span className={cn("shrink-0 font-medium", getStateTone(state.status))}>{state.status}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CreationView({ agents, runtimes, projects, archiveFilter, settings, onSettingsChange }: CreationViewProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const autoCreatingConversationRef = useRef(false);

  const {
    conversations,
    activeConversationId,
    messagesByConversationId,
    hasLoadedConversations,
    loadConversations,
    setActiveConversationId,
    loadMessages,
    createConversation,
    updateConversation,
    deleteConversation,
  } = useConversationStore();

  const messages = activeConversationId
    ? (messagesByConversationId[activeConversationId] ?? EMPTY_CONVERSATION_MESSAGES)
    : EMPTY_CONVERSATION_MESSAGES;
  const uiMessages = useMemo(() => mapConversationMessagesToUiMessages(messages), [messages]);

  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const enabledRuntimes = useMemo(() => runtimes.filter((r) => r.enabled), [runtimes]);
  const enabledAgents = useMemo(() => agents.filter((agent) => agent.enabled), [agents]);
  const defaultAgent = useMemo(
    () => enabledAgents.find((agent) => agent.id === settings?.defaultAgentId),
    [enabledAgents, settings?.defaultAgentId],
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const filteredConversations = useMemo(() => {
    if (archiveFilter === "archived") return conversations.filter((c) => c.archived && !c.deleted);
    if (archiveFilter === "active") return conversations.filter((c) => !c.archived && !c.deleted);
    return conversations.filter((c) => !c.deleted);
  }, [archiveFilter, conversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);

  const handleNewConversation = useCallback(async () => {
    if (activeConversation && !activeConversation.archived && !activeConversation.deleted && messages.length === 0) {
      setActiveConversationId(activeConversation.id);
      return;
    }

    try {
      await createConversation({
        agentId: defaultAgent?.id,
        runtimeId: defaultAgent?.runtimeId || settings?.defaultRuntimeId || undefined,
      });
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [activeConversation, createConversation, defaultAgent?.id, defaultAgent?.runtimeId, messages.length, setActiveConversationId, settings?.defaultRuntimeId]);

  useEffect(() => {
    if (!hasLoadedConversations) return;

    if (
      activeConversationId &&
      filteredConversations.some((conv) => conv.id === activeConversationId)
    ) {
      return;
    }

    if (filteredConversations.length > 0) {
      setActiveConversationId(filteredConversations[0].id);
      return;
    }

    if (
      archiveFilter === "archived" ||
      autoCreatingConversationRef.current
    ) {
      return;
    }

    autoCreatingConversationRef.current = true;
    void handleNewConversation().finally(() => {
      autoCreatingConversationRef.current = false;
    });
  }, [
    activeConversationId,
    archiveFilter,
    filteredConversations,
    handleNewConversation,
    hasLoadedConversations,
    setActiveConversationId,
  ]);

  const handleDeleteConversation = useCallback(async () => {
    if (!convToDelete) return;
    try {
      await deleteConversation(convToDelete);
      setConvToDelete(null);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }, [convToDelete, deleteConversation]);

  const handleUpdateConversation = useCallback(
    async (
      id: string,
      data: {
        title?: string;
        projectId?: string;
        agentId?: string;
        runtimeId?: string;
        archived?: boolean;
        deleted?: boolean;
      },
    ) => {
      try {
        await updateConversation(id, data);
      } catch (err) {
        console.error("Failed to update conversation:", err);
      }
    },
    [updateConversation],
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Conversation list sidebar */}
      <div className="flex h-full w-72 flex-col border-r border-border bg-background">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <h2 className="text-sm font-semibold text-foreground">{m.creation()}</h2>
          <Button size="icon-sm" variant="ghost" onClick={handleNewConversation}>
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-0.5">
            {!hasLoadedConversations ? (
              <ConversationListSkeleton />
            ) : (
              <>
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm cursor-pointer transition-colors",
                      activeConversationId === conv.id
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-foreground/70 hover:bg-accent/50 hover:text-foreground",
                    )}
                    onClick={() => setActiveConversationId(conv.id)}
                  >
                    <HugeiconsIcon icon={Chat01Icon} className="size-3.5 shrink-0 opacity-50" />
                    <span className="flex-1 truncate text-left text-xs">
                      {conv.title || m.untitled_conversation()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleUpdateConversation(
                          conv.id,
                          conv.deleted
                            ? { deleted: false, archived: false }
                            : { archived: !conv.archived, deleted: false },
                        );
                      }}
className={cn(
                        "shrink-0 text-muted-foreground transition-opacity rounded p-1 hover:bg-muted",
                        conv.archived || conv.deleted
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100",
                      )}
                      title={conv.deleted || conv.archived ? m.restore_conversation() : m.archive()}
                      type="button"
                    >
                      {conv.archived || conv.deleted ? (
                        <ArchiveRestore className="size-3" />
                      ) : (
                        <ArchiveX className="size-3" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (conv.deleted) {
                          void deleteConversation(conv.id, true).catch((err) => {
                            console.error("Failed to permanently delete conversation:", err);
                          });
                          return;
                        }
                        setConvToDelete(conv.id);
                        setDeleteConfirmOpen(true);
                      }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      title={conv.deleted ? m.delete_forever() : m.delete()}
                      type="button"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                    </button>
                  </div>
                ))}
                {filteredConversations.length === 0 && (
                  <div className="py-6 text-center">
                    <HugeiconsIcon
                      icon={Chat01Icon}
                      className="mx-auto size-5 text-muted-foreground/30 mb-1.5"
                    />
                    <p className="text-xs text-muted-foreground">{m.no_conversations()}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeConversation ? (
          <ChatArea
            conversation={activeConversation}
            messages={uiMessages}
            sending={sending}
            chatError={chatError}
            agents={agents}
            runtimes={enabledRuntimes}
            projects={projects}
            defaultAgentId={settings?.defaultAgentId}
            onUpdateConversation={handleUpdateConversation}
            onSetDefaultAgent={(agentId) => {
              const selectedAgent = agents.find((agent) => agent.id === agentId);
              void api.updateSettings({
                defaultAgentId: agentId,
                defaultRuntimeId: selectedAgent?.runtimeId,
              }).then((updated) => {
                onSettingsChange(updated);
              });
            }}
            onSendMessage={async (content) => {
              setSending(true);
              setChatError(null);
              try {
                const result = await api.createGoalsFromConversation(activeConversation.id, {
                  instruction: content,
                  runtimeId: activeConversation.runtimeId,
                });
                await loadMessages(activeConversation.id, { force: true });
                if (!activeConversation.title && messages.length === 0) {
                  await handleUpdateConversation(activeConversation.id, {
                    title: content.slice(0, 60),
                  });
                }
                return { goalIds: result.goals.map((goal) => goal.id) };
              } catch (err) {
                console.error("Failed to send message:", err);
                setChatError(err instanceof Error ? err.message : "Failed to send message");
                throw err;
              } finally {
                setSending(false);
              }
            }}
            onReloadMessages={() => loadMessages(activeConversation.id)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Spinner className="text-muted-foreground/50" />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete()}
        description={m.delete_conversation_confirm()}
        onConfirm={handleDeleteConversation}
        confirmLabel={m.delete()}
        variant="destructive"
      />
    </div>
  );
}

interface ChatAreaProps {
  conversation: Conversation;
  messages: UIMessage[];
  sending: boolean;
  chatError: string | null;
  agents: AgentProfile[];
  runtimes: RuntimeProfile[];
  projects: Project[];
  defaultAgentId?: string;
  onUpdateConversation: (
    id: string,
    data: {
      title?: string;
      projectId?: string;
      agentId?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    },
  ) => Promise<void>;
  onSetDefaultAgent: (agentId?: string) => void;
  onSendMessage: (content: string) => Promise<{ goalIds: string[] }>;
  onReloadMessages?: () => Promise<void>;
}

function ChatArea({
  conversation,
  messages,
  sending,
  chatError,
  agents,
  runtimes,
  projects,
  defaultAgentId,
  onUpdateConversation,
  onSetDefaultAgent,
  onSendMessage,
}: ChatAreaProps) {
  const { user } = useUser();
  const [input, setInput] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [isConversationUpdating, setIsConversationUpdating] = useState(false);
  const [trackedGoalIds, setTrackedGoalIds] = useState<string[]>([]);
  const [goalSnapshots, setGoalSnapshots] = useState<GoalExecutionSnapshot[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingConversationUpdateRef = useRef<Promise<void> | null>(null);

  const { isListening, transcript, isSupported, start, stop } = useSpeechRecognition();

  const prevTranscriptRef = useRef("");
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      setInput((prev) => prev + transcript);
      prevTranscriptRef.current = transcript;
      textareaRef.current?.focus();
    }
  }, [transcript]);

  const selectedRuntime = useMemo(
    () => runtimes.find((r) => r.id === conversation.runtimeId),
    [runtimes, conversation.runtimeId],
  );
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === conversation.projectId),
    [projects, conversation.projectId],
  );
  const hasActiveExecution = useMemo(
    () => goalSnapshots.some((snapshot) => snapshot.goal.status !== "completed"),
    [goalSnapshots],
  );
  const latestClarificationQuestions = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const questions = messages[index].clarificationQuestions ?? [];
      if (questions.length > 0) {
        return questions;
      }
    }

    return [];
  }, [messages]);
  const visibleMessages = useMemo(() => {
    if (!pendingUserMessage) return messages;

    return [
      ...messages,
      {
        id: `pending-user-${conversation.id}`,
        role: "user",
        parts: [{ type: "text", text: pendingUserMessage }],
      } as UIMessage,
    ];
  }, [conversation.id, messages, pendingUserMessage]);

  const syncTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    setIsMultiLine(textarea.scrollHeight > 40);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, sending]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
    setPendingUserMessage(null);
    setTrackedGoalIds([]);
    setGoalSnapshots([]);
  }, [conversation.id]);

  useEffect(() => {
    if (trackedGoalIds.length === 0) return;

    let cancelled = false;

    const loadSnapshots = async () => {
      try {
        const snapshots = await Promise.all(
          trackedGoalIds.map(async (goalId) => {
            const [goal, states, activities] = await Promise.all([
              api.getGoal(goalId),
              api.getStates(goalId),
              api.getActivities(goalId),
            ]);

            return {
              goal,
              states,
              activities,
            } satisfies GoalExecutionSnapshot;
          }),
        );

        if (!cancelled) {
          setGoalSnapshots(snapshots);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load execution progress:", err);
        }
      }
    };

    void loadSnapshots();
    const interval = window.setInterval(() => {
      void loadSnapshots();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [trackedGoalIds]);

  useEffect(() => {
    if (!pendingUserMessage) return;
    const hasMatchedUserMessage = messages.some(
      (message) => message.role === "user" && message.parts.some((part) => part.type === "text" && part.text === pendingUserMessage),
    );

    if (hasMatchedUserMessage) {
      setPendingUserMessage(null);
    }
  }, [messages, pendingUserMessage]);

  useEffect(() => {
    syncTextareaHeight();
  }, [attachedFiles.length, conversation.id, input, syncTextareaHeight]);

  const queueConversationUpdate = useCallback(
    (data: {
      title?: string;
      projectId?: string;
      agentId?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    }) => {
      setIsConversationUpdating(true);
      const request = onUpdateConversation(conversation.id, data);
      pendingConversationUpdateRef.current = request;

      void request.finally(() => {
        if (pendingConversationUpdateRef.current === request) {
          pendingConversationUpdateRef.current = null;
          setIsConversationUpdating(false);
        }
      });

      return request;
    },
    [conversation.id, onUpdateConversation],
  );

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachedFiles.length === 0) || sending) return;

    if (pendingConversationUpdateRef.current) {
      await pendingConversationUpdateRef.current;
    }

    const content = input.trim();
    const filesToSend = [...attachedFiles];

    setInput("");
    setAttachedFiles([]);
    setPendingUserMessage(content);

    try {
      if (filesToSend.length > 0) {
        toast.info(m.multimodal_notice());
      }
      const result = await onSendMessage(content);
      setTrackedGoalIds(result.goalIds);
      if (result.goalIds.length === 0) {
        setGoalSnapshots([]);
      }
    } catch (err) {
      setPendingUserMessage(null);
      console.error("Failed to send message:", err);
      toast.error(m.send_failed());
    }
  }, [input, attachedFiles, sending, onSendMessage]);

  const handleSelectClarification = useCallback((question: string) => {
    setInput(question);
    textareaRef.current?.focus();
  }, []);

  function handleKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    // Allow Enter to send (without shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const handleTitleSubmit = useCallback(async () => {
    if (titleValue.trim()) {
      await queueConversationUpdate({ title: titleValue.trim() });
    }
    setEditingTitle(false);
  }, [queueConversationUpdate, titleValue]);

  const showWelcomeState = visibleMessages.length === 0 && !sending && !input.trim() && attachedFiles.length === 0;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-14 items-center justify-between gap-3 border-b border-border px-4">
        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSubmit();
              if (e.key === "Escape") setEditingTitle(false);
            }}
            className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-primary"
          />
        ) : (
          <button
            onClick={() => {
              setTitleValue(conversation.title || "");
              setEditingTitle(true);
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors min-w-0 flex-1 text-left"
          >
            <span className="truncate">{conversation.title || m.untitled_conversation()}</span>
            <HugeiconsIcon icon={Edit02Icon} className="size-3 shrink-0 opacity-40" />
          </button>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={conversation.projectId || "__none__"}
            onValueChange={(v) =>
              queueConversationUpdate({
                projectId: !v || v === "__none__" ? undefined : v,
              })
            }
          >
            <SelectTrigger className="h-7 w-32 cursor-default text-xs">
              {isConversationUpdating ? (
                <Spinner size="sm" name="braille" className="mr-1 shrink-0 text-muted-foreground" />
              ) : (
                <HugeiconsIcon icon={Folder01Icon} className="size-3 mr-1 shrink-0" />
              )}
              <SelectValue>
                {selectedProject?.name || "临时会话"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">临时会话</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <RuntimeSelector
            agents={agents.filter((a) => a.enabled)}
            selectedAgentId={conversation.agentId ?? undefined}
            defaultAgentId={defaultAgentId}
            onSelect={({ runtimeId, agentId }) => queueConversationUpdate({ runtimeId, agentId })}
            onSetDefault={onSetDefaultAgent}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable] px-4 md:px-6">
        <div className="mx-auto max-w-3xl py-6 space-y-3">
          {showWelcomeState && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border/50 bg-muted/30">
                <HugeiconsIcon icon={Robot02Icon} className="size-5 text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground/50">{m.creation_welcome()}</p>
              {!conversation.runtimeId && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  {m.creation_no_runtime()}
                </p>
              )}
            </div>
          )}
          {visibleMessages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} userImageUrl={user?.imageUrl} />
          ))}
          {(goalSnapshots.length > 0 || hasActiveExecution) && <ExecutionProgressCard snapshots={goalSnapshots} />}
          {sending && <ChatThinkingState />}
          {chatError && (
            <div className="flex items-center gap-2 pr-6">
              <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded bg-destructive/10 text-destructive text-[10px] font-semibold">!</span>
              <span className="text-xs text-destructive">{m.send_failed()}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area - absolute positioned */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-4 md:px-6">
        <div className="mx-auto max-w-3xl">
          {latestClarificationQuestions.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
              {latestClarificationQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => handleSelectClarification(question)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-foreground/80 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                >
                  {question}
                </button>
              ))}
            </div>
          ) : null}
          <BorderBeam
            size="md"
            theme="auto"
            colorVariant="ocean"
            strength={0.65}
            duration={2.6}
            className="rounded-xl"
          >
            <div className={cn("flex gap-1.5 rounded-xl border border-border bg-background px-3 py-2", isMultiLine ? "flex-col" : "flex-row items-center")}>
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative group rounded-md border border-border bg-muted overflow-hidden"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-12 w-12 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -right-1 -top-1 rounded-full border border-border bg-background p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:border-destructive/30 hover:bg-destructive/10"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title={m.upload()}
                className={cn("text-muted-foreground hover:text-foreground", !isMultiLine && "order-first")}
                onClick={() => fileInputRef.current?.click()}
              >
                <HugeiconsIcon icon={Upload04Icon} className="size-4" />
              </Button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  selectedRuntime ? `Message ${selectedRuntime.name}...` : m.creation_placeholder()
                }
                className={cn("resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground", isMultiLine ? "w-full" : "flex-1")}
                rows={1}
                onKeyDown={handleKeys}
                spellCheck={false}
                disabled={sending}
                style={{ maxHeight: "120px" }}
                onInput={syncTextareaHeight}
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={isListening ? m.voice_input_stop() : m.voice_input()}
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    isListening && "text-red-500 hover:text-red-600",
                  )}
                  onClick={isListening ? stop : start}
                  disabled={!isSupported}
                >
                  <HugeiconsIcon icon={isListening ? Cancel01Icon : Mic01Icon} className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  disabled={(!input.trim() && attachedFiles.length === 0) || sending || isConversationUpdating}
                  onClick={handleSend}
                >
                  {sending ? (
                    <Spinner size="sm" />
                  ) : (
                    <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </BorderBeam>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
            Enter to send · Shift+Enter for new line ·{" "}
            {selectedRuntime ? `${selectedRuntime.name}` : m.select_agent()}
          </p>
        </div>
      </div>

    </div>
  );
}

interface RuntimeSelectorProps {
  agents: AgentProfile[];
  selectedAgentId?: string;
  defaultAgentId?: string;
  onSelect: (selection: { runtimeId?: string; agentId?: string }) => void;
  onSetDefault: (agentId?: string) => void;
}

function RuntimeSelector({
  agents,
  selectedAgentId,
  defaultAgentId,
  onSelect,
  onSetDefault,
}: RuntimeSelectorProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const allItems = [
    {
      id: "none::__none__",
      name: m.no_agent(),
      runtimeId: undefined,
      agentId: undefined,
      type: "none" as const,
    },
    ...agents.map((a) => ({
      id: `agent::${a.id}`,
      name: a.name,
      runtimeId: a.runtimeId,
      agentId: a.id,
      type: "agent" as const,
    })),
  ];
  const triggerRect = triggerRef.current?.getBoundingClientRect();
  const menuLeft = triggerRect?.left ?? 0;
  const menuTop = (triggerRect?.bottom ?? 0) + 4;

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleSelect = useCallback((item: (typeof allItems)[number]) => {
    if (item.type === "none") {
      onSelect({ runtimeId: undefined, agentId: undefined });
    } else {
      onSelect({ runtimeId: item.runtimeId, agentId: item.agentId });
    }
    setOpen(false);
  }, [onSelect]);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={cancelClose}
      onMouseLeave={() => {
        if (open) {
          scheduleClose();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          cancelClose();
          setOpen((current) => !current);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex h-8 w-40 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground transition-colors outline-none hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <HugeiconsIcon icon={Robot02Icon} className="size-3 shrink-0" />
          <span className="truncate">{selectedAgent?.name || m.no_agent()}</span>
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed z-50 animate-in fade-in-0 zoom-in-95"
            style={{
              left: menuLeft,
              top: menuTop,
            }}
          >
            <div className={cn(selectContentClassName, "min-w-[160px] w-auto") }>
              {allItems.map((item) => {
                const isDefault = item.agentId !== undefined && item.agentId === defaultAgentId;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      selectItemClassName,
                      "flex items-center justify-between gap-2 whitespace-nowrap transition-colors",
                      selectedAgentId === item.agentId
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent/50",
                    )}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => handleSelect(item)}
                    >
                      {item.name}
                    </button>
                    {isDefault && (
                      <Star className="size-3 shrink-0 fill-primary text-primary" />
                    )}
                    {!isDefault && item.agentId !== undefined && (
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 text-muted-foreground/40 hover:text-primary transition-colors"
                        title={m.set_as_default()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetDefault(item.agentId);
                        }}
                      >
                        <Star className="size-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ConversationListSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-2 rounded-md px-2.5 py-2">
          <div className="size-3.5 rounded bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-28 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
