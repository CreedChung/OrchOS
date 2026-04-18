"use client";

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ChevronLeftIcon, ShieldCheckIcon, SparklesIcon, WorkflowIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrchOSLogoIcon } from "@/components/ui/header-1";

interface AuthPageProps {
  mode: "signIn" | "signUp";
  children: ReactNode;
}

const AUTH_CONTENT = {
  signIn: {
    title: "Sign in to OrchOS",
    description: "Use your Clerk account to access your OrchOS workspace.",
    asideTitle: "Orchestrate agents, goals, and automations in one place.",
  },
  signUp: {
    title: "Create your OrchOS account",
    description: "Start with Clerk and get into your workspace in a few clicks.",
    asideTitle: "Ship faster with a control plane built for operational AI.",
  },
} as const;

const FEATURE_POINTS = [
  {
    icon: WorkflowIcon,
    title: "Coordinated execution",
    description: "Manage goals, agents, and inbox actions from a single surface.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Secure access",
    description: "Authentication and session handling are managed by Clerk.",
  },
  {
    icon: SparklesIcon,
    title: "Production-ready flow",
    description: "OAuth, email, and account lifecycle all stay inside one auth system.",
  },
];

export function AuthPage({ mode, children }: AuthPageProps) {
  const content = AUTH_CONTENT[mode];

  return (
    <main className="relative min-h-screen bg-background lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden border-r border-border bg-muted/40 p-10 lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,theme(colors.primary/0.12),transparent_40%),radial-gradient(circle_at_bottom_right,theme(colors.foreground/0.08),transparent_35%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <OrchOSLogoIcon className="size-10" />
          <div>
            <p className="text-lg font-semibold tracking-tight">OrchOS</p>
            <p className="text-sm text-muted-foreground">Operational AI control plane</p>
          </div>
        </div>

        <div className="relative z-10 mt-auto max-w-md">
          <p className="text-3xl font-semibold leading-tight text-foreground">
            {content.asideTitle}
          </p>
          <div className="mt-8 grid gap-4">
            {FEATURE_POINTS.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border/70 bg-background/70 p-4 backdrop-blur-sm"
                >
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </section>

      <section className="relative flex min-h-screen flex-col justify-center overflow-hidden p-4 sm:p-8">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-70 [background:radial-gradient(circle_at_top_right,theme(colors.primary/0.14),transparent_30%),radial-gradient(circle_at_bottom_left,theme(colors.foreground/0.06),transparent_34%)]"
        />
        <Button variant="ghost" className="absolute left-5 top-7" asChild>
          <Link to="/">
            <ChevronLeftIcon className="me-2 size-4" />
            Home
          </Link>
        </Button>

        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <OrchOSLogoIcon className="size-10" />
            <div>
              <p className="text-lg font-semibold tracking-tight">OrchOS</p>
              <p className="text-sm text-muted-foreground">Operational AI control plane</p>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
              {content.title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">{content.description}</p>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card/95 p-3 shadow-xl shadow-primary/5 backdrop-blur-sm sm:p-4">
            {children}
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            By continuing, you agree to the OrchOS Terms of Service and Privacy Policy managed
            through Clerk.
          </p>
        </div>
      </section>
    </main>
  );
}

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
    duration: 18 + (i % 8) * 2,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="size-full text-foreground/80" viewBox="0 0 696 316" fill="none">
        <title>Auth background paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.08 + path.id * 0.015}
            initial={{ pathLength: 0.3, opacity: 0.3 }}
            animate={{
              pathLength: 1,
              opacity: [0.15, 0.35, 0.15],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: path.duration,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}
