import { Spinner } from "@/components/ui/spinner";

import { m } from "@/paraglide/messages";

export function ChatThinkingState() {
  return (
    <div className="flex items-center gap-2 pr-6">
      <span className="inline-flex size-[18px] shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
        <Spinner size="sm" name="braille" />
      </span>
      <span className="text-[11px] text-muted-foreground">{m.thinking()}</span>
    </div>
  );
}
