"use client";

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";
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
  },
  signUp: {
    title: "Create your OrchOS account",
    description: "Start with Clerk and get into your workspace in a few clicks.",
  },
} as const;

export function AuthPage({ mode, children }: AuthPageProps) {
  const content = AUTH_CONTENT[mode];

  return (
    <main className="min-h-screen bg-background">
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat p-4 sm:p-8"
        style={{ backgroundImage: "url('/background.png')" }}
      >
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" aria-hidden="true" />

        <Button variant="ghost" className="absolute left-5 top-7 z-10" asChild>
          <Link to="/">
            <ChevronLeftIcon className="me-2 size-4" />
            Home
          </Link>
        </Button>

        <div className="relative w-full max-w-md space-y-6">
          <div className="flex items-center gap-3">
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
            <div className="flex justify-center">{children}</div>
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
