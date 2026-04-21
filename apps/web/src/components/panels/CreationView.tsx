import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Chat01Icon,
  Delete02Icon,
  Edit02Icon,
  Loading01Icon,
  Robot02Icon,
  ArrowUp01Icon,
  Folder01Icon,
  Upload04Icon,
  Mic01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "border-beam";
import { ArchiveRestore, ArchiveX, Star } from "lucide-react";
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
import { m } from "@/paraglide/messages";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import type { CreationArchiveFilter } from "@/components/layout/Toolbar";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import { ChatMessageShell } from "@/components/chat/ChatMessageShell";
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



function MessageBubble({ msg }: { msg: UIMessage }) {
  const isUser = msg.role === "user";
  const metadata = (msg.metadata ?? {}) as { responseTime?: number; error?: string };
  const isError = Boolean(metadata.error);

  return (
    <ChatMessageShell role={msg.role} isError={isError} responseTime={metadata.responseTime}>
      {msg.parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <div
              key={`${msg.id}-${index}`}
              className={cn(
                "rounded-[1.35rem] border px-4 py-3",
                isUser ? "border-primary/12 bg-background/60" : "border-border/60 bg-background/72",
              )}
            >
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
              stepNumber={index + 1}
            />
          );
        }

        return null;
      })}
    </ChatMessageShell>
  );
}

function mapConversationMessagesToUiMessages(messages: ConversationMessage[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    metadata: {
      responseTime: message.responseTime,
      error: message.error,
      createdAt: message.createdAt,
    },
    parts: message.content
      ? [
          {
            type: "text",
            text: message.content,
          },
        ]
      : [],
  }));
}

