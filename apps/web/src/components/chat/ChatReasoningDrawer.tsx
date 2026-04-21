import { Spinner } from "@/components/ui/spinner";

export function ChatReasoningDrawer({
  text,
  metadata,
}: {
  text: string;
  metadata?: { responseTime?: number };
}) {
  const summary = text.replace(/\s+/g, " ").trim().slice(0, 100);

  return (
    <details className="group ml-2">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm border border-border/30 bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/30 transition-colors">
        <Spinner size="sm" name="dots" />
        <span>Reasoning</span>
        {metadata?.responseTime != null && <span className="opacity-40">{metadata.responseTime}ms</span>}
        <span className="ml-1 opacity-40 truncate max-w-[200px]">{summary}{text.length > summary.length ? "…" : ""}</span>
        <span className="opacity-30 group-open:rotate-90 transition-transform">›</span>
      </summary>
      <div className="mt-1 ml-2 whitespace-pre-wrap rounded-sm border border-border/20 bg-muted/10 px-2.5 py-2 text-[11px] leading-5 text-foreground/50 font-mono">
        {text}
      </div>
    </details>
  );
}
