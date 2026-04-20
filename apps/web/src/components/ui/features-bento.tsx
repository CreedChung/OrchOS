import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  Cancel01Icon,
  Loading01Icon,
  Robot02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { RuntimeProfile } from "@/lib/types";

const MOCK_RUNTIME: RuntimeProfile = {
  id: "mock-runtime-01",
  name: "OrchOS Agent",
  command: "orchos",
  version: "0.1.0",
  role: "assistant",
  capabilities: ["chat", "code", "debug"],
  model: "claude-4-sonnet",
  protocol: "acp",
  transport: "stdio",
  acpCommand: "orchos-acp",
  acpArgs: [],
  acpEnv: {},
  communicationMode: "acp-native",
  enabled: true,
  status: "idle",
};

const MOCK_RESPONSES: Record<string, string> = {
  default:
    "I'm OrchOS Agent, your AI assistant. I can help you orchestrate agents, manage goals, and automate workflows. What would you like to do?",
  "what can you do":
    "I can help you with:\n\n1. **Agent Management** — Create, configure, and coordinate multiple AI agents\n2. **Goal Tracking** — Set goals and let agents work toward them autonomously\n3. **Code Generation** — Write, review, and refactor code across your projects\n4. **Debugging** — Identify and fix issues in your codebase\n5. **Integrations** — Connect with GitHub, Slack, Linear, Sentry, and more\n\nWhat would you like to explore?",
  help: "Here's how to get started with OrchOS:\n\n1. **Create a Goal** — Define what you want to achieve\n2. **Assign Agents** — Let OrchOS match the right agents to your goal\n3. **Monitor Progress** — Track status in real-time from the dashboard\n4. **Review Results** — Check outputs, PRs, and test results\n\nTry asking me about any of these topics!",
};

const MOCK_INPUT = "What can you do?";

function getMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase().trim();
  for (const [key, response] of Object.entries(MOCK_RESPONSES)) {
    if (key !== "default" && lower.includes(key)) {
      return response;
    }
  }
  return MOCK_RESPONSES.default;
}

interface AskMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: string;
  responseTime?: number;
}

