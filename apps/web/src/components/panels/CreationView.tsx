import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Chat01Icon,
  CloudIcon,
  Delete02Icon,
  Edit02Icon,
  Loading01Icon,
  Robot02Icon,
  Server,
  ArrowUp01Icon,
  Folder01Icon,
  Upload04Icon,
  Mic01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "border-beam";
import { ArchiveRestore, ArchiveX } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { api, type Conversation, type ConversationMessage } from "@/lib/api";
import type { AgentProfile, Project, RuntimeProfile } from "@/lib/types";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";

interface CreationViewProps {
  agents: AgentProfile[];
  runtimes: RuntimeProfile[];
  projects: Project[];
  archiveFilter: CreationArchiveFilter;
}

export function CreationView({ agents, runtimes, projects, archiveFilter }: CreationViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const [hasLoadedConversations, setHasLoadedConversations] = useState(false);
  const autoCreatingConversationRef = useRef(false);

  const enabledRuntimes = useMemo(() => runtimes.filter((r) => r.enabled), [runtimes]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const filteredConversations = useMemo(() => {
    if (archiveFilter === "deleted") return conversations.filter((c) => c.deleted);
    if (archiveFilter === "archived") return conversations.filter((c) => c.archived && !c.deleted);
    if (archiveFilter === "active") return conversations.filter((c) => !c.archived && !c.deleted);
    return conversations;
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

  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await api.createConversation({});
      await loadConversations();
      setActiveConversationId(conv.id);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [loadConversations]);

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
      archiveFilter === "deleted" ||
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
            messages={messages}
            agents={agents}
            runtimes={enabledRuntimes}
            projects={projects}
            onUpdateConversation={handleUpdateConversation}
            onSendMessage={async (content) => {
              const result = await api.sendConversationMessage(activeConversation.id, content);
              await loadMessages(activeConversation.id);
              // Update conversation title if first message
              if (!activeConversation.title && messages.length === 0) {
                await handleUpdateConversation(activeConversation.id, {
                  title: content.slice(0, 60),
                });
              }
              return result;
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
  messages: ConversationMessage[];
  agents: AgentProfile[];
  runtimes: RuntimeProfile[];
  projects: Project[];
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
  onSendMessage: (content: string) => Promise<ConversationMessage>;
  onReloadMessages?: () => Promise<void>;
}

function ChatArea({
  conversation,
  messages,
  agents,
  runtimes,
  projects,
  onUpdateConversation,
  onSendMessage,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const modelDisplay = selectedRuntime?.model.replace(/^(cloud|local)\//, "") || "";
  const isCloudModel = selectedRuntime?.model.startsWith("cloud/");

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

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachedFiles.length === 0) || sending) return;
    
    const content = input.trim();
    const filesToSend = [...attachedFiles];
    
    setInput("");
    setAttachedFiles([]);
    setSending(true);

    try {
      if (filesToSend.length > 0) {
        toast.info(m.multimodal_notice());
      }
      await onSendMessage(content);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error(m.send_failed());
    } finally {
      setSending(false);
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
            selectedId={conversation.runtimeId}
            onSelect={(runtimeId) => onUpdateConversation(conversation.id, { runtimeId })}
          />

          {/* Model badge */}
          {selectedRuntime && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0",
                isCloudModel
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
              )}
            >
              <HugeiconsIcon icon={isCloudModel ? CloudIcon : Server} className="size-2.5" />
              {modelDisplay}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pb-[120px]">
        <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
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
            <div
              key={msg.id}
              className={cn(
                "rounded-xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-primary/10 text-foreground ml-12"
                  : msg.error
                    ? "bg-destructive/10 text-destructive mr-12"
                    : "bg-muted text-foreground mr-12",
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {msg.role === "user" ? m.user() : m.assistant()}
                </span>
                {msg.responseTime && (
                  <span className="text-[10px] text-muted-foreground/50">{msg.responseTime}ms</span>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
            </div>
          ))}
          {sending && (
            <div className="rounded-xl bg-muted px-4 py-3 text-sm mr-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <HugeiconsIcon icon={Loading01Icon} className="size-4 animate-spin" />
                <span className="text-xs">{m.thinking()}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area - absolute positioned */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-2 py-3">
        <BorderBeam
          size="md"
          theme="auto"
          colorVariant="ocean"
          strength={0.65}
          duration={2.6}
          className="rounded-xl"
        >
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-background px-3 py-3">
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
                      className="absolute -right-1 -top-1 rounded-full bg-background border border-border p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:border-destructive/30"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 w-full">
              <div className="flex items-center gap-1 shrink-0">
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
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <HugeiconsIcon icon={Upload04Icon} className="size-4" />
                </Button>
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
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  selectedRuntime ? `Message ${selectedRuntime.name}...` : m.creation_placeholder()
                }
                className="flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                rows={1}
                onKeyDown={handleKeys}
                spellCheck={false}
                disabled={sending}
                style={{ minHeight: "40px", maxHeight: "120px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
              <Button
                type="button"
                size="icon-sm"
                disabled={(!input.trim() && attachedFiles.length === 0) || sending}
                onClick={handleSend}
                className="shrink-0"
              >
                {sending ? (
                  <HugeiconsIcon icon={Loading01Icon} className="size-3.5 animate-spin" />
                ) : (
                  <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        </BorderBeam>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line ·{" "}
          {selectedRuntime ? `${selectedRuntime.name}` : m.select_agent()}
        </p>
      </div>
    </div>
  );
}

interface RuntimeSelectorProps {
  runtimes: RuntimeProfile[];
  agents: AgentProfile[];
  selectedId?: string;
  onSelect: (runtimeId?: string) => void;
}

function RuntimeSelector({ runtimes, agents, selectedId, onSelect }: RuntimeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedItem = useMemo(() => {
    const runtime = runtimes.find((r) => r.id === selectedId);
    if (runtime) return runtime;
    const agent = agents.find((a) => (a.runtimeId || a.id) === selectedId);
    return agent;
  }, [runtimes, agents, selectedId]);

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      setHoveredItem(null);
    }, 150);
  }, [cancelClose]);

  const handleEnter = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={scheduleClose}>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-7 w-40 items-center justify-between gap-1 rounded-md border border-input bg-background px-2.5 text-xs text-foreground hover:bg-accent/50 transition-colors"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <HugeiconsIcon icon={Robot02Icon} className="size-3 shrink-0" />
          <span className="truncate">{selectedItem?.name || m.no_agent()}</span>
        </span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="fixed z-50 flex animate-in fade-in-0 zoom-in-95"
          style={{
            left: triggerRef.current?.getBoundingClientRect().left ?? 0,
            top: (triggerRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
            width: triggerRef.current?.offsetWidth ?? 160,
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="flex flex-col rounded-lg border border-border bg-popover p-1 shadow-lg min-w-full">
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors",
                !selectedId
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/50",
              )}
              onClick={() => {
                onSelect(undefined);
                setOpen(false);
              }}
            >
              {m.no_agent()}
            </button>

            {runtimes.map((runtime) => (
              <RuntimeItem
                key={runtime.id}
                runtime={runtime}
                isSelected={runtime.id === selectedId}
                isHovered={runtime.id === hoveredItem}
                onHover={() => setHoveredItem(runtime.id)}
                onLeave={() => setHoveredItem(null)}
                onClick={() => {
                  onSelect(runtime.id);
                  setOpen(false);
                }}
              />
            ))}

            {agents.map((agent) => (
              <AgentItem
                key={agent.id}
                agent={agent}
                isSelected={(agent.runtimeId || agent.id) === selectedId}
                isHovered={agent.id === hoveredItem}
                onHover={() => setHoveredItem(agent.id)}
                onLeave={() => setHoveredItem(null)}
                onClick={() => {
                  onSelect(agent.runtimeId || agent.id);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface RuntimeItemProps {
  runtime: RuntimeProfile;
  isSelected: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}

function RuntimeItem({
  runtime,
  isSelected,
  isHovered,
  onHover,
  onLeave,
  onClick,
}: RuntimeItemProps) {
  const itemRef = useRef<HTMLButtonElement>(null);
  const isCloudModel = runtime.model.startsWith("cloud/");
  const modelDisplay = runtime.model.replace(/^(cloud|local)\//, "");

  return (
    <div className="relative" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <button
        ref={itemRef}
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors",
          isSelected ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50",
        )}
        onClick={onClick}
      >
        <span className="truncate">{runtime.name}</span>
      </button>

      {isHovered && (
        <div
          className="fixed z-[60] animate-in fade-in-0 zoom-in-95"
          style={{
            left: (itemRef.current?.getBoundingClientRect().right ?? 0) + 8,
            top: itemRef.current?.getBoundingClientRect().top ?? 0,
          }}
        >
          <div className="rounded-lg border border-border bg-popover p-3 shadow-lg min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-foreground">{runtime.name}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  isCloudModel
                    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                )}
              >
                <HugeiconsIcon icon={isCloudModel ? CloudIcon : Server} className="size-2.5" />
                {isCloudModel ? "Cloud" : "Local"}
              </span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Model</span>
                <span className="text-foreground font-medium">{modelDisplay}</span>
              </div>
              {runtime.version && (
                <div className="flex items-center justify-between">
                  <span>Version</span>
                  <span className="text-foreground">{runtime.version}</span>
                </div>
              )}
              {runtime.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {runtime.capabilities.slice(0, 3).map((cap) => (
                    <span
                      key={cap}
                      className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AgentItemProps {
  agent: AgentProfile;
  isSelected: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}

function AgentItem({ agent, isSelected, isHovered, onHover, onLeave, onClick }: AgentItemProps) {
  const itemRef = useRef<HTMLButtonElement>(null);
  const isCloudModel = agent.model.startsWith("cloud/");
  const modelDisplay = agent.model.replace(/^(cloud|local)\//, "");

  return (
    <div className="relative" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <button
        ref={itemRef}
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors",
          isSelected ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50",
        )}
        onClick={onClick}
      >
        <span className="truncate">{agent.name}</span>
      </button>

      {isHovered && (
        <div
          className="fixed z-[60] animate-in fade-in-0 zoom-in-95"
          style={{
            left: (itemRef.current?.getBoundingClientRect().right ?? 0) + 8,
            top: itemRef.current?.getBoundingClientRect().top ?? 0,
          }}
        >
          <div className="rounded-lg border border-border bg-popover p-3 shadow-lg min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-foreground">{agent.name}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  isCloudModel
                    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                )}
              >
                <HugeiconsIcon icon={isCloudModel ? CloudIcon : Server} className="size-2.5" />
                {isCloudModel ? "Cloud" : "Local"}
              </span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Model</span>
                <span className="text-foreground font-medium">{modelDisplay}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Role</span>
                <span className="text-foreground">{agent.role}</span>
              </div>
              {agent.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {agent.capabilities.slice(0, 3).map((cap) => (
                    <span
                      key={cap}
                      className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
