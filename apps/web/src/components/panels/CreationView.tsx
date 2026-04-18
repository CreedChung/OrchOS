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
  ArrowRight01Icon,
  Folder01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "#/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { ConfirmDialog } from "#/components/ui/confirm-dialog";
import { ScrollArea } from "#/components/ui/scroll-area";
import { cn } from "#/lib/utils";
import { api, type Conversation, type ConversationMessage } from "#/lib/api";
import type { AgentProfile, Project, RuntimeProfile } from "#/lib/types";
import { m } from "#/paraglide/messages";
import type { CreationArchiveFilter } from "#/components/layout/Toolbar";

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
    if (archiveFilter === "archived") return conversations.filter((c) => c.archived);
    if (archiveFilter === "active") return conversations.filter((c) => !c.archived);
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

  useEffect(() => {
    if (!hasLoadedConversations) return;

    if (activeConversationId && filteredConversations.some((conv) => conv.id === activeConversationId)) {
      return;
    }

    if (filteredConversations.length > 0) {
      setActiveConversationId(filteredConversations[0].id);
      return;
    }

    if (archiveFilter === "archived" || autoCreatingConversationRef.current) {
      return;
    }

    autoCreatingConversationRef.current = true;
    void handleNewConversation().finally(() => {
      autoCreatingConversationRef.current = false;
    });
  }, [activeConversationId, archiveFilter, filteredConversations, handleNewConversation, hasLoadedConversations]);

  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await api.createConversation({});
      await loadConversations();
      setActiveConversationId(conv.id);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [loadConversations]);

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
      data: { title?: string; projectId?: string; agentId?: string; runtimeId?: string },
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
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{m.creation()}</h2>
          <Button size="icon-sm" variant="ghost" onClick={handleNewConversation}>
            <HugeiconsIcon icon={Add01Icon} className="size-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-1.5 space-y-0.5">
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
                    setConvToDelete(conv.id);
                    setDeleteConfirmOpen(true);
                  }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
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
            <HugeiconsIcon icon={Loading01Icon} className="size-5 animate-spin text-muted-foreground/50" />
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
    data: { title?: string; projectId?: string; agentId?: string; runtimeId?: string },
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedRuntime = useMemo(
    () => runtimes.find((r) => r.id === conversation.runtimeId),
    [runtimes, conversation.runtimeId],
  );

  const _selectedProject = useMemo(
    () => projects.find((p) => p.id === conversation.projectId),
    [projects, conversation.projectId],
  );

  const modelDisplay = selectedRuntime?.model.replace(/^(cloud|local)\//, "") || "";
  const isCloudModel = selectedRuntime?.model.startsWith("cloud/");

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversation.id]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    try {
      await onSendMessage(content);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }, [input, sending, onSendMessage]);

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
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-11 items-center gap-3 border-b border-border px-4">
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
              onUpdateConversation(conversation.id, { projectId: v === "__none__" ? undefined : v })
            }
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <HugeiconsIcon icon={Folder01Icon} className="size-3 mr-1 shrink-0" />
              <SelectValue placeholder={m.select_project()} />
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

          {/* Agent/Runtime selector */}
          <Select
            value={conversation.runtimeId || "__none__"}
            onValueChange={(v) =>
              onUpdateConversation(conversation.id, { runtimeId: v === "__none__" ? undefined : v })
            }
          >
            <SelectTrigger className="h-7 w-40 text-xs">
              <HugeiconsIcon icon={Robot02Icon} className="size-3 mr-1 shrink-0" />
              <SelectValue placeholder={m.select_agent()} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{m.no_agent()}</SelectItem>
              {runtimes.map((runtime) => (
                <SelectItem key={runtime.id} value={runtime.id}>
                  <span className="flex items-center gap-1.5">
                    {runtime.name}
                    <span className="text-muted-foreground">
                      {runtime.model.replace(/^(cloud|local)\//, "")}
                    </span>
                  </span>
                </SelectItem>
              ))}
              {agents
                .filter((a) => a.enabled)
                .map((agent) => (
                  <SelectItem key={agent.id} value={agent.runtimeId || agent.id}>
                    <span className="flex items-center gap-1.5">
                      {agent.name}
                      <span className="text-muted-foreground">
                        {agent.model.replace(/^(cloud|local)\//, "")}
                      </span>
                    </span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

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
      <div className="flex-1 overflow-y-auto">
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

      {/* Input area */}
      <div className="border-t border-border px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                selectedRuntime ? `Message ${selectedRuntime.name}...` : m.creation_placeholder()
              }
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              rows={1}
              onKeyDown={handleKeys}
              spellCheck={false}
              disabled={sending}
              style={{ minHeight: "36px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <Button
              type="button"
              size="icon-sm"
              disabled={!input.trim() || sending}
              onClick={handleSend}
              className="shrink-0"
            >
              {sending ? (
                <HugeiconsIcon icon={Loading01Icon} className="size-3.5 animate-spin" />
              ) : (
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
            Enter to send · Shift+Enter for new line ·{" "}
            {selectedRuntime ? `${selectedRuntime.name}` : m.select_agent()}
          </p>
        </div>
      </div>
    </div>
  );
}
