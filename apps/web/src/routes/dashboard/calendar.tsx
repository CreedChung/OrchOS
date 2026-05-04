import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar03Icon, Delete02Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { api, type Integration } from "@/lib/api";
import { m } from "@/paraglide/messages";

type CalendarIntegrationAccount = {
  id: string;
  label: string;
  email?: string;
  username?: string;
  scopes: string[];
};

type CalendarIntegration = Integration & {
  accounts?: CalendarIntegrationAccount[];
};

export const Route = createFileRoute("/dashboard/calendar")({ component: CalendarPage });

function CalendarPage() {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    label: "",
    clientId: "",
    clientSecret: "",
    refreshToken: "",
  });

  const integration = useMemo(
    () => integrations.find((item) => item.id === "google-calendar") ?? null,
    [integrations],
  );

  useEffect(() => {
    void loadIntegrations();
  }, []);

  async function loadIntegrations() {
    setLoading(true);
    try {
      setIntegrations(await api.listIntegrations());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!form.clientId.trim() || !form.clientSecret.trim() || !form.refreshToken.trim()) {
      toast.error("Please fill in Google OAuth credentials first");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await api.connectGoogleIntegration("google-calendar", {
        label: form.label.trim() || undefined,
        clientId: form.clientId.trim(),
        clientSecret: form.clientSecret.trim(),
        refreshToken: form.refreshToken.trim(),
      });
      setIntegrations((current) => [
        ...current.filter((item) => item.id !== updated.id),
        updated,
      ]);
      setForm((current) => ({ ...current, refreshToken: "" }));
      toast.success("Google Calendar connected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect Google Calendar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAccount(accountId: string) {
    try {
      const updated = await api.deleteIntegrationAccount("google-calendar", accountId);
      setIntegrations((current) => [
        ...current.filter((item) => item.id !== updated.id),
        updated,
      ]);
      toast.success("Calendar account removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove calendar account");
    }
  }

  return (
    <div className="flex h-full justify-center overflow-y-auto p-6">
      <div className="w-full max-w-5xl space-y-6">
        <section className="rounded-2xl border border-border bg-card/70 p-8 shadow-sm">
          <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HugeiconsIcon icon={Calendar03Icon} className="size-6" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight">{m.calendar()}</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{m.calendar_page_desc()}</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-background/70 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <HugeiconsIcon icon={LinkSquare02Icon} className="size-4 text-primary" />
                {m.calendar_google_title()}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{m.calendar_google_desc()}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-5">
              <div className="mb-3 text-sm font-medium text-foreground">{m.calendar_next_step_title()}</div>
              <p className="text-sm leading-6 text-muted-foreground">{m.calendar_next_step_desc()}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Google OAuth</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use a Google OAuth client and refresh token with Calendar scopes.
            </p>
            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Account label</span>
                <input
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Ops Calendar"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Client ID</span>
                <input
                  value={form.clientId}
                  onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
                  placeholder="Google OAuth Client ID"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Client Secret</span>
                <input
                  type="password"
                  value={form.clientSecret}
                  onChange={(event) => setForm((current) => ({ ...current, clientSecret: event.target.value }))}
                  placeholder="Google OAuth Client Secret"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Refresh Token</span>
                <textarea
                  value={form.refreshToken}
                  onChange={(event) => setForm((current) => ({ ...current, refreshToken: event.target.value }))}
                  placeholder="Google refresh token with calendar scopes"
                  className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Required scopes: `calendar`, `calendar.events`
              </p>
              <button
                onClick={() => void handleConnect()}
                disabled={submitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? m.loading() : m.connect()}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Connected accounts</h2>
                <p className="mt-1 text-sm text-muted-foreground">Manage each Google Calendar identity bound to this workspace.</p>
              </div>
              {integration?.connected ? (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {m.connected()}
                </span>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  {m.loading()}
                </div>
              ) : (integration?.accounts?.length ?? 0) > 0 ? (
                integration.accounts!.map((account: CalendarIntegrationAccount) => (
                  <div key={account.id} className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">{account.label}</div>
                        <div className="truncate text-xs text-muted-foreground">{account.email || account.username}</div>
                      </div>
                      <button
                        onClick={() => void handleDeleteAccount(account.id)}
                        className="rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {account.scopes.map((scope: string) => (
                        <span key={scope} className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                          {scope.replace("https://www.googleapis.com/auth/", "")}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  No calendar accounts connected yet.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
