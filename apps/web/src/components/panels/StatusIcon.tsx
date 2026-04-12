import type { Status } from "#/lib/types"
import { cn } from "#/lib/utils"

interface StatusIconProps {
  status: Status
  className?: string
}

const statusConfig: Record<Status, { icon: string; colorClass: string }> = {
  success: { icon: "✓", colorClass: "text-emerald-500" },
  failed: { icon: "✗", colorClass: "text-red-500" },
  error: { icon: "!", colorClass: "text-amber-500" },
  pending: { icon: "○", colorClass: "text-muted-foreground" },
  running: { icon: "◉", colorClass: "text-blue-500 animate-pulse" },
  warning: { icon: "▲", colorClass: "text-yellow-500" },
}

export function StatusIcon({ status, className }: StatusIconProps) {
  const config = statusConfig[status]
  return (
    <span className={cn("font-mono text-sm font-bold leading-none", config.colorClass, className)}>
      {config.icon}
    </span>
  )
}
