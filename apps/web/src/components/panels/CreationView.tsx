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
import { createHighlighter } from "shiki";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "border-beam";
import { ArchiveRestore, ArchiveX, Check, Copy } from "lucide-react";
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
import type { AgentProfile, Project, RuntimeProfile } from "@/lib/types";
import { m } from "@/paraglide/messages";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import type { CreationArchiveFilter } from "@/components/layout/Toolbar";

interface CreationViewProps {
  agents: AgentProfile[];
  runtimes: RuntimeProfile[];
  projects: Project[];
  archiveFilter: CreationArchiveFilter;
}

const CHAT_CODE_LANGS = [
  "tsx",
  "typescript",
  "javascript",
  "jsx",
  "json",
  "css",
  "scss",
  "html",
  "markdown",
  "md",
  "bash",
  "shell",
  "diff",
];

let chatHighlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getChatHighlighter() {
  if (!chatHighlighterPromise) {
    chatHighlighterPromise = createHighlighter({
      langs: CHAT_CODE_LANGS,
      themes: ["github-dark", "github-light"],
    });
  }

  return chatHighlighterPromise;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeCodeLanguage(lang: string) {
  if (lang === "tsx") return "typescript";
  if (lang === "ts") return "typescript";
  if (lang === "js") return "javascript";
  if (lang === "md") return "markdown";
  if (lang === "sh") return "bash";
  return lang;
}

function useResolvedTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", updateTheme);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateTheme);
    };
  }, []);

  return theme;
}

function ChatCodeBlock({ code, language }: { code: string; language?: string }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const resolvedTheme = useResolvedTheme();

  useEffect(() => {
    let mounted = true;

    async function highlight() {
      try {
        setLoading(true);
        const highlighter = await getChatHighlighter();
        const highlightedHtml = highlighter.codeToHtml(code, {
          lang: normalizeCodeLanguage(language || "text"),
          theme: resolvedTheme === "dark" ? "github-dark" : "github-light",
        });

        if (mounted) {
          setHtml(highlightedHtml);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
          setLoading(false);
        }
      }
    }

    void highlight();

    return () => {
      mounted = false;
    };
  }, [code, language, resolvedTheme]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [code]);

  return (
    <>
      <style>{`
        .chat-code-block {
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 1rem;
          background: var(--card);
        }
        .chat-code-block pre {
          margin: 0;
          padding: 1rem;
          overflow-x: auto;
          background: transparent !important;
          font-size: 0.8125rem;
          line-height: 1.55;
          white-space: pre;
        }
        .chat-code-block code {
          background: transparent;
          padding: 0;
          border-radius: 0;
          font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: inherit;
          line-height: inherit;
          white-space: pre;
        }
      `}</style>
      <div className="my-3 overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {language || "text"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => {
              void handleCopy();
            }}
            title="Copy code"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
        <div className="chat-code-block">
          {loading ? (
            <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
              {m.loading()}
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </>
  );
}

function MessageMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-inherit dark:prose-invert prose-headings:mb-2 prose-headings:mt-5 prose-headings:text-inherit prose-headings:font-semibold prose-p:my-2 prose-p:text-inherit prose-p:leading-7 prose-li:my-1 prose-li:text-inherit prose-strong:text-inherit prose-code:rounded-md prose-code:bg-black/6 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.8rem] prose-code:text-inherit prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-blockquote:border-l-border prose-blockquote:text-inherit prose-hr:border-border/70 prose-a:font-medium prose-a:text-primary prose-a:no-underline hover:prose-a:underline dark:prose-code:bg-white/8">
      <ReactMarkdown
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              className="font-medium text-primary underline-offset-4 hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            />
          ),
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-([\w-]+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");

            if (!inline) {
              return <ChatCodeBlock code={code} language={match?.[1]} />;
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="mr-14 w-full max-w-[min(100%,44rem)] rounded-[1.75rem] border border-border/70 bg-linear-to-b from-card to-card/80 px-4 py-4 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.45)]">
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex size-8 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary">
          <HugeiconsIcon icon={Robot02Icon} className="size-4" />
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium tracking-[0.02em] text-foreground">{m.assistant()}</span>
          <span className="flex items-center gap-1.5 rounded-full bg-primary/8 px-2 py-1 text-[11px] text-primary/90">
            <span className="size-1.5 animate-pulse rounded-full bg-primary/70" />
            {m.thinking()}
          </span>
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="h-3 w-[72%] animate-pulse rounded-full bg-muted/90" />
        <div className="h-3 w-[88%] animate-pulse rounded-full bg-muted/80" />
        <div className="h-3 w-[54%] animate-pulse rounded-full bg-muted/70" />
      </div>
    </div>
  );
}

function ToolStateLabel({ state }: { state?: string }) {
  if (!state) return null;

  const label =
    state === "input-available"
      ? "Input ready"
      : state === "output-available"
        ? "Output ready"
        : state === "input-streaming"
          ? "Collecting input"
          : state === "output-error"
            ? "Tool error"
            : state === "output-denied"
              ? "Denied"
              : state;

  return (
    <span className="rounded-full border border-border/70 bg-background/80 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </span>
  );
}

