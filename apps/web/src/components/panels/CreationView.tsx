import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Archive01Icon,
  CheckmarkCircle02Icon,
  Chat01Icon,
  Clock01Icon,
  Delete02Icon,
  Edit02Icon,
  Menu01Icon,
  InformationCircleIcon,
  Robot02Icon,
  ArrowUp01Icon,
  File02Icon,
  Folder01Icon,
  Upload04Icon,
  Mic01Icon,
  Cancel01Icon,
  Alert01Icon,
  PlayCircleIcon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
} from "@hugeicons/core-free-icons";
import { type UIMessage } from "ai";
import { AppDialog } from "@/components/ui/app-dialog";
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
import { cn } from "@/lib/utils";
import { api, type Conversation, type ConversationMessage } from "@/lib/api";
import type { AgentProfile, ControlSettings, Project, RuntimeProfile } from "@/lib/types";
import { useConversationStore } from "@/lib/stores/conversation";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import type { CreationArchiveFilter } from "@/components/layout/Toolbar";
import { mapConversationMessagesToUiMessages } from "@/components/chat/ConversationFlow";

interface CreationViewProps {
  agents: AgentProfile[];
  runtimes: RuntimeProfile[];
  projects: Project[];
  archiveFilter: CreationArchiveFilter;
  onArchiveFilterChange: (filter: CreationArchiveFilter) => void;
  settings: ControlSettings | null;
  onSettingsChange: (settings: ControlSettings) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  sidebarWidth: number;
  onSidebarWidthChange: (width: number) => void;
}

const EMPTY_CONVERSATION_MESSAGES: ConversationMessage[] = [];
const PROJECT_SPEC_FILE_ACCEPT = ".md,.txt,.spec,text/plain,text/markdown";

function getProjectAgentsFilePath(project?: Project | null) {
  if (!project?.path) return null;
  return `${project.path.replace(/\/$/, "")}/AGENTS.md`;
}

const creationFilterButtons = [
  { value: "all", label: m.all(), icon: Menu01Icon, iconClassName: "text-muted-foreground/80" },
  { value: "active", label: m.creation_active(), icon: Clock01Icon, iconClassName: "text-sky-500" },
  { value: "archived", label: m.creation_archived(), icon: Archive01Icon, iconClassName: "text-amber-500" },
] as const satisfies Array<{
  value: CreationArchiveFilter;
  label: string;
  icon: typeof Menu01Icon;
  iconClassName: string;
}>;

type ConversationBoardColumnId = "in_progress" | "waiting_user" | "completed" | "error";

interface ConversationBoardCard {
  conversation: Conversation;
  title: string;
  summary: string;
  projectName?: string;
  updatedAt: string;
  column: ConversationBoardColumnId;
}

type ConversationBoardFilter = "all" | ConversationBoardColumnId;