export function CreationView({ agents, runtimes, projects, archiveFilter, settings, onSettingsChange }: CreationViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const [hasLoadedConversations, setHasLoadedConversations] = useState(false);
  const autoCreatingConversationRef = useRef(false);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [],
  );
  const {
    messages: chatMessages,
    setMessages: setChatMessages,
    sendMessage,
    status: chatStatus,
    error: chatError,
  } = useChat({ transport });

  const enabledRuntimes = useMemo(() => runtimes.filter((r) => r.enabled), [runtimes]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const filteredConversations = useMemo(() => {
    if (archiveFilter === "archived") return conversations.filter((c) => c.archived && !c.deleted);
    if (archiveFilter === "active") return conversations.filter((c) => !c.archived && !c.deleted);
    return conversations.filter((c) => !c.deleted);
  }, [archiveFilter, conversations]);

  const loadConversations = useCallback(async () => {
    try {
      const list = await api.listConversations();
      setConversations(list);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setHasLoadedConversations(true);
    }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const msgs = await api.getConversationMessages(convId);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    setChatMessages(mapConversationMessagesToUiMessages(messages));
  }, [messages, setChatMessages]);

  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await api.createConversation({
        runtimeId: settings?.defaultRuntimeId || undefined,
      });
      await loadConversations();
      setActiveConversationId(conv.id);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [loadConversations, settings?.defaultRuntimeId]);

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
  ]);

  const handleDeleteConversation = useCallback(async () => {
    if (!convToDelete) return;
    try {
      await api.deleteConversation(convToDelete);
      if (activeConversationId === convToDelete) {
        setActiveConversationId(null);
        setMessages([]);
      }
      setConvToDelete(null);
      await loadConversations();
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }, [convToDelete, activeConversationId, loadConversations]);

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
        await api.updateConversation(id, data);
        await loadConversations();
      } catch (err) {
        console.error("Failed to update conversation:", err);
      }
    },
    [loadConversations],
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
                          void api
                            .deleteConversation(conv.id, { permanent: true })
                            .then(() => loadConversations())
                            .catch((err) => {
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
            messages={chatMessages}
            status={chatStatus}
            chatError={chatError}
            agents={agents}
            runtimes={enabledRuntimes}
            projects={projects}
            defaultRuntimeId={settings?.defaultRuntimeId}
            onUpdateConversation={handleUpdateConversation}
            onSetDefaultRuntime={(runtimeId) => {
              void api.updateSettings({ defaultRuntimeId: runtimeId }).then((updated) => {
                onSettingsChange(updated);
              });
            }}
            onSendMessage={async (content) => {
              await sendMessage(
                { text: content },
                {
                  body: {
                    conversationId: activeConversation.id,
                  },
                },
              );
              await loadMessages(activeConversation.id);
              // Update conversation title if first message
              if (!activeConversation.title && messages.length === 0) {
                await handleUpdateConversation(activeConversation.id, {
                  title: content.slice(0, 60),
                });
              }
            }}
            onReloadMessages={() => loadMessages(activeConversation.id)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <HugeiconsIcon
              icon={Loading01Icon}
              className="size-5 animate-spin text-muted-foreground/50"
            />
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
  status: "submitted" | "streaming" | "ready" | "error";
  chatError?: Error;
  agents: AgentProfile[];
  runtimes: RuntimeProfile[];
  projects: Project[];
  defaultRuntimeId?: string;
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
  onSetDefaultRuntime: (runtimeId?: string) => void;
  onSendMessage: (content: string) => Promise<void>;
  onReloadMessages?: () => Promise<void>;
}

function ChatArea({
  conversation,
  messages,
  status,
  chatError,
  agents,
  runtimes,
  projects,
  defaultRuntimeId,
  onUpdateConversation,
  onSetDefaultRuntime,
  onSendMessage,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isListening, transcript, isSupported, start, stop } = useSpeechRecognition();
  const sending = status === "submitted" || status === "streaming";

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
  }, [messages]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversation.id]);

  useEffect(() => {
    syncTextareaHeight();
  }, [attachedFiles.length, conversation.id, input, syncTextareaHeight]);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachedFiles.length === 0) || sending) return;

    const content = input.trim();
    const filesToSend = [...attachedFiles];

    setInput("");
    setAttachedFiles([]);

    try {
      if (filesToSend.length > 0) {
        toast.info(m.multimodal_notice());
      }
      await onSendMessage(content);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error(m.send_failed());
    }
  }, [input, attachedFiles, sending, onSendMessage]);

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
      await onUpdateConversation(conversation.id, { title: titleValue.trim() });
    }
    setEditingTitle(false);
  }, [titleValue, conversation.id, onUpdateConversation]);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-14 items-center justify-between gap-3 border-b border-border px-4">
        {/* Title */}
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
          {/* Project selector */}
          <Select
            value={conversation.projectId || "__none__"}
            onValueChange={(v) =>
              onUpdateConversation(conversation.id, {
                projectId: !v || v === "__none__" ? undefined : v,
              })
            }
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <HugeiconsIcon icon={Folder01Icon} className="size-3 mr-1 shrink-0" />
              <SelectValue>
                {projects.find((p) => p.id === conversation.projectId)?.name || m.no_project()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{m.no_project()}</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Agent/Runtime selector with hover popover */}
          <RuntimeSelector
            runtimes={runtimes}
            agents={agents.filter((a) => a.enabled)}
            selectedId={conversation.runtimeId ?? undefined}
            defaultRuntimeId={defaultRuntimeId}
            onSelect={(runtimeId) => onUpdateConversation(conversation.id, { runtimeId })}
            onSetDefault={onSetDefaultRuntime}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <HugeiconsIcon icon={Robot02Icon} className="size-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{m.creation_welcome()}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{m.creation_welcome_desc()}</p>
              </div>
              {!conversation.runtimeId && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {m.creation_no_runtime()}
                </p>
              )}
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {sending && <ChatThinkingState />}
          {chatError && (
            <div className="mr-10 rounded-[1.5rem] border border-destructive/20 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive shadow-sm">
              {m.send_failed()}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area - absolute positioned */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-4 md:px-6">
        <div className="mx-auto max-w-3xl">
          <BorderBeam
            size="md"
            theme="auto"
            colorVariant="ocean"
            strength={0.65}
            duration={2.6}
            className="rounded-xl"
          >
            <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-background px-3 py-2">
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
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  selectedRuntime ? `Message ${selectedRuntime.name}...` : m.creation_placeholder()
                }
                className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                rows={1}
                onKeyDown={handleKeys}
                spellCheck={false}
                disabled={sending}
                style={{ maxHeight: "120px" }}
                onInput={syncTextareaHeight}
              />
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={m.upload()}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <HugeiconsIcon icon={Upload04Icon} className="size-4" />
                </Button>
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
                    disabled={(!input.trim() && attachedFiles.length === 0) || sending}
                    onClick={handleSend}
                  >
                    {sending ? (
                      <HugeiconsIcon icon={Loading01Icon} className="size-3.5 animate-spin" />
                    ) : (
                      <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                    )}
                  </Button>
                </div>
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
  runtimes: RuntimeProfile[];
  agents: AgentProfile[];
  selectedId?: string;
  defaultRuntimeId?: string;
  onSelect: (runtimeId?: string) => void;
  onSetDefault: (runtimeId?: string) => void;
}

