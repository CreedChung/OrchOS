import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";

type SidebarHeaderProps = {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  title: ReactNode;
  count?: ReactNode;
};

export function SidebarHeader({ icon, title, count }: SidebarHeaderProps) {
  return (
    <div className="flex h-11 items-center justify-between border-b border-border px-3">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={icon} className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {count !== undefined ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      ) : null}
    </div>
  );
}
