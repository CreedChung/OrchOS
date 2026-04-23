import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Archive01Icon,
  Chat01Icon,
  Clock01Icon,
  Delete02Icon,
  Edit02Icon,
  Menu01Icon,
  Robot02Icon,
  ArrowUp01Icon,
  Folder01Icon,
  Upload04Icon,
  Mic01Icon,
  Cancel01Icon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
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
import { cn } from "@/lib/utils";
import { api, type Conversation, type ConversationMessage, type Goal } from "@/lib/api";
import type { AgentProfile, ControlSettings, Project, RuntimeProfile } from "@/lib/types";
import { useConversationStore } from "@/lib/stores/conversation";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import type { CreationArchiveFilter } from "@/components/layout/Toolbar";
import { ChatThinkingState } from "@/components/chat/ChatThinkingState";
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
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 200), 480);
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
        <div className="relative flex h-full shrink-0 border-r border-border bg-background" style={{ width: sidebarWidth }}>
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
              <div className="space-y-0.5 p-1.5">
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
            goals={goals}
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
                return { goals: result.goals };
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
  goals: Goal[];
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
  onSendMessage: (content: string) => Promise<{ goals: Goal[] }>;
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
  goals,
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
  const [createdGoals, setCreatedGoals] = useState<Goal[]>([]);
  const [isConversationUpdating, setIsConversationUpdating] = useState(false);
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
  const latestClarificationQuestions = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const questions = messages[index].clarificationQuestions ?? [];
      if (questions.length > 0) {
        return questions;
      }
    }

    return [];
  }, [messages]);
  const visibleGoalCards = useMemo(() => {
    if (createdGoals.length > 0) {
      return createdGoals;
    }

    if (!conversation.projectId) {
      return [];
    }

    return goals
      .filter((goal) => goal.projectId === conversation.projectId && goal.status === "active")
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 6);
  }, [conversation.projectId, createdGoals, goals]);
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
    setCreatedGoals([]);
  }, [conversation.id]);

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
      setCreatedGoals(result.goals);
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
            <div className="flex min-h-14 flex-col gap-2 rounded-xl border border-border bg-background px-3 py-3">
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
                className="min-h-[32px] w-full resize-none bg-transparent py-1 text-sm leading-6 outline-none placeholder:text-muted-foreground"
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
        <div className="mx-auto max-w-3xl py-6 space-y-3">
          {visibleGoalCards.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                  当前任务
                </div>
                <div className="h-px flex-1 bg-border/50" />
                <div className="text-[10px] text-muted-foreground/50">{visibleGoalCards.length} items</div>
              </div>
              <div className="grid gap-3">
                {visibleGoalCards.map((goal, index) => (
                  <div key={goal.id} className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium text-foreground">{goal.title}</div>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            {goal.status}
                          </span>
                        </div>
                        {goal.description ? (
                          <div className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                            {goal.description}
                          </div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/70">
                          {goal.projectId ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                              <HugeiconsIcon icon={Folder01Icon} className="size-3" />
                              {selectedProject?.name || "项目任务"}
                            </span>
                          ) : null}
                          <span>{new Date(goal.updatedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
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