function RuntimeSelector({ runtimes, agents, selectedId, defaultRuntimeId, onSelect, onSetDefault }: RuntimeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [modelsByRuntimeId, setModelsByRuntimeId] = useState<Record<string, string[]>>({});
  const [loadingRuntimeId, setLoadingRuntimeId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectedRuntime = runtimes.find((r) => r.id === selectedId);
  const selectedAgent = agents.find((a) => (a.runtimeId || a.id) === selectedId);
  const selectedModel = selectedRuntime?.model || selectedAgent?.model;

  const allItems = [
    {
      id: "none::__none__",
      value: "__none__",
      name: m.no_agent(),
      model: null,
      runtimeId: undefined,
      type: "none" as const,
    },
    ...runtimes.map((r) => ({
      id: `runtime::${r.id}`,
      value: r.id,
      name: r.name,
      model: r.model,
      runtimeId: r.id,
      type: "runtime" as const,
    })),
    ...agents.map((a) => ({
      id: `agent::${a.id}`,
      value: a.runtimeId || a.id,
      name: a.name,
      model: a.model,
      runtimeId: a.runtimeId,
      type: "agent" as const,
    })),
  ];

  const hoveredItem = allItems.find((item) => item.id === hoveredId);
  const hoveredRuntimeId =
    hoveredItem?.type === "runtime"
      ? hoveredItem.runtimeId
      : hoveredItem?.type === "agent"
        ? hoveredItem.runtimeId
        : undefined;
  const hoveredRuntime = hoveredRuntimeId ? runtimes.find((item) => item.id === hoveredRuntimeId) : undefined;
  const activeHoveredModel = hoveredRuntime?.currentModel || hoveredRuntime?.model || hoveredItem?.model;
  const fallbackHoveredModels = hoveredItem?.model ? [hoveredItem.model] : [];
  const hoveredModels = hoveredRuntimeId
    ? (modelsByRuntimeId[hoveredRuntimeId]?.length
        ? modelsByRuntimeId[hoveredRuntimeId]
        : fallbackHoveredModels)
    : fallbackHoveredModels;
  const triggerRect = triggerRef.current?.getBoundingClientRect();
  const hoveredItemRect = hoveredId ? itemRefs.current[hoveredId]?.getBoundingClientRect() : undefined;
  const menuLeft = triggerRect?.left ?? 0;
  const menuTop = (triggerRect?.bottom ?? 0) + 4;
  const submenuGap = 8;
  const submenuPanelPadding = 4;
  const submenuTop = (hoveredItemRect?.top ?? menuTop) - submenuPanelPadding;
  const submenuLeft = (hoveredItemRect?.left ?? menuLeft) - submenuGap;

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
      setHoveredId(null);
    }, 150);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  useEffect(() => {
    if (!open || !hoveredRuntimeId || modelsByRuntimeId[hoveredRuntimeId]) {
      return;
    }

    let cancelled = false;
    const runtime = runtimes.find((item) => item.id === hoveredRuntimeId);
    const fallbackModel = runtime?.currentModel || runtime?.model || hoveredItem?.model;

    setLoadingRuntimeId(hoveredRuntimeId);

    void api
      .listRuntimeModels(hoveredRuntimeId)
      .then((result) => {
        if (cancelled) return;

        const models = result.models.length > 0 ? result.models : fallbackModel ? [fallbackModel] : [];
        setModelsByRuntimeId((current) => ({
          ...current,
          [hoveredRuntimeId]: models,
        }));
      })
      .catch(() => {
        if (cancelled) return;

        setModelsByRuntimeId((current) => ({
          ...current,
          [hoveredRuntimeId]: fallbackModel ? [fallbackModel] : [],
        }));
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingRuntimeId((current) => (current === hoveredRuntimeId ? null : current));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hoveredItem?.model, hoveredRuntimeId, modelsByRuntimeId, open, runtimes]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setHoveredId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleSelect = useCallback((value: string) => {
    onSelect(value === "__none__" ? undefined : value);
    setOpen(false);
    setHoveredId(null);
  }, [onSelect]);

  const handleItemHover = useCallback((id: string | null) => {
    cancelClose();
    setHoveredId(id);
  }, [cancelClose]);

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
          <span className="truncate">{selectedModel?.replace(/^(cloud|local)\//, "") || m.no_agent()}</span>
        </span>
      </button>

      {open && (
        <>
          {hoveredItem && (hoveredModels.length > 0 || loadingRuntimeId === hoveredRuntimeId) && (
            <div
              className="fixed z-50 animate-in fade-in-0 zoom-in-95"
              style={{
                left: submenuLeft,
                top: submenuTop,
                transform: "translateX(-100%)",
              }}
            >
              <div className={cn(selectContentClassName, "min-w-[160px] w-auto") }>
                {hoveredModels.map((model) => (
                  <div
                    key={model}
                    className={cn(
                      selectItemClassName,
                      "whitespace-nowrap transition-colors",
                      model === activeHoveredModel
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                    )}
                  >
                    {model.replace(/^(cloud|local)\//, "")}
                  </div>
                ))}
                {loadingRuntimeId === hoveredRuntimeId && hoveredModels.length === 0 && (
                  <div className={cn(selectItemClassName, "whitespace-nowrap text-muted-foreground") }>
                    {m.loading()}
                  </div>
                )}
              </div>
            </div>
          )}
          <div
            className="fixed z-50 animate-in fade-in-0 zoom-in-95"
            style={{
              left: menuLeft,
              top: menuTop,
            }}
          >
            <div className={cn(selectContentClassName, "min-w-[160px] w-auto") }>
              {allItems.map((item) => {
                const isDefault = item.value !== "__none__" && item.value === defaultRuntimeId;
                return (
                  <div
                    key={item.id}
                    ref={(node) => {
                      itemRefs.current[item.id] = node;
                    }}
                    className={cn(
                      selectItemClassName,
                      "flex items-center justify-between gap-2 whitespace-nowrap transition-colors",
                      selectedId === item.value
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent/50",
                    )}
                    onMouseEnter={() => handleItemHover(item.id)}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => handleSelect(item.value)}
                    >
                      {item.name}
                    </button>
                    {isDefault && (
                      <Star className="size-3 shrink-0 fill-primary text-primary" />
                    )}
                    {!isDefault && item.value !== "__none__" && (
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 text-muted-foreground/40 hover:text-primary transition-colors"
                        title={m.set_as_default()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetDefault(item.value);
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
