import type { ReactNode } from "react";

type ProgressiveBlurProps = {
  className?: string;
  children: ReactNode;
};

const ProgressiveBlur = ({ className = "", children }: ProgressiveBlurProps) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border shadow-sm ${className}`}
    >
      {/* 顶部模糊 */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 w-full select-none"
        style={{
          height: "120px",
          background: "linear-gradient(to top, transparent, var(--background))",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 50%, transparent)",
          WebkitBackdropFilter: "blur(8px)",
          backdropFilter: "blur(8px)",
        }}
      />
      {/* 底部模糊 */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 z-10 w-full select-none"
        style={{
          height: "120px",
          background: "linear-gradient(to bottom, transparent, var(--background))",
          maskImage: "linear-gradient(to top, rgba(0,0,0,1) 50%, transparent)",
          WebkitBackdropFilter: "blur(8px)",
          backdropFilter: "blur(8px)",
        }}
      />
      {/* 可滚动内容 */}
      <div className="h-[600px] overflow-y-auto px-6 py-8">{children}</div>
    </div>
  );
};

export { ProgressiveBlur };
