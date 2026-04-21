import { cn } from "@/lib/utils";

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

function ToolStepIndicator({ state }: { state?: string }) {
  const tone =
    state === "output-error"
      ? "bg-destructive ring-destructive/20"
      : state === "output-denied"
        ? "bg-amber-500 ring-amber-500/20"
        : state === "output-available"
          ? "bg-emerald-500 ring-emerald-500/20"
          : "bg-sky-500 ring-sky-500/20";

  return (
    <span className={cn("relative inline-flex size-3 rounded-full ring-4", tone)}>
      <span className="absolute inset-0 rounded-full bg-white/25" />
    </span>
  );
}

export function ChatToolTimeline({
  part,
  stepNumber,
}: {
  part: Record<string, unknown> & { type: string };
  stepNumber: number;
}) {
  const toolName = part.type.startsWith("tool-") ? part.type.replace(/^tool-/, "") : part.type;
  const state = typeof part.state === "string" ? part.state : undefined;
  const input = "input" in part ? part.input : undefined;
  const output = "output" in part ? part.output : undefined;
  const errorText = typeof part.errorText === "string" ? part.errorText : undefined;
  const completedIn =
    output && typeof output === "object" && "responseTime" in output && typeof output.responseTime === "number"
      ? output.responseTime
      : undefined;

  return (
    <div className="relative pl-8">
      <span className="absolute top-3 bottom-3 left-[0.3125rem] w-px bg-border/70" />
      <span className="absolute top-3 left-0">
        <ToolStepIndicator state={state} />
      </span>
      <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-linear-to-b from-muted/35 to-background shadow-[0_10px_28px_-22px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground">
              <span className="text-[11px] font-semibold text-foreground">{stepNumber}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Execution step
              </p>
              <p className="truncate text-sm font-medium text-foreground">{toolName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {completedIn != null && (
              <span className="text-[11px] text-muted-foreground">{completedIn}ms</span>
            )}
            <ToolStateLabel state={state} />
          </div>
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
    </div>
  );
}
