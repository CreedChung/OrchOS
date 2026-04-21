import { HugeiconsIcon } from "@hugeicons/react";
import { Chat01Icon, Robot02Icon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function ChatMessageShell({
  role,
  isError,
  responseTime,
  children,
}: {
  role: "user" | "assistant";
  isError?: boolean;
  responseTime?: number;
  children: ReactNode;
}) {
  const isUser = role === "user";

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
                <span>{isUser ? "Prompt" : isError ? "Failed response" : "Generated response"}</span>
                {responseTime && <span>{responseTime}ms</span>}
              </div>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
            {isUser ? "Input" : "Output"}
          </div>
        </div>
        <div className="space-y-4 px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
