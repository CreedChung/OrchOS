import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Robot02Icon,
  GitPullRequestIcon,
  SquareIcon,
  InformationCircleIcon,
  Alert01Icon,
  CheckmarkBadge01Icon,
} from "@hugeicons/core-free-icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { m } from "@/paraglide/messages";
import type { InboxThread, InboxThreadKind } from "@/lib/api";

const kindConfig: Record<
  InboxThreadKind,
  { icon: typeof Robot02Icon; label: string; colorClass: string; bgClass: string }
> = {
  agent_request: {
    icon: Robot02Icon,
    label: m.agent_request(),
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
  },
  pull_request: {
    icon: GitPullRequestIcon,
    label: m.pull_request(),
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
  },
  issue: {
    icon: SquareIcon,
    label: m.issue(),
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-500/10",
  },
  mention: {
    icon: InformationCircleIcon,
    label: m.mention(),
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
  },
  system_alert: {
    icon: Alert01Icon,
    label: "System",
    colorClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/10",
  },
};

interface InboxListProps {
  threads: InboxThread[];
  activeInboxId: string | null;
  projectNameById: Map<string, string>;
  onSelectItem: (id: string) => void;
}

export function InboxList({ threads, activeInboxId, projectNameById, onSelectItem }: InboxListProps) {
  return (
    <div className="flex h-full w-80 flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-semibold text-foreground">{m.inbox()}</h2>
        {threads.length > 0 && <span className="text-[10px] tabular-nums text-muted-foreground">{threads.length}</span>}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {threads.map((thread) => {
            const config = kindConfig[thread.kind];
            const isActive = thread.id === activeInboxId;

            return (
              <button
                key={thread.id}
                onClick={() => onSelectItem(thread.id)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-accent/50",
                )}
              >
                <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", config.bgClass)}>
                  <HugeiconsIcon icon={config.icon} className={cn("size-3.5", config.colorClass)} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-medium truncate", isActive && "text-accent-foreground")}>
                    {thread.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant="outline" className="h-4 px-1 py-0 text-[9px]">
                      {config.label}
                    </Badge>
                    <Badge variant="outline" className="h-4 px-1 py-0 text-[9px] uppercase">
                      {thread.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {thread.projectId && (
                    <p className="mt-1 text-[10px] font-medium text-foreground/65">
                      {projectNameById.get(thread.projectId) || thread.projectId}
                    </p>
                  )}
                  {thread.summary && <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground/70">{thread.summary}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground/60">
                    {thread.createdByName} · {thread.lastMessageAt.split("T")[1]?.slice(0, 5) || ""}
                  </p>
                </div>
              </button>
            );
          })}

          {threads.length === 0 && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                <HugeiconsIcon icon={CheckmarkBadge01Icon} className="size-5 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground">{m.inbox_is_empty()}</p>
              <p className="mt-1 text-xs text-muted-foreground/60">{m.no_new_items()}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