function ToolPartCard({ part }: { part: Record<string, unknown> & { type: string } }) {
  const toolName = part.type.startsWith("tool-") ? part.type.replace(/^tool-/, "") : part.type;
  const state = typeof part.state === "string" ? part.state : undefined;
  const input = "input" in part ? part.input : undefined;
  const output = "output" in part ? part.output : undefined;
  const errorText = typeof part.errorText === "string" ? part.errorText : undefined;

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-linear-to-b from-muted/35 to-background shadow-[0_10px_28px_-22px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground">
            <HugeiconsIcon icon={Robot02Icon} className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Tool step
            </p>
            <p className="truncate text-sm font-medium text-foreground">{toolName}</p>
          </div>
        </div>
        <ToolStateLabel state={state} />
      </div>
      <div className="space-y-3 px-4 py-4 text-sm">
        {input !== undefined && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/90">
              Input
            </p>
            <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-background/90 p-3 text-xs leading-relaxed text-foreground shadow-inner">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
        )}
        {output !== undefined && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/90">
              Output
            </p>
            <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-background/90 p-3 text-xs leading-relaxed text-foreground shadow-inner">
              {JSON.stringify(output, null, 2)}
            </pre>
          </div>
        )}
        {errorText && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.06] px-3 py-3 text-xs leading-relaxed text-destructive">
            {errorText}
          </div>
        )}
      </div>
    </div>
  );
}

function ReasoningPartCard({ text }: { text: string }) {
  return (
    <details className="group overflow-hidden rounded-[1.4rem] border border-border/70 bg-linear-to-b from-muted/22 to-background">
      <summary className="cursor-pointer list-none select-none px-4 py-3 text-left transition-colors hover:bg-accent/35">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground">
              <HugeiconsIcon icon={Robot02Icon} className="size-4" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Reasoning
              </p>
              <p className="text-sm font-medium text-foreground">Model thought process</p>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground transition-transform group-open:rotate-90">
            &gt;
          </span>
        </div>
      </summary>
      <div className="border-t border-border/60 px-4 py-4">
        <div className="rounded-2xl border border-border/60 bg-background/75 px-4 py-3 whitespace-pre-wrap text-sm leading-7 text-foreground/80">
          {text}
        </div>
      </div>
    </details>
  );
}

function MessageBubble({ msg }: { msg: UIMessage }) {
  const isUser = msg.role === "user";
  const metadata = (msg.metadata ?? {}) as { responseTime?: number; error?: string };
  const isError = Boolean(metadata.error);

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "w-full max-w-[min(100%,48rem)] overflow-hidden rounded-[1.9rem] border shadow-[0_18px_48px_-30px_rgba(0,0,0,0.45)] backdrop-blur-sm",
          isUser
            ? "ml-18 border-primary/15 bg-linear-to-br from-primary/[0.085] to-primary/[0.04]"
            : isError
              ? "mr-14 border-destructive/20 bg-linear-to-b from-destructive/[0.09] to-destructive/[0.04]"
              : "mr-14 border-border/70 bg-linear-to-b from-card to-card/85",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full border",
                isUser
                  ? "border-primary/20 bg-primary/12 text-primary"
                  : isError
                    ? "border-destructive/20 bg-destructive/10 text-destructive"
                    : "border-primary/15 bg-primary/10 text-primary",
              )}
            >
              <HugeiconsIcon icon={isUser ? Chat01Icon : Robot02Icon} className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium tracking-[0.01em] text-foreground">
                {isUser ? m.user() : m.assistant()}
              </p>
              <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
                <span>
                  {isUser ? "Prompt" : isError ? "Failed response" : "Generated response"}
                </span>
                {metadata.responseTime && <span>{metadata.responseTime}ms</span>}
              </div>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
            {isUser ? "Input" : "Output"}
          </div>
        </div>
        <div className="space-y-4 px-4 py-4">
          {msg.parts.map((part, index) => {
            if (part.type === "text") {
              return (
                <div
                  key={`${msg.id}-${index}`}
                  className={cn(
                    "rounded-[1.35rem] border px-4 py-3",
                    isUser
                      ? "border-primary/12 bg-background/60"
                      : "border-border/60 bg-background/72",
                  )}
                >
                  <MessageMarkdown content={part.text} />
                </div>
              );
            }

            if (part.type === "reasoning") {
              return <ReasoningPartCard key={`${msg.id}-${index}`} text={part.text} />;
            }

            if (part.type.startsWith("tool-")) {
              return (
                <ToolPartCard
                  key={`${msg.id}-${index}`}
                  part={part as Record<string, unknown> & { type: string }}
                />
              );
            }

            return null;
          })}
        </div>
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

export function CreationView({ agents, runtimes, projects, archiveFilter }: CreationViewProps) {
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
            onUpdateConversation={handleUpdateConversation}
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
  onUpdateConversation,
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
            onSelect={(runtimeId) => onUpdateConversation(conversation.id, { runtimeId })}
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
          {sending && <ThinkingBubble />}
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
            <div className="relative flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2">
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
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
                className="shrink-0 text-muted-foreground hover:text-foreground"
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
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                rows={1}
                onKeyDown={handleKeys}
                spellCheck={false}
                disabled={sending}
                style={{ maxHeight: "120px" }}
                onInput={syncTextareaHeight}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title={isListening ? m.voice_input_stop() : m.voice_input()}
                className={cn(
                  "shrink-0 text-muted-foreground hover:text-foreground",
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
                className="shrink-0"
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
  onSelect: (runtimeId?: string) => void;
}

function RuntimeSelector({ runtimes, agents, selectedId, onSelect }: RuntimeSelectorProps) {
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
              {allItems.map((item) => (
                <button
                  key={item.id}
                  ref={(node) => {
                    itemRefs.current[item.id] = node;
                  }}
                  type="button"
                  className={cn(
                    selectItemClassName,
                    "cursor-pointer whitespace-nowrap transition-colors",
                    selectedId === item.value
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-accent/50",
                  )}
                  onMouseEnter={() => handleItemHover(item.id)}
                  onClick={() => handleSelect(item.value)}
                >
                  {item.name}
                </button>
              ))}
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
