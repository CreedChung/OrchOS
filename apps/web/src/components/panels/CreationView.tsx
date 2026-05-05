import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Archive01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Chat01Icon,
  Clock01Icon,
  ArrowUp01Icon,
  Mic01Icon,
  Cancel01Icon,
  UnfoldMoreIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "border-beam";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { api, type Conversation, type ConversationMessage } from "@/lib/api";
import type {
  ControlSettings,
  RuntimeProfile,
} from "@/lib/types";
import { useConversationStore } from "@/lib/stores/conversation";
import { useUIStore } from "@/lib/store";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { mapConversationMessagesToUiMessages } from "@/components/chat/ConversationFlow";

interface CreationViewProps {
  runtimes: RuntimeProfile[];
  settings: ControlSettings | null;
  onSettingsChange: (settings: ControlSettings) => void;
}

const EMPTY_CONVERSATION_MESSAGES: ConversationMessage[] = [];

const creationFilterButtons = [
  { value: "all", label: m.all(), icon: Chat01Icon, iconClassName: "text-muted-foreground/80" },
  { value: "active", label: m.creation_active(), icon: Clock01Icon, iconClassName: "text-sky-500" },
  { value: "archived", label: m.creation_archived(), icon: Archive01Icon, iconClassName: "text-amber-500" },
] as const;

