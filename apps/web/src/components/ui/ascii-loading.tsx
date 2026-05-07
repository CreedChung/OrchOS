import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface AsciiLoadingProps {
  label: string;
  className?: string;
  chipClassName?: string;
  textClassName?: string;
}

export function AsciiLoading({
  label,
  className,
  chipClassName,
  textClassName,
}: AsciiLoadingProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span
        className={cn(
          "inline-flex size-[18px] items-center justify-center rounded bg-muted text-muted-foreground",
          chipClassName,
        )}
      >
        <Spinner size="sm" name="braille" />
      </span>
      <span className={textClassName}>{label}</span>
    </div>
  );
}
