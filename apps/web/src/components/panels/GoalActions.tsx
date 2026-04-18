import { useState } from "react";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Play,
  Pause,
  Delete02Icon,
  MoreVertical,
  CheckmarkCircleIcon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { ConfirmDialog } from "#/components/ui/confirm-dialog";
import type { Goal } from "#/lib/types";

interface GoalActionsProps {
  goal: Goal;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}

const statusConfig = {
  active: {
    icon: Play,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: () => m.goal_active(),
  },
  paused: {
    icon: Pause,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: () => m.goal_paused(),
  },
  completed: {
    icon: CheckmarkCircleIcon,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: () => m.goal_completed(),
  },
};

export function GoalActions({ goal, onPause, onResume, onDelete }: GoalActionsProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const config = statusConfig[goal.status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
          config.bg,
          config.color,
        )}
      >
        <HugeiconsIcon icon={StatusIcon} className="size-3" />
        {config.label()}
      </span>

      {(goal.status === "active" || goal.status === "paused") && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer">
            <HugeiconsIcon icon={MoreVertical} className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            {goal.status === "active" && (
              <DropdownMenuItem onClick={onPause}>
                <HugeiconsIcon icon={Pause} className="size-3.5" />
                {m.pause()}
              </DropdownMenuItem>
            )}
            {goal.status === "paused" && (
              <DropdownMenuItem onClick={onResume}>
                <HugeiconsIcon icon={Play} className="size-3.5" />
                {m.resume()}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
              {m.delete()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete_goal_confirm()}
        description={m.delete_goal_confirm()}
        onConfirm={onDelete}
        confirmLabel={m.delete()}
        variant="destructive"
      />
    </div>
  );
}
