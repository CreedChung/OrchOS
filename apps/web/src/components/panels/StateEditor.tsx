import { useState } from "react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit02Icon, Tick02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Status, StateItem } from "@/lib/types";

interface StateEditorProps {
  state: StateItem;
  onStatusChange: (newStatus: Status) => void;
}

const statusOptions: Status[] = ["pending", "running", "success", "failed", "error", "warning"];

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

export function StateEditor({ state, onStatusChange }: StateEditorProps) {
  const [editing, setEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status>(state.status);

  const handleSave = () => {
    onStatusChange(selectedStatus);
    setEditing(false);
  };

  const handleCancel = () => {
    setSelectedStatus(state.status);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-card px-3 py-2">
        <span className="min-w-[90px] text-sm font-medium text-foreground">{state.label}</span>
        <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as Status)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabelMap[status]()}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <button
          onClick={handleSave}
          className="rounded p-1 text-emerald-500 hover:bg-emerald-500/10"
          title={m.save()}
        >
          <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
        </button>
        <button
          onClick={handleCancel}
          className="rounded p-1 text-red-500 hover:bg-red-500/10"
          title={m.cancel()}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 transition-colors hover:bg-accent/50">
      <span className="min-w-[90px] text-sm font-medium text-foreground">{state.label}</span>

      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
          statusPillClass[state.status],
        )}
      >
        {statusLabelMap[state.status]()}
      </span>

      <div className="ml-auto flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={m.edit_status()}
        >
          <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
