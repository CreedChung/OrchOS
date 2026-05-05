import { useState, useEffect } from "react";
import spinners from "unicode-animations";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  name?: keyof typeof spinners;
  className?: string;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-3xl",
  xl: "text-6xl",
};

export function Spinner({ size = "md", name = "braille", className }: SpinnerProps) {
  const s = spinners[name] ?? spinners.braille;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setFrame((f) => (f + 1) % s.frames.length),
      s.interval,
    );
    return () => clearInterval(timer);
  }, [name, s.frames.length, s.interval]);

  return (
    <span
      className={cn("inline-block font-mono leading-none", sizeClasses[size], className)}
      aria-hidden="true"
    >
      {s.frames[frame]}
    </span>
  );
}
