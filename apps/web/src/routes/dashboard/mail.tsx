import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight01Icon,
  LinkSquare02Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SidebarHeader } from "@/components/layout/SidebarHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

type MailAccount = {
  id: string;
  label: string;
  provider: string;
  address: string;
  status: "planned" | "ready";
};

const plannedAccounts: MailAccount[] = [
  {
    id: "google-mail",
    label: m.mail_google_title(),
    provider: "Google",
    address: "Gmail / Google Workspace",
    status: "planned",
  },
  {
    id: "smtp-imap",
    label: m.mail_smtp_title(),
    provider: "SMTP / IMAP",
    address: "Custom mailbox providers",
    status: "planned",
  },
];

export const Route = createFileRoute("/dashboard/mail")({ component: MailPage });

function MailPage() {
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [activeAccountId, setActiveAccountId] = useState<string>(plannedAccounts[0]?.id ?? "google-mail");

  const activeAccount =
    plannedAccounts.find((account) => account.id === activeAccountId) ?? plannedAccounts[0] ?? null;

  function handleResizeStart(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const sidebarEl = event.currentTarget.parentElement;
    const sidebarLeft = sidebarEl?.getBoundingClientRect().left ?? 0;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 220), 320);
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="relative hidden shrink-0 border-r border-border bg-card lg:block"
          style={{ width: Math.min(sidebarWidth, 320), maxWidth: "20rem" }}
        >
          <SidebarHeader icon={Mail01Icon} title={m.mail()} count={plannedAccounts.length} />

          <ScrollArea className="h-[calc(100%-2.75rem)]">
            <div className="space-y-2 p-3">
              <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5">
                <div className="text-sm font-semibold text-foreground">{m.mail_google_title()}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{m.mail_google_desc()}</p>
              </div>

              {plannedAccounts.map((account) => {
                const isActive = account.id === activeAccount?.id;

                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setActiveAccountId(account.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                      isActive
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/70 bg-background/70 hover:bg-accent/60",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <HugeiconsIcon icon={Mail01Icon} className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{account.label}</div>
                        <div className="truncate text-xs text-muted-foreground">{account.address}</div>
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span>{account.provider}</span>
                          <HugeiconsIcon icon={ArrowRight01Icon} className="size-3 opacity-60" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize mail sidebar"
            onPointerDown={handleResizeStart}
            className="absolute top-0 right-[-4px] z-10 h-full w-2 cursor-col-resize rounded-full transition-colors hover:bg-primary/15"
          />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
              <section className="rounded-2xl border border-border bg-card/70 p-8 shadow-sm">
                <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Mail01Icon} className="size-6" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-2xl font-semibold tracking-tight">{m.mail()}</h1>
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{m.mail_page_desc()}</p>
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background/70 p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                      <HugeiconsIcon icon={LinkSquare02Icon} className="size-4 text-primary" />
                      {m.mail_google_title()}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{m.mail_google_desc()}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/70 p-5">
                    <div className="mb-3 text-sm font-medium text-foreground">{m.mail_smtp_title()}</div>
                    <p className="text-sm leading-6 text-muted-foreground">{m.mail_smtp_desc()}</p>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-foreground">{activeAccount?.label ?? m.mail()}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{m.mail_page_desc()}</p>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                      <div className="text-sm font-medium text-foreground">Provider</div>
                      <div className="mt-1 text-sm text-muted-foreground">{activeAccount?.provider ?? "Mail"}</div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                      <div className="text-sm font-medium text-foreground">Connection target</div>
                      <div className="mt-1 text-sm text-muted-foreground">{activeAccount?.address ?? "Mailbox"}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Status</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        This placeholder keeps the Mail area reachable while the full workflow is being implemented.
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      Planned
                    </span>
                  </div>

                  <div className="mt-5 rounded-xl border border-border/60 bg-muted/25 px-4 py-8 text-center text-sm text-muted-foreground">
                    Mail integration setup UI will land here next.
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