export function FeaturesBento() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [input, setInput] = useState(MOCK_INPUT);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedRuntime: RuntimeProfile | null = MOCK_RUNTIME.enabled ? MOCK_RUNTIME : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }

      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !selectedRuntime || sending) return;

    const userMessage: AskMessage = {
      id: `ask_${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    const startTime = Date.now();

    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));

    const responseContent = getMockResponse(userMessage.content);
    const responseTime = Date.now() - startTime;

    setMessages((prev) => [
      ...prev,
      {
        id: `ask_${Date.now()}_response`,
        role: "assistant",
        content: responseContent,
        responseTime,
      },
    ]);
    setSending(false);
  }, [input, selectedRuntime, sending]);

  return (
    <>
      <section className="dark:bg-muted/25 bg-zinc-50 flex items-center justify-center py-16 md:py-24 min-h-screen">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="mx-auto grid gap-2 sm:grid-cols-5">
            {/* Main: Multi-Agent Coordination */}
            <Card className="group overflow-hidden shadow-black/5 sm:col-span-3 sm:rounded-none sm:rounded-tl-xl">
              <CardHeader>
                <div className="md:px-4 md:pt-4 md:pb-2">
                  <p className="font-medium">{m.feature_agents_title()}</p>
                  <p className="text-muted-foreground mt-3 max-w-sm text-sm">
                    {m.feature_agents_desc()}
                  </p>
                </div>
              </CardHeader>

              <div className="relative pl-6 md:pl-10">
                <div className="bg-background h-44 overflow-hidden rounded-tl-lg border-l border-t pl-2 pt-2 dark:bg-zinc-950 sm:h-52 md:h-56">
<img
                    src="/bento1.png"
                    className="shadow h-full w-full object-cover object-top dark:hidden"
                    alt="Dashboard light"
                    width={1207}
                    height={929}
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    src="/bento1-dark.png"
                    className="hidden h-full w-full object-cover object-top dark:block"
                    alt="Dashboard dark"
                    width={1207}
                    height={929}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </Card>

            {/* Top Right: Goal-Driven Workflows */}
            <Card className="group h-full overflow-hidden shadow-zinc-950/5 sm:col-span-2 sm:rounded-none sm:rounded-tr-xl">
              <p className="mx-auto my-4 max-w-md text-balance px-6 text-center text-lg font-semibold sm:text-2xl md:px-6 md:pt-4 md:pb-2">
                {m.feature_goals_title()}
              </p>

              <CardContent className="mt-auto flex-1">
                <div className="relative h-full">
                  <div className="h-44 overflow-hidden rounded-r-lg border sm:h-52 md:h-56">
<img
                      src="/bento2.png"
                      className="shadow dark:hidden w-full h-full object-cover"
                      alt="Analytics light"
                      width={1207}
                      height={929}
                      loading="lazy"
                      decoding="async"
                    />
                    <img
                      src="/bento2-dark.png"
                      className="hidden dark:block w-full h-full object-cover"
                      alt="Analytics dark"
                      width={1207}
                      height={929}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Left: Hotkeys */}
            <Card
              className="group cursor-pointer p-5 shadow-black/5 sm:col-span-2 sm:rounded-none sm:rounded-bl-xl md:p-8"
              onClick={() => setOpen(true)}
            >
              <p className="mx-auto mb-8 max-w-md text-balance text-center text-lg font-semibold sm:text-2xl">
                {m.ai_ask()}
              </p>

              <div className="flex justify-center gap-4">
                <div className="inset-shadow-sm dark:inset-shadow-white/5 bg-muted/35 relative flex aspect-square size-14 items-center rounded-[7px] border p-3 shadow-lg ring dark:shadow-white/5 dark:ring-black">
                  <span className="absolute right-2 top-1 block text-sm">⌘</span>
                  <HugeiconsIcon icon={Robot02Icon} className="mt-auto size-4 text-primary" />
                </div>
                <div className="inset-shadow-sm dark:inset-shadow-white/5 bg-muted/35 flex aspect-square size-14 items-center justify-center rounded-[7px] border p-3 shadow-lg ring dark:shadow-white/5 dark:ring-black">
                  <span className="font-semibold">K</span>
                </div>
              </div>
            </Card>

            {/* Bottom Right: Integrations */}
            <Card className="group relative shadow-black/5 sm:col-span-3 sm:rounded-none sm:rounded-br-xl">
              <CardHeader className="p-5 md:px-8 md:pt-6 md:pb-4">
                <p className="font-medium">{m.integrations_heading()}</p>
                <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                  {m.connect_services_desc()}
                </p>
              </CardHeader>
              <CardContent className="relative px-5 pb-5 md:px-8 md:pb-8">
                <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
                  <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border p-3">
                    <img
                      className="m-auto size-6 invert dark:invert-0 md:size-7"
                      src="https://simpleicons.org/icons/github.svg"
                      alt="GitHub logo"
                      width={32}
                      height={32}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="rounded-(--radius) bg-muted/50 flex aspect-square items-center justify-center border p-3">
                    <img
                      className="m-auto size-6 invert dark:invert-0 md:size-7"
                      src="https://simpleicons.org/icons/slack.svg"
                      alt="Slack logo"
                      width={32}
                      height={32}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="rounded-(--radius) bg-muted/50 flex aspect-square items-center justify-center border p-3">
                    <img
                      className="m-auto size-6 invert dark:invert-0 md:size-7"
                      src="https://simpleicons.org/icons/linear.svg"
                      alt="Linear logo"
                      width={32}
                      height={32}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border p-3">
                    <img
                      className="m-auto size-6 invert dark:invert-0 md:size-7"
                      src="https://simpleicons.org/icons/sentry.svg"
                      alt="Sentry logo"
                      width={32}
                      height={32}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="rounded-[var(--radius)] aspect-square border border-dashed" />
                  <div className="rounded-[var(--radius)] aspect-square border border-dashed" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Robot02Icon} className="size-4 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{m.ai_ask()}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedRuntime
                      ? `Fixed chat with ${selectedRuntime.name}`
                      : m.no_agents_available()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              </button>
            </div>

            <div className="flex h-[520px] flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                    <HugeiconsIcon icon={Robot02Icon} className="size-6 opacity-20" />
                    <p className="text-sm text-foreground">{m.ai_ask()}</p>
                    <p className="max-w-sm text-xs text-muted-foreground/70">
                      {selectedRuntime
                        ? `Start a fixed conversation with ${selectedRuntime.name}.`
                        : m.no_agents_available()}
                    </p>
                  </div>
                ) : null}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded-xl px-4 py-3 text-sm",
                      message.role === "user"
                        ? "ml-12 bg-primary/10 text-foreground"
                        : message.error
                          ? "mr-12 bg-destructive/10 text-destructive"
                          : "mr-12 bg-muted text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </p>
                    {message.responseTime ? (
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {message.responseTime}ms
                      </p>
                    ) : null}
                  </div>
                ))}

                {sending ? (
                  <div className="mr-12 rounded-xl bg-muted px-4 py-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <HugeiconsIcon icon={Loading01Icon} className="size-4 animate-spin" />
                      <span className="text-xs">{m.thinking()}</span>
                    </div>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend();
                }}
                className="border-t border-border px-5 py-4"
              >
                <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-3">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      selectedRuntime ? `Ask ${selectedRuntime.name}...` : m.no_agents_available()
                    }
                    className="min-h-[68px] max-h-[220px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                    disabled={!selectedRuntime || sending}
                    rows={1}
                    spellCheck={false}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setOpen(false);
                      }
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon-sm"
                    disabled={!input.trim() || !selectedRuntime || sending}
                    className="mb-1 shrink-0"
                  >
                    {sending ? (
                      <HugeiconsIcon icon={Loading01Icon} className="size-3.5 animate-spin" />
                    ) : (
                      <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                    )}
                  </Button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
                  Enter to send · Shift+Enter for new line · {selectedRuntime?.name || m.ai_ask()}
                </p>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
