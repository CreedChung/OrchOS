import { HugeiconsIcon } from "@hugeicons/react";
import { Robot02Icon } from "@hugeicons/core-free-icons";

import { m } from "@/paraglide/messages";

export function ChatThinkingState() {
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
