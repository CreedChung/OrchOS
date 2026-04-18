import * as React from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

interface IconProps {
  id: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  className: string;
}

export interface FloatingIconsHeroProps extends React.HTMLAttributes<HTMLElement> {
  eyebrow?: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  icons: IconProps[];
  children?: React.ReactNode;
}

function FloatingIcon({
  mouseX,
  mouseY,
  iconData,
  index,
}: {
  mouseX: React.MutableRefObject<number>;
  mouseY: React.MutableRefObject<number>;
  iconData: IconProps;
  index: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 280, damping: 22 });
  const springY = useSpring(y, { stiffness: 280, damping: 22 });

  React.useEffect(() => {
    const handleMouseMove = () => {
      if (!ref.current) {
        return;
      }

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(mouseX.current - centerX, mouseY.current - centerY);

      if (distance < 160) {
        const angle = Math.atan2(mouseY.current - centerY, mouseX.current - centerX);
        const force = (1 - distance / 160) * 48;
        x.set(-Math.cos(angle) * force);
        y.set(-Math.sin(angle) * force);
        return;
      }

      x.set(0);
      y.set(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, x, y]);

  const Icon = iconData.icon;
  const duration = 5 + (index % 5) * 0.8;

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.06,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn("pointer-events-none absolute", iconData.className)}
    >
      <motion.div
        className="flex size-16 items-center justify-center rounded-[1.75rem] border border-border/60 bg-card/75 p-3 text-foreground shadow-[0_20px_60px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl md:size-20"
        animate={{
          y: [0, -8, 0, 8, 0],
          x: [0, 6, 0, -6, 0],
          rotate: [0, 4, 0, -4, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      >
        <Icon className="size-8 md:size-10" />
      </motion.div>
    </motion.div>
  );
}

const FloatingIconsHero = React.forwardRef<HTMLElement, FloatingIconsHeroProps>(
  ({ className, eyebrow, title, subtitle, ctaText, ctaHref, icons, children, ...props }, ref) => {
    const mouseX = React.useRef(0);
    const mouseY = React.useRef(0);

    const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
      mouseX.current = event.clientX;
      mouseY.current = event.clientY;
    };

    return (
      <section
        ref={ref}
        onMouseMove={handleMouseMove}
        className={cn(
          "relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-6 py-20 md:px-8",
          className,
        )}
        {...props}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,72,239,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(79,184,178,0.18),transparent_32%)]" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:4rem_4rem]" />
        <div className="absolute inset-0">
          {icons.map((iconData, index) => (
            <FloatingIcon
              key={iconData.id}
              mouseX={mouseX}
              mouseY={mouseY}
              iconData={iconData}
              index={index}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          {eyebrow ? (
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="max-w-4xl text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {subtitle}
          </p>
          {children ? (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">{children}</div>
          ) : null}
          <div className="mt-10">
            <Button asChild size="lg" className="h-12 rounded-xl px-8 text-base font-semibold">
              <a href={ctaHref}>{ctaText}</a>
            </Button>
          </div>
        </div>
      </section>
    );
  },
);

FloatingIconsHero.displayName = "FloatingIconsHero";

export { FloatingIconsHero };
export type { IconProps as FloatingIconsHeroIcon };
