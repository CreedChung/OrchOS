import { ScrollArea } from "@/components/ui/scroll-area";
import { HugeiconsIcon } from "@hugeicons/react";
import { useUser } from "@clerk/clerk-react";
import { type UIMessage } from "ai";
import {
  Alert01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { Problem, SidebarView } from "@/lib/types";
import { useConversationStore } from "@/lib/stores/conversation";
import { ChatThinkingState } from "@/components/chat/ChatThinkingState";
import { MessageBubble, mapConversationMessagesToUiMessages } from "@/components/chat/ConversationFlow";

interface ActivityPanelProps {
  problems: Problem[];
  collapsed: boolean;
  expanded?: boolean;
  activeView: SidebarView;
}

function buildFlowMessages(
  persistedFlowMessages: UIMessage[],
  options: {
    activeConversationId: string | null;
    pendingUserMessage?: string;
    flowDraft?: {
      id: string;
      role: "assistant";
      content: string;
      responseTime?: number;
      trace?: Parameters<typeof mapConversationMessagesToUiMessages>[0][number]["trace"];
    };
  },
) {
  return [
    ...persistedFlowMessages,
    ...(options.pendingUserMessage
      ? [
          {
            id: `pending-user-${options.activeConversationId ?? "draft"}`,
            role: "user",
            parts: [{ type: "text", text: options.pendingUserMessage }],
          } as UIMessage,
        ]
      : []),
    ...(options.flowDraft
      ? [
          {
            id: options.flowDraft.id,
            role: options.flowDraft.role,
            metadata: {
              responseTime: options.flowDraft.responseTime,
            },
            parts: mapConversationMessagesToUiMessages([
              {
                id: options.flowDraft.id,
                conversationId: options.activeConversationId ?? "",
                role: options.flowDraft.role,
                content: options.flowDraft.content,
                responseTime: options.flowDraft.responseTime,
                trace: options.flowDraft.trace,
                createdAt: new Date().toISOString(),
              },
            ])[0]?.parts ?? [],
          } as UIMessage,
        ]
      : []),
  ];
}

function getAttentionItems(problems: Problem[]) {
  return problems.filter((problem) => problem.status === "open").slice(0, 8);
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 px-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        {title}
      </div>
      <div className="h-px flex-1 bg-border/50" />
      {meta ? <div className="text-[10px] text-muted-foreground/50">{meta}</div> : null}
    </div>
  );
}

export function ActivityPanel({ problems, collapsed, expanded, activeView }: ActivityPanelProps) {
  const { user } = useUser();
  const {
    activeConversationId,
    pendingConversationId,
    flowDraftByConversationId,
    messagesByConversationId,
    pendingUserMessageByConversationId,
  } = useConversationStore();

  if (collapsed) {
    return null;
  }

  const conversationMessages = activeConversationId ? (messagesByConversationId[activeConversationId] ?? []) : [];
  const pendingUserMessage = activeConversationId ? pendingUserMessageByConversationId[activeConversationId] : undefined;
  const flowDraft = activeConversationId ? flowDraftByConversationId[activeConversationId] : undefined;
  const persistedFlowMessages = mapConversationMessagesToUiMessages(conversationMessages);
  const flowMessages = buildFlowMessages(persistedFlowMessages, {
    activeConversationId,
    pendingUserMessage,
    flowDraft,
  });
  const showPendingAssistantReply = activeConversationId !== null && pendingConversationId === activeConversationId;
  const attentionItems = getAttentionItems(problems);
  const panelContext = activeView === "creation"
    ? "当前线程态势"
    : "当前页面上下文态势";

  return (
    <aside
      className={cn(
        "flex h-full min-w-0 flex-col bg-sidebar transition-[border-color,box-shadow,opacity,transform] duration-320 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
        expanded
          ? "translate-x-0 opacity-100 shadow-[-24px_0_48px_-32px_hsl(var(--foreground)/0.22)] border-l border-transparent"
          : "translate-x-0 opacity-100 border-l border-border shadow-none",
      )}
    >
      <div className="flex h-11 items-center gap-2 border-b border-border bg-sidebar px-4">
        <div className="truncate text-sm font-medium text-foreground">工作面板</div>
        <div className="truncate text-xs text-muted-foreground">{panelContext}</div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 py-3">
          {activeView === "creation" && (flowMessages.length > 0 || showPendingAssistantReply) ? (
            <section>
              <div className="space-y-4 px-3">
                {flowMessages.map((message) => (
                  <MessageBubble key={message.id} msg={message as UIMessage} userImageUrl={user?.imageUrl} />
                ))}
                {showPendingAssistantReply ? <ChatThinkingState /> : null}
              </div>
            </section>
          ) : null}

          {attentionItems.length > 0 ? (
            <section>
              <SectionHeader title="Needs Attention" meta={`${attentionItems.length} open`} />
              <div className="space-y-2 px-3">
                {attentionItems.map((problem) => (
                  <div key={problem.id} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                    <div className="flex items-start gap-2">
                      <HugeiconsIcon
                        icon={problem.priority === "critical" ? Alert01Icon : InformationCircleIcon}
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0",
                          problem.priority === "critical" ? "text-destructive" : "text-amber-500",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-foreground/85">{problem.title}</div>
                        {problem.context ? (
                          <div className="mt-1 line-clamp-3 text-[11px] text-muted-foreground/75">{problem.context}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

        </div>
      </ScrollArea>
    </aside>
  );
}
