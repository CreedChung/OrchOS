'use client';

import { Card, CardContent, CardHeader } from '#/components/ui/card';
import { m } from '#/paraglide/messages';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Robot02Icon,
} from '@hugeicons/core-free-icons';

export function FeaturesBento() {
  return (
    <section className="dark:bg-muted/25 bg-zinc-50 py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto grid gap-2 sm:grid-cols-5">
          {/* Main: Multi-Agent Coordination */}
          <Card className="group overflow-hidden shadow-black/5 sm:col-span-3 sm:rounded-none sm:rounded-tl-xl">
            <CardHeader>
              <div className="md:p-6">
                <p className="font-medium">{m.feature_agents_title()}</p>
                <p className="text-muted-foreground mt-3 max-w-sm text-sm">
                  {m.feature_agents_desc()}
                </p>
              </div>
            </CardHeader>

            <div className="relative h-fit pl-6 md:pl-12">
              <div className="absolute -inset-6 [background:radial-gradient(75%_95%_at_50%_0%,transparent,hsl(var(--background))_100%)]" />

              <div className="bg-background overflow-hidden rounded-tl-lg border-l border-t pl-2 pt-2 dark:bg-zinc-950">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop"
                  className="hidden dark:block w-full h-auto"
                  alt="Dashboard dark"
                  width={1207}
                  height={929}
                />
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop"
                  className="shadow dark:hidden w-full h-auto"
                  alt="Dashboard light"
                  width={1207}
                  height={929}
                />
              </div>
            </div>
          </Card>

          {/* Top Right: Goal-Driven Workflows */}
          <Card className="group overflow-hidden shadow-zinc-950/5 sm:col-span-2 sm:rounded-none sm:rounded-tr-xl">
            <p className="mx-auto my-6 max-w-md text-balance px-6 text-center text-lg font-semibold sm:text-2xl md:p-6">
              {m.feature_goals_title()}
            </p>

            <CardContent className="mt-auto h-fit">
              <div className="relative mb-6 sm:mb-0">
                <div className="absolute -inset-6 [background:radial-gradient(50%_75%_at_75%_50%,transparent,hsl(var(--background))_100%)]" />
                <div className="aspect-[76/59] overflow-hidden rounded-r-lg border">
                  <img
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop"
                    className="hidden dark:block w-full h-full object-cover"
                    alt="Analytics dark"
                    width={1207}
                    height={929}
                  />
                  <img
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop"
                    className="shadow dark:hidden w-full h-full object-cover"
                    alt="Analytics light"
                    width={1207}
                    height={929}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Left: Hotkeys */}
          <Card className="group p-6 shadow-black/5 sm:col-span-2 sm:rounded-none sm:rounded-bl-xl md:p-12">
            <p className="mx-auto mb-12 max-w-md text-balance text-center text-lg font-semibold sm:text-2xl">
              {m.ai_ask()}
            </p>

            <div className="flex justify-center gap-6">
              <div className="inset-shadow-sm dark:inset-shadow-white/5 bg-muted/35 relative flex aspect-square size-16 items-center rounded-[7px] border p-3 shadow-lg ring dark:shadow-white/5 dark:ring-black">
                <span className="absolute right-2 top-1 block text-sm">⌘</span>
                <HugeiconsIcon icon={Robot02Icon} className="mt-auto size-4 text-primary" />
              </div>
              <div className="inset-shadow-sm dark:inset-shadow-white/5 bg-muted/35 flex aspect-square size-16 items-center justify-center rounded-[7px] border p-3 shadow-lg ring dark:shadow-white/5 dark:ring-black">
                <span className="font-semibold">K</span>
              </div>
            </div>
          </Card>

          {/* Bottom Right: Integrations */}
          <Card className="group relative shadow-black/5 sm:col-span-3 sm:rounded-none sm:rounded-br-xl">
            <CardHeader className="p-6 md:p-12">
              <p className="font-medium">{m.integrations_heading()}</p>
              <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                {m.connect_services_desc()}
              </p>
            </CardHeader>
            <CardContent className="relative h-fit px-6 pb-6 md:px-12 md:pb-12">
              <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
                <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border p-4">
                  <img
                    className="m-auto size-8 invert dark:invert-0"
                    src="https://simpleicons.org/icons/github.svg"
                    alt="GitHub logo"
                    width={32}
                    height={32}
                  />
                </div>
                <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border p-4">
                  <img
                    className="m-auto size-8 invert dark:invert-0"
                    src="https://simpleicons.org/icons/slack.svg"
                    alt="Slack logo"
                    width={32}
                    height={32}
                  />
                </div>
                <div className="rounded-[var(--radius)] aspect-square border border-dashed" />
                <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border p-4">
                  <img
                    className="m-auto size-8 invert dark:invert-0"
                    src="https://simpleicons.org/icons/linear.svg"
                    alt="Linear logo"
                    width={32}
                    height={32}
                  />
                </div>
                <div className="rounded-[var(--radius)] bg-muted/50 flex aspect-square items-center justify-center border p-4">
                  <img
                    className="m-auto size-8 invert dark:invert-0"
                    src="https://simpleicons.org/icons/sentry.svg"
                    alt="Sentry logo"
                    width={32}
                    height={32}
                  />
                </div>
                <div className="rounded-[var(--radius)] aspect-square border border-dashed" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
