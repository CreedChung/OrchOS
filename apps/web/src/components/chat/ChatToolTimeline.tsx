import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

function ToolStateDot({ state }: { state?: string }) {
  const tone =
    state === "output-error"
      ? "bg-destructive"
      : state === "output-denied"
        ? "bg-amber-500"
        : state === "output-available"
          ? "bg-emerald-500"
          : "bg-sky-500";

  return <span className={cn("size-1.5 rounded-full shrink-0", tone)} />;
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
  const isRunning = !state || state === "input-streaming";

  return (
    <div className="ml-2 pl-3 border-l border-border/30">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-sm px-1 py-0.5 text-xs hover:bg-muted/30 transition-colors">
          {isRunning ? (
            <Spinner size="sm" name="braille" className="shrink-0" />
          ) : (
            <ToolStateDot state={state} />
          )}
          <span className="font-mono text-[10px] text-muted-foreground/40">#{stepNumber}</span>
          <span className="font-medium text-foreground/70">{toolName}</span>
          {completedIn != null && (
            <span className="text-muted-foreground/40">{completedIn}ms</span>
          )}
          <span className="ml-auto opacity-0 group-hover:opacity-40 text-[10px] transition-opacity">›</span>
        </summary>
        <div className="mt-1 space-y-1 pl-2">
          {input !== undefined && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40 mb-0.5">Input</p>
              <pre className="overflow-x-auto rounded border border-border/25 bg-muted/15 p-2 text-[11px] leading-relaxed text-foreground/60">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output !== undefined && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40 mb-0.5">Output</p>
              <pre className="overflow-x-auto rounded border border-border/25 bg-muted/15 p-2 text-[11px] leading-relaxed text-foreground/60">
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
          {errorText && (
            <div className="rounded border border-destructive/15 bg-destructive/[0.04] px-2 py-1.5 text-[11px] text-destructive/80">
              {errorText}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
