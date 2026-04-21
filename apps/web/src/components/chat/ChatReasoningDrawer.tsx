import { HugeiconsIcon } from "@hugeicons/react";
import { Robot02Icon } from "@hugeicons/core-free-icons";

export function ChatReasoningDrawer({
  text,
  metadata,
}: {
  text: string;
  metadata?: { responseTime?: number };
}) {
  const summary = text.replace(/\s+/g, " ").trim().slice(0, 140);

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
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>State: available</span>
                {metadata?.responseTime != null && <span>Duration: {metadata.responseTime}ms</span>}
              </div>
              {summary && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {summary}
                  {text.length > summary.length ? "..." : ""}
                </p>
              )}
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
