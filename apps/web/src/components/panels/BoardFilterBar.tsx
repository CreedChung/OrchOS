import { cn } from "@/lib/utils";
import type { ConversationBoardFilter } from "./BoardView";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  File02Icon,
  PlayCircleIcon,
  InformationCircleIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

const conversationBoardColumns: Array<{
  id: ConversationBoardFilter;
  label: string;
  icon: typeof File02Icon;
  tone: string;
}> = [
  {
    id: "all",
    label: "全部",
    icon: Menu01Icon,
    tone: "",
  },
  {
    id: "planning",
    label: "计划中",
    icon: File02Icon,
    tone: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "in_progress",
    label: "进行中",
    icon: PlayCircleIcon,
    tone: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "review",
    label: "待审查",
    icon: InformationCircleIcon,
    tone: "text-violet-600 dark:text-violet-400",
  },
  {
    id: "completed",
    label: "已完成",
    icon: CheckmarkCircle02Icon,
    tone: "text-emerald-600 dark:text-emerald-400",
  },
];

interface BoardFilterBarProps {
  boardFilter: ConversationBoardFilter;
  onBoardFilterChange: (filter: ConversationBoardFilter) => void;
  boardCardsCount?: number;
}

export function BoardFilterBar({
  boardFilter,
  onBoardFilterChange,
  boardCardsCount,
}: BoardFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <button
        type="button"
        onClick={() => onBoardFilterChange("all")}
        aria-pressed={boardFilter === "all"}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
          boardFilter === "all"
            ? "border-border bg-foreground text-background"
            : "border-border/50 bg-background text-muted-foreground hover:text-foreground",
        )}
      >
        <HugeiconsIcon icon={Menu01Icon} className="size-3.5" />
        全部
        {boardCardsCount !== undefined && (
          <span className="rounded-full bg-background/15 px-1.5 py-0.5 text-[10px] tabular-nums text-inherit">
            {boardCardsCount}
          </span>
        )}
      </button>

      {conversationBoardColumns
        .filter((col) => col.id !== "all")
        .map((column) => {
          return (
              <button
                key={column.id}
                type="button"
                onClick={() => onBoardFilterChange(column.id as ConversationBoardFilter)}
                aria-pressed={boardFilter === column.id}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                  boardFilter === column.id
                    ? cn("border-transparent", column.bgAccent, column.tone)
                    : "border-border/50 bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <HugeiconsIcon icon={column.icon} className={cn("size-3.5", boardFilter === column.id ? column.tone : "")} />
                {column.label}
                {boardCardsCount !== undefined && (
                  <span className="rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px] tabular-nums text-inherit">
                    {count}
                  </span>
                )}
              </button>
          );
        })}
    </div>
  );
}