export function CreationView({
  runtimes,
  settings,
  onSettingsChange,
}: CreationViewProps) {
  const creationArchiveFilter = useUIStore((s) => s.creationArchiveFilter);
  const setCreationArchiveFilter = useUIStore((s) => s.setCreationArchiveFilter);
  const creationSidebarCollapsed = useUIStore((s) => s.creationSidebarCollapsed);
  const setCreationSidebarCollapsed = useUIStore((s) => s.setCreationSidebarCollapsed);
  const creationSidebarWidth = useUIStore((s) => s.creationSidebarWidth);
  const setCreationSidebarWidth = useUIStore((s) => s.setCreationSidebarWidth);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(!creationSidebarCollapsed);
  const autoCreatingConversationRef = useRef(false);
  const collapseTimerRef = useRef<number | null>(null);

  const {
    conversations,
    activeConversationId,
    messagesByConversationId,
    hasLoadedConversations,
    isLoadingConversations,
    loadConversations,
    setActiveConversationId,
    loadMessages,
    createConversation,
    updateConversation,
    deleteConversation,
    setPendingUserMessage,
  } = useConversationStore();

  const messages = activeConversationId
    ? (messagesByConversationId[activeConversationId] ??
      EMPTY_CONVERSATION_MESSAGES)
    : EMPTY_CONVERSATION_MESSAGES;
  const uiMessages = useMemo(
    () => mapConversationMessagesToUiMessages(messages),
    [messages],
  );

  const [sending, setSending] = useState(false);
  const enabledRuntimes = useMemo(
    () => runtimes.filter((r) => r.enabled),
    [runtimes],
  );
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );
  const draftConversation = useMemo<Conversation>(
    () => ({
      id: "__draft__",
      title: "",
      archived: false,
      deleted: false,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    }),
    [],
  );
  const displayConversation = activeConversation ?? draftConversation;

  const availableConversations = useMemo(() => {
    if (creationArchiveFilter === "archived") {
      return conversations.filter((conversation) => conversation.archived && !conversation.deleted);
    }

    if (creationArchiveFilter === "active") {
      return conversations.filter((conversation) => !conversation.archived && !conversation.deleted);
    }

    return conversations.filter((conversation) => !conversation.deleted);
  }, [conversations, creationArchiveFilter]);
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (creationSidebarCollapsed) {
      setShowExpandedContent(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowExpandedContent(true);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [creationSidebarCollapsed]);

  const handleCollapseSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setShowExpandedContent(false);
    collapseTimerRef.current = window.setTimeout(() => {
      setCreationSidebarCollapsed(true);
      collapseTimerRef.current = null;
    }, 180);
  }, [setCreationSidebarCollapsed]);

  const handleExpandSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setCreationSidebarCollapsed(false);
  }, [setCreationSidebarCollapsed]);

  const handleNewConversation = useCallback(async () => {
    if (
      activeConversation &&
      !activeConversation.archived &&
      !activeConversation.deleted &&
      messages.length === 0
    ) {
      setActiveConversationId(activeConversation.id);
      return;
    }

    try {
      await createConversation({
        runtimeId: settings?.defaultRuntimeId || undefined,
      });
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [
    activeConversation,
    createConversation,
    messages.length,
    setActiveConversationId,
    settings?.defaultRuntimeId,
  ]);

  useEffect(() => {
    if (!hasLoadedConversations) return;

    if (
      activeConversationId &&
      availableConversations.some((conv) => conv.id === activeConversationId)
    ) {
      return;
    }

    if (availableConversations.length > 0) {
      setActiveConversationId(availableConversations[0].id);
      return;
    }

    if (autoCreatingConversationRef.current) {
      return;
    }

    autoCreatingConversationRef.current = true;
    void handleNewConversation().finally(() => {
      autoCreatingConversationRef.current = false;
    });
  }, [
    activeConversationId,
    availableConversations,
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

  const handleDeleteConfirmOpenChange = useCallback((open: boolean) => {
    setDeleteConfirmOpen(open);
    if (!open) {
      setConvToDelete(null);
    }
  }, []);

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const sidebarEl = event.currentTarget.parentElement;
      const sidebarLeft = sidebarEl?.getBoundingClientRect().left ?? 0;
      setIsResizingSidebar(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 280), 420);
        setCreationSidebarWidth(nextWidth);
      };

      const handlePointerUp = () => {
        setIsResizingSidebar(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [setCreationSidebarWidth],
  );

  const handleUpdateConversation = useCallback(
    async (
      id: string,
        data: {
          title?: string;
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

  const handleCreateConversation = useCallback(
    async (data: {
      runtimeId?: string;
    }) => {
      try {
        return await createConversation(data);
      } catch (err) {
        console.error("Failed to create conversation:", err);
        throw err;
      }
    },
    [createConversation],
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div
        className={cn(
          "relative flex min-h-0 shrink-0 flex-col bg-card transition-[width] duration-300 ease-out",
          creationSidebarCollapsed
            ? "w-0 overflow-hidden"
            : "w-[var(--creation-sidebar-width)] overflow-visible border-r",
          isResizingSidebar ? "border-r-transparent" : "border-border",
        )}
        style={
          creationSidebarCollapsed
            ? undefined
            : ({ "--creation-sidebar-width": `${creationSidebarWidth}px` } as React.CSSProperties)
        }
      >
        <div
          className={cn(
            "border-b border-border p-2 transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
            <div className="flex h-10 items-center justify-between rounded-md px-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{m.creation()}</div>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="active:-translate-y-0"
                      onClick={() => void handleNewConversation()}
                    >
                      <HugeiconsIcon icon={Add01Icon} className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{m.new_conversation()}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="active:-translate-y-0"
                      onClick={handleCollapseSidebar}
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{m.collapse_sidebar()}</TooltipContent>
                </Tooltip>
              </div>
            </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex flex-1 flex-col transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-0.5 p-1.5">
                {availableConversations.map((conversation) => {
                  const isActive = conversation.id === activeConversationId;

                  return (
                    <div
                      key={conversation.id}
                      className={cn(
                        "group flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-foreground/70 hover:bg-accent/50 hover:text-foreground",
                      )}
                      onClick={() => setActiveConversationId(conversation.id)}
                    >
                      <HugeiconsIcon icon={Chat01Icon} className="size-3.5 shrink-0 opacity-40" />
                      <button type="button" className="flex-1 text-left">
                        <div className="truncate text-xs leading-5">
                          {conversation.title || m.untitled_conversation()}
                        </div>
                      </button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          setConvToDelete(conversation.id);
                          setDeleteConfirmOpen(true);
                        }}
                        className="text-muted-foreground/55 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        title={m.delete()}
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}

                {availableConversations.length === 0 ? (
                  <div className="py-6 text-center">
                    <HugeiconsIcon icon={Chat01Icon} className="mx-auto mb-1.5 size-5 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">{m.no_conversations()}</p>
                  </div>
                ) : null}
              </div>
          </ScrollArea>

          <div className="border-t border-border p-2">
            <div className="flex h-10 items-center justify-center gap-1 rounded-md px-2">
                {creationFilterButtons.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setCreationArchiveFilter(filter.value)}
                    aria-pressed={creationArchiveFilter === filter.value}
                    title={filter.label}
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-md transition-colors",
                      creationArchiveFilter === filter.value
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={filter.icon} className={cn("size-3.5", filter.iconClassName)} />
                  </button>
                ))}
            </div>
          </div>

        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize creation sidebar"
          onPointerDown={handleResizeStart}
          className={cn(
            "group absolute right-[-8px] top-0 z-20 h-full w-4",
            creationSidebarCollapsed && "hidden",
            isResizingSidebar && "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
          )}
        >
          <div
            className={cn(
              "absolute top-1/2 left-1/2 flex h-12 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-[background-color,border-color,box-shadow] duration-150 ease-out group-hover:bg-muted group-hover:shadow-md",
              isResizingSidebar && "border-border bg-muted shadow-md",
            )}
          >
            <div
              className={cn(
                "h-8 w-px rounded-full bg-border transition-[background-color] duration-150 ease-out group-hover:bg-foreground/35",
                isResizingSidebar && "opacity-0",
              )}
            />
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {creationSidebarCollapsed ? (
          <Tooltip>
            <TooltipTrigger>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:!translate-y-[-50%]"
                onClick={handleExpandSidebar}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{m.expand_sidebar()}</TooltipContent>
          </Tooltip>
        ) : null}
        {!hasLoadedConversations && isLoadingConversations ? (
          <div className="flex h-full items-center justify-center">
            <Spinner className="text-muted-foreground/50" />
          </div>
        ) : (
          <ChatArea
            conversation={displayConversation}
            isDraftConversation={!activeConversation}
            messages={uiMessages}
            sending={sending}
            runtimes={enabledRuntimes}
            defaultRuntimeId={settings?.defaultRuntimeId}
            onUpdateConversation={handleUpdateConversation}
            onCreateConversation={handleCreateConversation}
            onSetDefaultRuntime={(runtimeId) => {
              void api
                .updateSettings({ defaultRuntimeId: runtimeId })
                .then((updated) => {
                  onSettingsChange(updated);
                });
            }}
            onSendMessage={async (content, targetConversation) => {
              const conversation = targetConversation ?? activeConversation;
              if (!conversation) return;

              setSending(true);
              if (content) {
                setPendingUserMessage(conversation.id, content);
              }
              try {
                await api.sendConversationMessage(conversation.id, content);
                await loadMessages(conversation.id, { force: true });
                setPendingUserMessage(conversation.id, undefined);
                if (!conversation.title && messages.length === 0) {
                  await handleUpdateConversation(conversation.id, {
                    title: content.slice(0, 60),
                  });
                }
                return;
              } catch (err) {
                setPendingUserMessage(conversation.id, undefined);
                console.error("Failed to send message:", err);
                toast.error(
                  err instanceof Error ? err.message : m.send_failed(),
                );
                throw err;
              } finally {
                setSending(false);
              }
            }}
            onReloadMessages={
              activeConversation
                ? () => loadMessages(activeConversation.id)
                : undefined
            }
          />
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={handleDeleteConfirmOpenChange}
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
  isDraftConversation: boolean;
  messages: UIMessage[];
  sending: boolean;
  runtimes: RuntimeProfile[];
  defaultRuntimeId?: string;
  onCreateConversation: (data: {
    runtimeId?: string;
  }) => Promise<Conversation>;
  onUpdateConversation: (
    id: string,
    data: {
      title?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    },
  ) => Promise<void>;
  onSetDefaultRuntime: (runtimeId?: string) => void;
  onSendMessage: (
    content: string,
    conversation?: Conversation,
  ) => Promise<void>;
  onReloadMessages?: () => Promise<void>;
}

function ChatArea({
  conversation,
  isDraftConversation,
  messages,
  sending,
  runtimes,
  defaultRuntimeId,
  onCreateConversation,
  onUpdateConversation,
  onSetDefaultRuntime,
  onSendMessage,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isConversationUpdating, setIsConversationUpdating] = useState(false);
  const [inputCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingConversationUpdateRef = useRef<Promise<void> | null>(null);
  const [draftRuntimeId, setDraftRuntimeId] = useState<string | undefined>(
    conversation.runtimeId,
  );

  useEffect(() => {
    setDraftRuntimeId(conversation.runtimeId);
  }, [
    conversation.runtimeId,
    conversation.id,
  ]);

  const effectiveRuntimeId = isDraftConversation
    ? draftRuntimeId
    : conversation.runtimeId;

  const { isListening, transcript, isSupported, start, stop } =
    useSpeechRecognition();

  const prevTranscriptRef = useRef("");
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      setInput((prev) => prev + transcript);
      prevTranscriptRef.current = transcript;
      textareaRef.current?.focus();
    }
  }, [transcript]);

  const selectedRuntime = useMemo(
    () => runtimes.find((r) => r.id === effectiveRuntimeId),
    [effectiveRuntimeId, runtimes],
  );
  const { pendingUserMessageByConversationId, setPendingUserMessage } =
    useConversationStore();
  const pendingUserMessage =
    conversation.id === "__draft__"
      ? null
      : (pendingUserMessageByConversationId[conversation.id] ?? null);
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
  }, [conversation.id]);

  useEffect(() => {
    if (!pendingUserMessage) return;
    const hasMatchedUserMessage = messages.some(
      (message) =>
        message.role === "user" &&
        message.parts.some(
          (part) => part.type === "text" && part.text === pendingUserMessage,
        ),
    );

    if (hasMatchedUserMessage && conversation.id !== "__draft__") {
      setPendingUserMessage(conversation.id, undefined);
    }
  }, [conversation.id, messages, pendingUserMessage, setPendingUserMessage]);

  useEffect(() => {
    syncTextareaHeight();
  }, [attachedFiles.length, conversation.id, input, syncTextareaHeight]);

  const queueConversationUpdate = useCallback(
      (data: {
        title?: string;
        runtimeId?: string;
        archived?: boolean;
        deleted?: boolean;
      }) => {
      if (isDraftConversation) {
        if (data.runtimeId !== undefined) setDraftRuntimeId(data.runtimeId);
        return Promise.resolve();
      }

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
    [conversation.id, isDraftConversation, onUpdateConversation],
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

    try {
      if (filesToSend.length > 0) {
        toast.error("当前模型不支持图片输入，请移除图片后重试。");
        return;
      }

      const targetConversation = isDraftConversation
        ? await onCreateConversation({
            runtimeId: draftRuntimeId,
          })
        : conversation;

      await onSendMessage(content, targetConversation);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error(m.send_failed());
    }
  }, [
    attachedFiles,
    draftRuntimeId,
    input,
    isDraftConversation,
    onCreateConversation,
    onSendMessage,
    sending,
  ]);

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

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Input area */}
      {!inputCollapsed && (
        <div className="shrink-0 overflow-visible bg-background px-4 py-4 md:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 px-1">
              <p className="text-sm font-medium text-foreground/85">
                我们开始创造吧
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                描述你的目标，我会先拆解计划，再推进执行与审查。
              </p>
            </div>
            <BorderBeam
              size="md"
              theme="auto"
              colorVariant="ocean"
              strength={0.65}
              duration={2.6}
              className="rounded-xl"
            >
              <div className="relative flex flex-col gap-2 overflow-visible rounded-xl border border-border bg-background px-3 pt-3 pb-1.5">
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
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-3 text-muted-foreground"
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    selectedRuntime
                      ? `Message ${selectedRuntime.name}...`
                      : m.creation_placeholder()
                  }
                  className="min-h-[40px] w-full resize-none bg-transparent py-1 text-sm leading-6 outline-none placeholder:text-muted-foreground"
                  rows={1}
                  onKeyDown={handleKeys}
                  spellCheck={false}
                  disabled={sending}
                  style={{ maxHeight: "120px" }}
                  onInput={syncTextareaHeight}
                />
                <div className="relative z-20 flex items-center justify-between gap-2 pt-2 pb-0.5">
                  <div className="overflow-visible flex items-center gap-1">
                    <RuntimeSelector
                      runtimes={runtimes.filter((runtime) => runtime.enabled)}
                      selectedRuntimeId={effectiveRuntimeId ?? undefined}
                      defaultRuntimeId={defaultRuntimeId}
                      onSelect={(runtimeId) =>
                        queueConversationUpdate({ runtimeId })
                      }
                      onSetDefault={onSetDefaultRuntime}
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className={cn(
                            "text-muted-foreground hover:text-foreground",
                            isListening && "text-red-500 hover:text-red-600",
                          )}
                          onClick={isListening ? stop : start}
                          disabled={!isSupported}
                        >
                          <HugeiconsIcon
                            icon={isListening ? Cancel01Icon : Mic01Icon}
                            className="size-4"
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">{isListening ? m.voice_input_stop() : m.voice_input()}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          type="button"
                          size="icon-sm"
                          disabled={
                            (!input.trim() && attachedFiles.length === 0) ||
                            sending ||
                            isConversationUpdating
                          }
                          onClick={handleSend}
                        >
                          {sending ? (
                            <Spinner size="sm" />
                          ) : (
                            <HugeiconsIcon
                              icon={ArrowUp01Icon}
                              className="size-3.5"
                            />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Send</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </BorderBeam>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 md:px-6">
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

interface RuntimeSelectorProps {
  runtimes: RuntimeProfile[];
  selectedRuntimeId?: string;
  defaultRuntimeId?: string;
  onSelect: (runtimeId?: string) => void;
  onSetDefault: (runtimeId?: string) => void;
}

function RuntimeSelector({
  runtimes,
  selectedRuntimeId,
  defaultRuntimeId,
  onSelect,
  onSetDefault,
}: RuntimeSelectorProps) {
  const safeRuntimes = Array.isArray(runtimes) ? runtimes : [];
  const [open, setOpen] = useState(false);

  const selectedRuntime = safeRuntimes.find((runtime) => runtime.id === selectedRuntimeId);

  const allItems = [
    {
      id: "runtime::__none__",
      name: m.creation_placeholder(),
      runtimeId: undefined,
    },
    ...safeRuntimes.map((runtime) => ({
      id: `runtime::${runtime.id}`,
      name: runtime.name,
      runtimeId: runtime.id,
    })),
  ];

  const handleSelect = useCallback(
    (item: (typeof allItems)[number]) => {
      onSelect(item.runtimeId);
      setOpen(false);
    },
    [onSelect],
  );

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="flex h-7 w-36 cursor-default items-center justify-between gap-1.5 rounded-full border border-input bg-transparent py-2 pe-2 ps-2.5 text-xs whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden text-foreground/70">
            <HugeiconsIcon icon={UnfoldMoreIcon} className="size-3 shrink-0" />
          </span>
          <span className="truncate">
            {selectedRuntime?.name || m.creation_placeholder()}
          </span>
        </span>
        <HugeiconsIcon
          icon={UnfoldMoreIcon}
          className="size-3 shrink-0 text-muted-foreground"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-(--anchor-width)">
        {allItems.map((item) => {
          const isDefault = item.runtimeId !== undefined && item.runtimeId === defaultRuntimeId;

          return (
            <DropdownMenuItem
              key={item.id}
              onClick={(event) => {
                event.stopPropagation();
                handleSelect(item);
              }}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate">{item.name}</span>
              {item.runtimeId !== undefined ? (
                <button
                  type="button"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded p-0.5 transition-colors",
                    isDefault
                      ? "text-primary"
                      : "text-muted-foreground/40 hover:text-primary",
                  )}
                  title={isDefault ? "Default runtime" : m.set_as_default()}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!isDefault) {
                      onSetDefault(item.runtimeId);
                    }
                  }}
                >
                  <HugeiconsIcon icon={Add01Icon} className={cn("size-3", isDefault && "text-primary")} />
                </button>
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
