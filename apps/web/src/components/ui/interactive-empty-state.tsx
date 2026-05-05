import { type ReactNode, memo, useId, forwardRef } from "react";
import { motion, LazyMotion, domAnimation } from "motion/react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICON_VARIANTS = {
  left: {
    initial: { scale: 0.8, opacity: 0, x: 0, y: 0, rotate: 0 },
    animate: { scale: 1, opacity: 1, x: 0, y: 0, rotate: -6, transition: { duration: 0.4, delay: 0.1 } },
    hover: { x: -22, y: -5, rotate: -15, scale: 1.1, transition: { duration: 0.2 } },
  },
  center: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
    hover: { y: -10, scale: 1.15, transition: { duration: 0.2 } },
  },
  right: {
    initial: { scale: 0.8, opacity: 0, x: 0, y: 0, rotate: 0 },
    animate: { scale: 1, opacity: 1, x: 0, y: 0, rotate: 6, transition: { duration: 0.4, delay: 0.3 } },
    hover: { x: 22, y: -5, rotate: 15, scale: 1.1, transition: { duration: 0.2 } },
  },
} as const;

const CONTENT_VARIANTS = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
};

const BUTTON_VARIANTS = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, delay: 0.3 } },
};

const themeStyles = {
  iconContainer: {
    dark: "bg-neutral-800 border border-neutral-700 group-hover:shadow-xl group-hover:border-neutral-600",
    neutral: "bg-stone-100 border border-stone-200 group-hover:shadow-xl group-hover:border-stone-300",
    light: "bg-white border border-gray-200 group-hover:shadow-xl group-hover:border-gray-300",
  },
  iconColor: {
    dark: "text-neutral-400 group-hover:text-neutral-200",
    neutral: "text-stone-500 group-hover:text-stone-700",
    light: "text-gray-500 group-hover:text-gray-700",
  },
} as const;

type Theme = "light" | "dark" | "neutral";

const IconContainer = memo(function IconContainer({
  children,
  variant,
  className = "",
  theme = "light",
}: {
  children: ReactNode;
  variant: keyof typeof ICON_VARIANTS;
  className?: string;
  theme?: Theme;
}) {
  return (
    <motion.div
      variants={ICON_VARIANTS[variant]}
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center relative shadow-lg transition-all duration-300",
        themeStyles.iconContainer[theme],
        className,
      )}
    >
      <div className={cn("text-sm transition-colors duration-300", themeStyles.iconColor[theme])}>
        {children}
      </div>
    </motion.div>
  );
});

const MultiIconDisplay = memo(function MultiIconDisplay({
  icons,
  theme,
}: {
  icons: ReactNode[];
  theme?: Theme;
}) {
  if (icons.length < 3) return null;

  return (
    <div className="flex justify-center isolate relative">
      <IconContainer variant="left" className="left-2 top-1 z-10" theme={theme}>
        {icons[0]}
      </IconContainer>
      <IconContainer variant="center" className="z-20" theme={theme}>
        {icons[1]}
      </IconContainer>
      <IconContainer variant="right" className="right-2 top-1 z-10" theme={theme}>
        {icons[2]}
      </IconContainer>
    </div>
  );
});

function Background() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500"
      style={{
        backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.8) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}

const emptyStateVariants = {
  default: {
    light: "bg-white border-dashed border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50/50",
    dark: "bg-neutral-900 border-dashed border-2 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50",
    neutral: "bg-stone-50 border-dashed border-2 border-stone-300 hover:border-stone-400 hover:bg-stone-100/50",
  },
  subtle: {
    light: "bg-white border border-transparent hover:bg-gray-50/30",
    dark: "bg-neutral-900 border border-transparent hover:bg-neutral-800/30",
    neutral: "bg-stone-50 border border-transparent hover:bg-stone-100/30",
  },
  error: {
    light: "bg-white border border-red-200 bg-red-50/50 hover:bg-red-50/80",
    dark: "bg-neutral-900 border border-red-800 bg-red-950/50 hover:bg-red-950/80",
    neutral: "bg-stone-50 border border-red-300 bg-red-50/50 hover:bg-red-50/80",
  },
} as const;

type EmptyStateVariant = keyof typeof emptyStateVariants;
type EmptyStateSize = "sm" | "default" | "lg";

const sizeClasses: Record<EmptyStateSize, string> = {
  sm: "p-6",
  default: "p-8",
  lg: "p-12",
};

const titleSizeClasses: Record<EmptyStateSize, string> = {
  sm: "text-base",
  default: "text-lg",
  lg: "text-xl",
};

const descriptionSizeClasses: Record<EmptyStateSize, string> = {
  sm: "text-xs",
  default: "text-sm",
  lg: "text-base",
};

const titleColorClasses: Record<Theme, string> = {
  light: "text-gray-900",
  dark: "text-neutral-100",
  neutral: "text-stone-900",
};

const descriptionColorClasses: Record<Theme, string> = {
  light: "text-gray-600",
  dark: "text-neutral-400",
  neutral: "text-stone-600",
};

export type EmptyStateAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
};

export type EmptyStateProps = {
  title: string;
  description?: string;
  icons?: ReactNode[];
  action?: EmptyStateAction;
  variant?: EmptyStateVariant;
  size?: EmptyStateSize;
  theme?: Theme;
  isIconAnimated?: boolean;
  className?: string;
};

export const EmptyState = forwardRef<HTMLElement, EmptyStateProps>(function EmptyState(
  {
    title,
    description,
    icons,
    action,
    variant = "default",
    size = "default",
    theme = "light",
    isIconAnimated = true,
    className = "",
  },
  ref,
) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <LazyMotion features={domAnimation}>
      <motion.section
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "group transition-all duration-300 rounded-xl relative overflow-hidden text-center flex flex-col items-center justify-center",
          sizeClasses[size],
          emptyStateVariants[variant][theme],
          className,
        )}
        initial="initial"
        animate="animate"
        whileHover={isIconAnimated ? "hover" : "animate"}
      >
        <Background />
        <div className="relative z-10 flex flex-col items-center">
          {icons && (
            <div className="mb-6">
              <MultiIconDisplay icons={icons} theme={theme} />
            </div>
          )}

          <motion.div variants={CONTENT_VARIANTS} className="space-y-2 mb-6">
            <h2 id={titleId} className={cn("font-semibold transition-colors duration-200", titleSizeClasses[size], titleColorClasses[theme])}>
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                className={cn("max-w-md leading-relaxed transition-colors duration-200", descriptionSizeClasses[size], descriptionColorClasses[theme])}
              >
                {description}
              </p>
            )}
          </motion.div>

          {action && (
            <motion.div variants={BUTTON_VARIANTS}>
              <Button type="button" onClick={action.onClick} disabled={action.disabled}>
                {action.icon ? (
                  <motion.span
                    className="transition-transform group-hover/button:rotate-90"
                    whileHover={{ rotate: 90 }}
                  >
                    {action.icon}
                  </motion.span>
                ) : (
                  <Plus className="size-4" />
                )}
                {action.label}
              </Button>
            </motion.div>
          )}
        </div>
      </motion.section>
    </LazyMotion>
  );
});