const conversationBoardColumns: Array<{
  id: ConversationBoardColumnId;
  label: string;
  icon: typeof PlayCircleIcon;
  tone: string;
  bgAccent: string;
  borderAccent: string;
  dotColor: string;
}> = [
  {
    id: "in_progress",
    label: "进行中",
    icon: PlayCircleIcon,
    tone: "text-sky-600 dark:text-sky-400",
    bgAccent: "bg-sky-500/5 dark:bg-sky-500/10",
    borderAccent: "border-l-sky-500",
    dotColor: "bg-sky-500",
  },
  {
    id: "waiting_user",
    label: "需要干预",
    icon: InformationCircleIcon,
    tone: "text-violet-600 dark:text-violet-400",
    bgAccent: "bg-violet-500/5 dark:bg-violet-500/10",
    borderAccent: "border-l-violet-500",
    dotColor: "bg-violet-500",
  },
  {
    id: "completed",
    label: "已完成",
    icon: CheckmarkCircle02Icon,
    tone: "text-emerald-600 dark:text-emerald-400",
    bgAccent: "bg-emerald-500/5 dark:bg-emerald-500/10",
    borderAccent: "border-l-emerald-500",
    dotColor: "bg-emerald-500",
  },
  {
    id: "error",
    label: "错误",
    icon: Alert01Icon,
    tone: "text-red-500 dark:text-red-400",
    bgAccent: "bg-red-500/5 dark:bg-red-500/10",
    borderAccent: "border-l-red-500",
    dotColor: "bg-red-500",
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
  if (pendingConversationId === conversation.id) return "in_progress";

  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const hasUserMessage = messages.some((message) => message.role === "user");

  if (lastAssistantMessage?.error || lastAssistantMessage?.trace?.some((item) => item.kind === "tool" && !!item.errorText)) {
    return "error";
  }

  if ((lastAssistantMessage?.clarificationQuestions?.length ?? 0) > 0) {
    return "waiting_user";
  }

  if (conversation.archived) {
    return "completed";
  }

  if (!hasUserMessage) {
    return "in_progress";
  }

  if (lastAssistantMessage) {
    return "completed";
  }

  return "in_progress";
}

export function CreationView({
  agents,
  runtimes,
  projects,
  archiveFilter,
  onArchiveFilterChange,
  settings,
  onSettingsChange,
  sidebarCollapsed,
  onToggleSidebar,
  sidebarWidth,
  onSidebarWidthChange,
}: CreationViewProps) {
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
    setConversationPending,
    setConversationFlowDraft,
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

  const handleSidebarResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
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
  }, [onSidebarWidthChange]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      {!sidebarCollapsed && (
        <div
          className="relative flex h-full shrink-0 border-r border-border bg-background"
          style={{ width: Math.min(sidebarWidth, 288), maxWidth: "18rem" }}
        >
          <div className="flex h-full min-w-0 flex-1 flex-col">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <h2 className="text-sm font-semibold text-foreground">{m.creation()}</h2>
              <div className="flex items-center gap-1">
                <Button size="icon-sm" variant="ghost" onClick={handleNewConversation}>
                  <HugeiconsIcon icon={Add01Icon} className="size-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="w-full space-y-0.5 p-1.5">
                {!hasLoadedConversations ? (
                  <ConversationListSkeleton />
                ) : (
                  <>
                    {filteredConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={cn(
                          "group flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                          activeConversationId === conv.id
                            ? "bg-accent font-medium text-accent-foreground"
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
                            "shrink-0 rounded p-1 text-muted-foreground transition-opacity hover:bg-muted",
                            conv.archived || conv.deleted ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                          )}
                          title={conv.deleted || conv.archived ? m.restore_conversation() : m.archive()}
                          type="button"
                        >
                          {conv.archived || conv.deleted ? <ArchiveRestore className="size-3" /> : <ArchiveX className="size-3" />}
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
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          title={conv.deleted ? m.delete_forever() : m.delete()}
                          type="button"
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                        </button>
                      </div>
                    ))}
                    {filteredConversations.length === 0 && (
                      <div className="py-6 text-center">
                        <HugeiconsIcon icon={Chat01Icon} className="mx-auto mb-1.5 size-5 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">{m.no_conversations()}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-center gap-1 px-2 py-2.5">
              {creationFilterButtons.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => onArchiveFilterChange(filter.value)}
                  aria-pressed={archiveFilter === filter.value}
                  title={filter.label}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-md transition-colors",
                    archiveFilter === filter.value
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <HugeiconsIcon icon={filter.icon} className={cn("size-3.5", filter.iconClassName)} />
                </button>
              ))}
            </div>
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize conversation list"
            onPointerDown={handleSidebarResizeStart}
            className="absolute top-0 right-[-4px] z-10 h-full w-2 cursor-col-resize rounded-full transition-colors hover:bg-primary/15"
          />
        </div>
      )}

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
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={onToggleSidebar}
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
              setConversationPending(activeConversation.id);
              setConversationFlowDraft(activeConversation.id, {
                id: `draft-${activeConversation.id}`,
                role: "assistant",
                content: "",
                trace: [
                  {
                    kind: "thought",
                    text: "正在分析当前项目上下文并拆解执行任务。",
                  },
                  {
                    kind: "tool",
                    toolName: "dispatch_command",
                    toolCallId: `dispatch-${activeConversation.id}`,
                    state: "input-streaming",
                    input: {
                      instruction: content,
                      runtimeId: activeConversation.runtimeId,
                    },
                  },
                ],
              });
              try {
                const result = await api.createGoalsFromConversation(activeConversation.id, {
                  instruction: content,
                  runtimeId: activeConversation.runtimeId,
                });
                setConversationFlowDraft(activeConversation.id, {
                  id: `draft-${activeConversation.id}`,
                  role: "assistant",
                  content: result.needsClarification
                    ? "需要更多信息后才能继续执行。"
                    : result.goals.length > 0
                      ? `已创建 ${result.goals.length} 个任务，右侧 Current Thread 将继续跟踪执行进度。`
                      : "命令已提交，等待后续执行结果。",
                  trace: [
                    {
                      kind: "thought",
                      text: result.needsClarification
                        ? "当前信息不足，先向用户澄清缺失上下文。"
                        : "已完成需求解析，并生成可执行任务。",
                    },
                    {
                      kind: "tool",
                      toolName: "dispatch_command",
                      toolCallId: `dispatch-${activeConversation.id}`,
                      state: "output-available",
                      input: {
                        instruction: content,
                        runtimeId: activeConversation.runtimeId,
                      },
                      output: {
                        commandId: result.command.id,
                        status: result.command.status,
                        goalsCreated: result.goals.length,
                        clarificationQuestions: result.questions,
                      },
                    },
                  ],
                });
                await loadMessages(activeConversation.id, { force: true });
                if (!activeConversation.title && messages.length === 0) {
                  await handleUpdateConversation(activeConversation.id, {
                    title: content.slice(0, 60),
                  });
                }
                return;
              } catch (err) {
                setConversationFlowDraft(activeConversation.id, {
                  id: `draft-${activeConversation.id}`,
                  role: "assistant",
                  content: err instanceof Error ? err.message : "Failed to send message",
                  trace: [
                    {
                      kind: "thought",
                      text: "执行过程中出现错误，未能完成任务分派。",
                    },
                    {
                      kind: "tool",
                      toolName: "dispatch_command",
                      toolCallId: `dispatch-${activeConversation.id}`,
                      state: "output-error",
                      input: {
                        instruction: content,
                        runtimeId: activeConversation.runtimeId,
                      },
                      errorText: err instanceof Error ? err.message : "Failed to send message",
                    },
                  ],
                });
                console.error("Failed to send message:", err);
                setChatError(err instanceof Error ? err.message : "Failed to send message");
                throw err;
              } finally {
                setConversationPending(null);
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
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
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
  onSendMessage: (content: string) => Promise<void>;
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
  sidebarCollapsed,
  onToggleSidebar,
  onUpdateConversation,
  onSetDefaultAgent,
  onSendMessage,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isConversationUpdating, setIsConversationUpdating] = useState(false);
  const [specDialogOpen, setSpecDialogOpen] = useState(false);
  const [projectSpec, setProjectSpec] = useState("");
  const [projectSpecDraft, setProjectSpecDraft] = useState("");
  const [projectSpecLoading, setProjectSpecLoading] = useState(false);
  const [projectSpecSaving, setProjectSpecSaving] = useState(false);
  const [boardFilter, setBoardFilter] = useState<ConversationBoardFilter>("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const specFileInputRef = useRef<HTMLInputElement>(null);
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
  const { conversations, activeConversationId, pendingConversationId, messagesByConversationId, setActiveConversationId } =
    useConversationStore();
  const projectAgentsFilePath = useMemo(() => getProjectAgentsFilePath(selectedProject), [selectedProject]);
  const hasProjectSpec = projectSpec.trim().length > 0;
  const boardCards = useMemo<ConversationBoardCard[]>(() => {
    return conversations
      .filter((item) => !item.deleted && !item.archived)
      .map((item) => {
        const itemMessages = messagesByConversationId[item.id] ?? EMPTY_CONVERSATION_MESSAGES;
        const firstUserMessage = itemMessages.find((message) => message.role === "user")?.content?.trim() ?? "";
        const projectName = projects.find((project) => project.id === item.projectId)?.name;

        return {
          conversation: item,
          title: item.title || firstUserMessage || m.untitled_conversation(),
          summary: firstUserMessage || "等待输入需求后开始执行",
          projectName,
          updatedAt: item.updatedAt,
          column: resolveConversationBoardColumn(item, itemMessages, pendingConversationId),
        };
      })
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [conversations, messagesByConversationId, pendingConversationId, projects]);
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
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const hasImage = Array.from(files).some((file) => file.type.startsWith("image/"));
    if (hasImage) {
      toast.error('当前模型不支持图片输入，请直接发送文字说明。');
    }

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
  }, [conversation.id]);

  useEffect(() => {
    let cancelled = false;

    if (!projectAgentsFilePath) {
      setProjectSpec("");
      setProjectSpecDraft("");
      setProjectSpecLoading(false);
      return;
    }

    const loadProjectAgentsFile = async () => {
      setProjectSpecLoading(true);

      try {
        const file = await api.readWorkspaceFile(projectAgentsFilePath);
        if (cancelled) return;

        const content = file.content ?? "";
        setProjectSpec(content);
        setProjectSpecDraft(content);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load AGENTS.md:", err);
        setProjectSpec("");
        setProjectSpecDraft("");
      } finally {
        if (!cancelled) {
          setProjectSpecLoading(false);
        }
      }
    };

    void loadProjectAgentsFile();

    return () => {
      cancelled = true;
    };
  }, [projectAgentsFilePath]);

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
        toast.error('当前模型不支持图片输入，请移除图片后重试。');
        setPendingUserMessage(null);
        return;
      }
      await onSendMessage(content);
    } catch (err) {
      setPendingUserMessage(null);
      console.error("Failed to send message:", err);
      toast.error(m.send_failed());
    }
  }, [input, attachedFiles, sending, onSendMessage]);

  const handleOpenSpecDialog = useCallback(() => {
    if (!selectedProject || !projectAgentsFilePath) {
      toast.info("请先给当前会话选择一个项目，再编辑项目指令。");
      return;
    }

    setProjectSpecDraft(projectSpec);
    setSpecDialogOpen(true);
  }, [projectAgentsFilePath, projectSpec, selectedProject]);

  const handleSaveSpec = useCallback(async () => {
    if (!projectAgentsFilePath) return;

    setProjectSpecSaving(true);

    try {
      await api.writeWorkspaceFile(projectAgentsFilePath, projectSpecDraft);
      setProjectSpec(projectSpecDraft);
      setSpecDialogOpen(false);
      toast.success("项目指令已保存到 AGENTS.md");
    } catch (err) {
      console.error("Failed to save AGENTS.md:", err);
      toast.error("项目指令保存失败");
    } finally {
      setProjectSpecSaving(false);
    }
  }, [projectAgentsFilePath, projectSpecDraft]);

  const handleImportSpecFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setProjectSpecDraft(content);
      toast.success(`已导入 ${file.name}，保存后会覆盖项目 AGENTS.md`);
    } catch (err) {
      console.error("Failed to import AGENTS.md source file:", err);
      toast.error("AGENTS.md 源文件导入失败");
    } finally {
      event.target.value = "";
    }
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

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-14 items-center justify-between gap-3 border-b border-border px-4">
        <Button size="icon-sm" variant="ghost" onClick={onToggleSidebar} title={sidebarCollapsed ? m.expand_sidebar() : m.collapse_sidebar()}>
          <HugeiconsIcon icon={sidebarCollapsed ? SidebarRight01Icon : SidebarLeft01Icon} className="size-4" />
        </Button>
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
          <input
            ref={specFileInputRef}
            type="file"
            accept={PROJECT_SPEC_FILE_ACCEPT}
            className="hidden"
            onChange={handleImportSpecFile}
          />
          <Button
            type="button"
            variant={hasProjectSpec ? "outline" : "ghost"}
            size="icon-sm"
            title={selectedProject ? `${selectedProject.name} Project Instructions` : "Project Instructions"}
            className={cn(
              "shrink-0",
              hasProjectSpec && "border-sky-500/30 bg-sky-500/5 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300",
            )}
            onClick={handleOpenSpecDialog}
          >
            <HugeiconsIcon icon={File02Icon} className="size-4" />
          </Button>
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

      <div className="shrink-0 bg-background px-4 py-4 md:px-6">
        <div className="mx-auto max-w-3xl">
          <BorderBeam
            size="md"
            theme="auto"
            colorVariant="ocean"
            strength={0.65}
            duration={2.6}
            className="rounded-xl"
          >
            <div className="flex min-h-16 flex-col gap-2 rounded-xl border border-border bg-background px-3 py-3">
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
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedRuntime ? `Message ${selectedRuntime.name}...` : m.creation_placeholder()}
                className="min-h-[40px] w-full resize-none bg-transparent py-1 text-sm leading-6 outline-none placeholder:text-muted-foreground"
                rows={1}
                onKeyDown={handleKeys}
                spellCheck={false}
                disabled={sending}
                style={{ maxHeight: "120px" }}
                onInput={syncTextareaHeight}
              />
              <div className="flex items-center justify-between gap-2 pt-2">
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
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <HugeiconsIcon icon={Upload04Icon} className="size-4" />
                </Button>
                <div className="flex shrink-0 items-center gap-1">
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
            </div>
          </BorderBeam>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable] px-4 md:px-6">
        <div className="mx-auto max-w-6xl py-6 space-y-6">
          <div className="max-w-3xl space-y-3">
          {selectedProject && hasProjectSpec ? (
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-xs text-sky-900 dark:text-sky-100">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{selectedProject.name} 的项目指令已启用</div>
                  <div className="mt-1 line-clamp-2 text-sky-800/80 dark:text-sky-100/70">{projectSpec}</div>
                </div>
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={handleOpenSpecDialog}>
                  编辑
                </Button>
              </div>
            </div>
          ) : null}
          {chatError && (
            <div className="flex items-center gap-2 pr-6">
              <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded bg-destructive/10 text-destructive text-[10px] font-semibold">!</span>
              <span className="text-xs text-destructive">{m.send_failed()}</span>
            </div>
          )}
          </div>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 px-1">
              <button
                type="button"
                onClick={() => setBoardFilter("all")}
                aria-pressed={boardFilter === "all"}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                  boardFilter === "all"
                    ? "border-border bg-foreground text-background"
                    : "border-border/50 bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <HugeiconsIcon icon={Menu01Icon} className="size-3.5" />
                全部
                <span className="rounded-full bg-background/15 px-1.5 py-0.5 text-[10px] tabular-nums text-inherit">
                  {boardCards.length}
                </span>
              </button>

              {conversationBoardColumns.map((column) => {
                const count = boardCards.filter((card) => card.column === column.id).length;

                return (
                  <button
                    key={column.id}
                    type="button"
                    onClick={() => setBoardFilter(column.id)}
                    aria-pressed={boardFilter === column.id}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                      boardFilter === column.id
                        ? cn("border-transparent", column.bgAccent, column.tone)
                        : "border-border/50 bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={column.icon} className={cn("size-3.5", boardFilter === column.id ? column.tone : "")} />
                    {column.label}
                    <span className="rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px] tabular-nums text-inherit">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              className={cn(
                "grid gap-4",
                conversationBoardColumns.filter((column) => boardFilter === "all" || column.id === boardFilter).length === 1
                  ? "xl:grid-cols-1"
                  : "xl:grid-cols-4",
              )}
            >
              {conversationBoardColumns
                .filter((column) => boardFilter === "all" || column.id === boardFilter)
                .map((column) => {
                const columnCards = boardCards.filter((card) => card.column === column.id);

                return (
                  <div
                    key={column.id}
                    className={cn(
                      "flex min-h-[280px] flex-col rounded-xl border border-border/40 bg-muted/20",
                      column.bgAccent,
                    )}
                  >
                    <div className="flex items-center gap-2.5 border-b border-border/30 px-4 py-3">
                      <div className={cn("size-1.5 rounded-full", column.dotColor)} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                        {column.label}
                      </span>
                      <span
                        className={cn(
                          "ml-auto inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                          columnCards.length > 0 ? cn(column.tone, "bg-foreground/5") : "bg-foreground/3 text-muted-foreground/50",
                        )}
                      >
                        {columnCards.length}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2.5 p-3">
                      {columnCards.map((card) => (
                        <button
                          key={card.conversation.id}
                          type="button"
                          onClick={() => setActiveConversationId(card.conversation.id)}
                          className={cn(
                            "group/card w-full rounded-lg border border-border/30 bg-background/80 px-3.5 py-3 text-left shadow-[0_1px_2px_0_rgba(0,0,0,0.03)] transition-all",
                            "hover:border-border hover:bg-background hover:shadow-[0_2px_8px_0_rgba(0,0,0,0.06)] border-l-2",
                            column.borderAccent,
                            activeConversationId === card.conversation.id && "ring-1 ring-primary/30",
                          )}
                        >
                          <div className="mb-1.5 text-sm font-medium leading-snug text-foreground/90 group-hover/card:text-foreground">
                            {card.title}
                          </div>

                          <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            <HugeiconsIcon icon={Folder01Icon} className="size-2.5 text-amber-500/70" />
                            {card.projectName || "临时会话"}
                          </div>

                          <p className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/70">
                            {card.summary}
                          </p>

                          <div className="flex items-center justify-between gap-2 border-t border-border/20 pt-2 mt-1">
                            <span className="text-[10px] tabular-nums text-muted-foreground/50">
                              {formatConversationTime(card.updatedAt)}
                            </span>
                            {activeConversationId === card.conversation.id ? (
                              <span className="text-[10px] text-primary/70">当前查看</span>
                            ) : null}
                          </div>
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

          <div ref={messagesEndRef} />
        </div>
      </div>

      <AppDialog
        open={specDialogOpen}
        onOpenChange={setSpecDialogOpen}
        title={selectedProject ? `${selectedProject.name} / Project Instructions` : "Project Instructions"}
        description="直接编辑当前项目目录下的 AGENTS.md。这份文件作为项目长期说明和对外兼容指令，不再等同于动态 Rules。"
        size="xl"
        bodyClassName="space-y-4"
        footer={(
          <>
            <Button type="button" variant="outline" onClick={() => setSpecDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" variant="outline" onClick={() => setProjectSpecDraft("")}>
              清空
            </Button>
            <Button type="button" onClick={() => void handleSaveSpec()} disabled={!projectAgentsFilePath || projectSpecSaving}>
              {projectSpecSaving ? "保存中..." : "保存项目指令"}
            </Button>
          </>
        )}
      >
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">Project Instructions</div>
            <div className="text-xs text-muted-foreground">支持导入 `.md`、`.txt`、`.spec` 文档，保存时会直接覆盖项目目录里的 `AGENTS.md`。</div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => specFileInputRef.current?.click()} disabled={!projectAgentsFilePath}>
            导入文件
          </Button>
        </div>

        {projectAgentsFilePath ? (
          <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            文件路径: {projectAgentsFilePath}
          </div>
        ) : null}

        {projectSpecLoading ? (
          <div className="rounded-lg border border-border bg-background px-3 py-8 text-center text-sm text-muted-foreground">
            正在加载 AGENTS.md...
          </div>
        ) : null}

        <textarea
          value={projectSpecDraft}
          onChange={(event) => setProjectSpecDraft(event.target.value)}
          placeholder={[
            "在这里写项目长期指令，例如：",
            "- 技术栈和目录约束",
            "- 代码风格和命名规范",
            "- 哪些文件不能改",
            "- 提交、测试、验证要求",
            "- Agent 处理该项目时必须遵守的规则",
          ].join("\n")}
          className="min-h-[420px] w-full resize-none rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          spellCheck={false}
          disabled={projectSpecLoading}
        />
      </AppDialog>

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
  const safeAgents = Array.isArray(agents) ? agents : [];
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedAgent = safeAgents.find((a) => a.id === selectedAgentId);

  const allItems = [
    {
      id: "none::__none__",
      name: m.no_agent(),
      runtimeId: undefined,
      agentId: undefined,
      type: "none" as const,
    },
    ...safeAgents.map((a) => ({
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
