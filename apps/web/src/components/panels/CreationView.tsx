import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Robot02Icon,
  ArrowUp01Icon,
  File02Icon,
  Mic01Icon,
  Cancel01Icon,
  UnfoldMoreIcon,
  Folder01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { type UIMessage } from "ai";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "border-beam";
import { Star } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AgentProfile,
  Command,
  ControlSettings,
  Project,
  RuntimeProfile,
} from "@/lib/types";
import { useConversationStore } from "@/lib/stores/conversation";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { mapConversationMessagesToUiMessages } from "@/components/chat/ConversationFlow";

interface CreationViewProps {
  agents: AgentProfile[];
  commands: Command[];
  runtimes: RuntimeProfile[];
  projects: Project[];
  settings: ControlSettings | null;
  onSettingsChange: (settings: ControlSettings) => void;
}

const EMPTY_CONVERSATION_MESSAGES: ConversationMessage[] = [];
const PROJECT_SPEC_FILE_ACCEPT = ".md,.txt,.spec,text/plain,text/markdown";

function getProjectAgentsFilePath(project?: Project | null) {
  if (!project?.path) return null;
  return `${project.path.replace(/\/$/, "")}/AGENTS.md`;
}

export function CreationView({
  agents,
  runtimes,
  projects,
  settings,
  onSettingsChange,
}: CreationViewProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const autoCreatingConversationRef = useRef(false);

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
    setConversationPending,
    setPendingUserMessage,
    setConversationFlowDraft,
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
  const enabledAgents = useMemo(
    () => agents.filter((agent) => agent.enabled),
    [agents],
  );
  const defaultAgent = useMemo(
    () => enabledAgents.find((agent) => agent.id === settings?.defaultAgentId),
    [enabledAgents, settings?.defaultAgentId],
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

  const availableConversations = useMemo(
    () => conversations.filter((conversation) => !conversation.deleted),
    [conversations],
  );
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);

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
        agentId: defaultAgent?.id,
        runtimeId:
          defaultAgent?.runtimeId || settings?.defaultRuntimeId || undefined,
      });
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [
    activeConversation,
    createConversation,
    defaultAgent?.id,
    defaultAgent?.runtimeId,
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

  const handleCreateConversation = useCallback(
    async (data: {
      projectId?: string;
      agentId?: string;
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
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
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
            agents={agents}
            runtimes={enabledRuntimes}
            projects={projects}
            defaultAgentId={settings?.defaultAgentId}
            onUpdateConversation={handleUpdateConversation}
            onCreateConversation={handleCreateConversation}
            onSetDefaultAgent={(agentId) => {
              const selectedAgent = agents.find(
                (agent) => agent.id === agentId,
              );
              void api
                .updateSettings({
                  defaultAgentId: agentId,
                  defaultRuntimeId: selectedAgent?.runtimeId,
                })
                .then((updated) => {
                  onSettingsChange(updated);
                });
            }}
            onSendMessage={async (content, targetConversation) => {
              const conversation = targetConversation ?? activeConversation;
              if (!conversation) return;

              setSending(true);
              setConversationPending(conversation.id);
              if (content) {
                setPendingUserMessage(conversation.id, content);
              }
              setConversationFlowDraft(conversation.id, {
                id: `draft-${conversation.id}`,
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
                    toolCallId: `dispatch-${conversation.id}`,
                    state: "input-streaming",
                    input: {
                      instruction: content,
                      runtimeId: conversation.runtimeId,
                    },
                  },
                ],
              });
              try {
                const result = await api.createGoalsFromConversation(
                  conversation.id,
                  {
                    instruction: content,
                    runtimeId: conversation.runtimeId,
                  },
                );
                setConversationFlowDraft(conversation.id, {
                  id: `draft-${conversation.id}`,
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
                      toolCallId: `dispatch-${conversation.id}`,
                      state: "output-available",
                      input: {
                        instruction: content,
                        runtimeId: conversation.runtimeId,
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
                await loadMessages(conversation.id, { force: true });
                setPendingUserMessage(conversation.id, undefined);
                if (!conversation.title && messages.length === 0) {
                  await handleUpdateConversation(conversation.id, {
                    title: content.slice(0, 60),
                  });
                }
                return;
              } catch (err) {
                setConversationFlowDraft(conversation.id, {
                  id: `draft-${conversation.id}`,
                  role: "assistant",
                  content:
                    err instanceof Error
                      ? err.message
                      : "Failed to send message",
                  trace: [
                    {
                      kind: "thought",
                      text: "执行过程中出现错误，未能完成任务分派。",
                    },
                    {
                      kind: "tool",
                      toolName: "dispatch_command",
                      toolCallId: `dispatch-${conversation.id}`,
                      state: "output-error",
                      input: {
                        instruction: content,
                        runtimeId: conversation.runtimeId,
                      },
                      errorText:
                        err instanceof Error
                          ? err.message
                          : "Failed to send message",
                    },
                  ],
                });
                setPendingUserMessage(conversation.id, undefined);
                console.error("Failed to send message:", err);
                toast.error(
                  err instanceof Error ? err.message : m.send_failed(),
                );
                throw err;
              } finally {
                setConversationPending(null);
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
  agents: AgentProfile[];
  runtimes: RuntimeProfile[];
  projects: Project[];
  defaultAgentId?: string;
  onCreateConversation: (data: {
    projectId?: string;
    agentId?: string;
    runtimeId?: string;
  }) => Promise<Conversation>;
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
  agents,
  runtimes,
  projects,
  defaultAgentId,
  onCreateConversation,
  onUpdateConversation,
  onSetDefaultAgent,
  onSendMessage,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isConversationUpdating, setIsConversationUpdating] = useState(false);
  const [specDialogOpen, setSpecDialogOpen] = useState(false);
  const [projectSpec, setProjectSpec] = useState("");
  const [projectSpecDraft, setProjectSpecDraft] = useState("");
  const [projectSpecLoading, setProjectSpecLoading] = useState(false);
  const [projectSpecSaving, setProjectSpecSaving] = useState(false);
  const [inputCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const specFileInputRef = useRef<HTMLInputElement>(null);
  const pendingConversationUpdateRef = useRef<Promise<void> | null>(null);
  const [draftProjectId, setDraftProjectId] = useState<string | undefined>(
    conversation.projectId,
  );
  const [draftAgentId, setDraftAgentId] = useState<string | undefined>(
    conversation.agentId,
  );
  const [draftRuntimeId, setDraftRuntimeId] = useState<string | undefined>(
    conversation.runtimeId,
  );

  useEffect(() => {
    setDraftProjectId(conversation.projectId);
    setDraftAgentId(conversation.agentId);
    setDraftRuntimeId(conversation.runtimeId);
  }, [
    conversation.agentId,
    conversation.projectId,
    conversation.runtimeId,
    conversation.id,
  ]);

  const effectiveProjectId = isDraftConversation
    ? draftProjectId
    : conversation.projectId;
  const effectiveAgentId = isDraftConversation
    ? draftAgentId
    : conversation.agentId;
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
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === effectiveProjectId),
    [effectiveProjectId, projects],
  );
  const { pendingUserMessageByConversationId, setPendingUserMessage } =
    useConversationStore();
  const pendingUserMessage =
    conversation.id === "__draft__"
      ? null
      : (pendingUserMessageByConversationId[conversation.id] ?? null);
  const projectAgentsFilePath = useMemo(
    () => getProjectAgentsFilePath(selectedProject),
    [selectedProject],
  );
  const hasProjectSpec = projectSpec.trim().length > 0;
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
      projectId?: string;
      agentId?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    }) => {
      if (isDraftConversation) {
        if (data.projectId !== undefined) setDraftProjectId(data.projectId);
        if (data.agentId !== undefined) setDraftAgentId(data.agentId);
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
            projectId: draftProjectId,
            agentId: draftAgentId,
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
    draftAgentId,
    draftProjectId,
    draftRuntimeId,
    input,
    isDraftConversation,
    onCreateConversation,
    onSendMessage,
    sending,
  ]);

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

  const handleImportSpecFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [],
  );

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
            <input
              ref={specFileInputRef}
              type="file"
              accept={PROJECT_SPEC_FILE_ACCEPT}
              className="hidden"
              onChange={handleImportSpecFile}
            />
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
                    <Select
                      value={effectiveProjectId || "__none__"}
                      onValueChange={(v) =>
                        queueConversationUpdate({
                          projectId: !v || v === "__none__" ? undefined : v,
                        })
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-36 cursor-default justify-between rounded-full data-[size=sm]:rounded-full px-2.5 text-xs [&>svg:last-child]:hidden"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          {isConversationUpdating ? (
                            <Spinner
                              size="sm"
                              name="braille"
                              className="size-3 shrink-0 text-muted-foreground"
                            />
                          ) : (
                            <HugeiconsIcon
                              icon={Folder01Icon}
                              className="size-3 shrink-0"
                            />
                          )}
                          <SelectValue>
                            {selectedProject?.name || "临时会话"}
                          </SelectValue>
                        </span>
                        <HugeiconsIcon
                          icon={UnfoldMoreIcon}
                          className="size-3 shrink-0 text-muted-foreground"
                        />
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
                      selectedAgentId={effectiveAgentId ?? undefined}
                      defaultAgentId={defaultAgentId}
                      onSelect={({ runtimeId, agentId }) =>
                        queueConversationUpdate({ runtimeId, agentId })
                      }
                      onSetDefault={onSetDefaultAgent}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title={
                        selectedProject
                          ? `${selectedProject.name} Project Instructions`
                          : "Project Instructions"
                      }
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={handleOpenSpecDialog}
                    >
                      <HugeiconsIcon icon={File02Icon} className="size-4" />
                    </Button>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title={
                        isListening ? m.voice_input_stop() : m.voice_input()
                      }
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
                  </div>
                </div>
              </div>
            </BorderBeam>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl pt-4 pb-1">
          <div className="space-y-3">
            {selectedProject && hasProjectSpec ? (
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-xs text-sky-900 dark:text-sky-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {selectedProject.name} 的项目指令已启用
                    </div>
                    <div className="mt-1 line-clamp-2 text-sky-800/80 dark:text-sky-100/70">
                      {projectSpec}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={handleOpenSpecDialog}
                  >
                    编辑
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div ref={messagesEndRef} />
      </div>

      <AppDialog
        open={specDialogOpen}
        onOpenChange={setSpecDialogOpen}
        title={
          selectedProject
            ? `${selectedProject.name} / Project Instructions`
            : "Project Instructions"
        }
        description="直接编辑当前项目目录下的 AGENTS.md。这份文件作为项目长期说明和对外兼容指令，不再等同于动态 Rules。"
        size="xl"
        bodyClassName="space-y-4"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSpecDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectSpecDraft("")}
            >
              清空
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveSpec()}
              disabled={!projectAgentsFilePath || projectSpecSaving}
            >
              {projectSpecSaving ? "保存中..." : "保存项目指令"}
            </Button>
          </>
        }
      >
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">
              Project Instructions
            </div>
            <div className="text-xs text-muted-foreground">
              支持导入 `.md`、`.txt`、`.spec` 文档，保存时会直接覆盖项目目录里的
              `AGENTS.md`。
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => specFileInputRef.current?.click()}
            disabled={!projectAgentsFilePath}
          >
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

  const handleSelect = useCallback(
    (item: (typeof allItems)[number]) => {
      if (item.type === "none") {
        onSelect({ runtimeId: undefined, agentId: undefined });
      } else {
        onSelect({ runtimeId: item.runtimeId, agentId: item.agentId });
      }
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
            <HugeiconsIcon icon={Robot02Icon} className="size-3 shrink-0" />
          </span>
          <span className="truncate">
            {selectedAgent?.name || m.no_agent()}
          </span>
        </span>
        <HugeiconsIcon
          icon={UnfoldMoreIcon}
          className="size-3 shrink-0 text-muted-foreground"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-(--anchor-width)">
        {allItems.map((item) => {
          const isDefault =
            item.agentId !== undefined && item.agentId === defaultAgentId;

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
              {item.agentId !== undefined ? (
                <button
                  type="button"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded p-0.5 transition-colors",
                    isDefault
                      ? "text-primary"
                      : "text-muted-foreground/40 hover:text-primary",
                  )}
                  title={isDefault ? "Default agent" : m.set_as_default()}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!isDefault) {
                      onSetDefault(item.agentId);
                    }
                  }}
                >
                  <Star className={cn("size-3", isDefault && "fill-primary")} />
                </button>
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
