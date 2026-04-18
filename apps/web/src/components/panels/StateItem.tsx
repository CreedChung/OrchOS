import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { Status } from "@/lib/types";

interface StateItemProps {
  label: string;
  status: Status;
  actions?: string[];
  onAction?: (action: string) => void;
}

const statusLabelMap: Record<Status, () => string> = {
  success: () => m.status_success(),
  failed: () => m.status_failed(),
  error: () => m.status_error(),
  pending: () => m.status_pending(),
  running: () => m.status_running(),
  warning: () => m.status_warning(),
};

const statusPillClass: Record<Status, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-600 dark:text-red-400",
  error: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
};

export function StateItem({ label, status, actions, onAction }: StateItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 transition-colors hover:bg-accent/50">
      <span className="min-w-[90px] text-sm font-medium text-foreground">{label}</span>

      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
          statusPillClass[status],
        )}
      >
        {statusLabelMap[status]()}
      </span>

      {actions && actions.length > 0 && (
        <div className="ml-auto flex gap-1.5">
          {actions.map((action) => (
            <button
              key={action}
              onClick={() => onAction?.(action)}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
