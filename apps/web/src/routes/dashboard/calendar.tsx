import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Delete02Icon,
  GoogleIcon,
  SquareArrowDataTransferHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { api, type Integration } from "@/lib/api";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/interactive-empty-state";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
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
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [selectedSidebarItem, setSelectedSidebarItem] = useState<string>("google-overview");
  const [isCalendarSourceDialogOpen, setIsCalendarSourceDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLocalCalendarDialogOpen, setIsLocalCalendarDialogOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const collapseTimerRef = useRef<number | null>(null);
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
  const accounts = integration?.accounts ?? [];
  const activeAccount = accounts.find((account) => account.id === activeAccountId) ?? accounts[0] ?? null;
  const hasSidebarCalendars = accounts.length > 0;

  useEffect(() => {
    void loadIntegrations();
  }, []);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) {
      setShowExpandedContent(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowExpandedContent(true);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (accounts.length === 0) {
      setActiveAccountId(null);
      setSelectedSidebarItem((current) => (current.startsWith("google-account:") ? "google-overview" : current));
      return;
    }

    if (!accounts.some((account) => account.id === activeAccountId)) {
      setActiveAccountId(accounts[0].id);
    }
  }, [accounts, activeAccountId]);

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
      setForm({
        label: "",
        clientId: "",
        clientSecret: "",
        refreshToken: "",
      });
      setIsAddDialogOpen(false);
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
      setSelectedSidebarItem("google-overview");
      toast.success("Calendar account removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove calendar account");
    }
  }

  function openGoogleCalendarDialog() {
    setIsCalendarSourceDialogOpen(false);
    setIsAddDialogOpen(true);
  }

  function openLocalCalendarDialog() {
    setIsCalendarSourceDialogOpen(false);
    setIsLocalCalendarDialogOpen(true);
  }

  const handleCollapseSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setShowExpandedContent(false);
    collapseTimerRef.current = window.setTimeout(() => {
      setSidebarCollapsed(true);
      collapseTimerRef.current = null;
    }, 180);
  }, []);

  const handleExpandSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setSidebarCollapsed(false);
  }, []);

  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sidebarEl = event.currentTarget.parentElement;
    const sidebarLeft = sidebarEl?.getBoundingClientRect().left ?? 0;

    setIsResizingSidebar(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 260), 420);
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "relative hidden min-h-0 shrink-0 flex-col overflow-visible border-r border-border bg-card transition-[width] duration-300 ease-out lg:flex",
            sidebarCollapsed ? "w-0 border-r-transparent" : "w-[var(--calendar-sidebar-width)]",
          )}
          style={
            sidebarCollapsed
              ? undefined
              : ({ "--calendar-sidebar-width": `${Math.min(sidebarWidth, 420)}px` } as CSSProperties)
          }
        >
          <div
            className={cn(
              "border-b border-border p-2 transition-[opacity,filter] duration-300 ease-out",
              showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
            )}
            aria-hidden={!showExpandedContent}
          >
            <div className="flex h-10 items-center justify-between rounded-md px-2">
              <div className="text-sm font-semibold text-foreground">{m.calendar()}</div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsCalendarSourceDialogOpen(true)}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Add calendar"
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-4" />
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="active:-translate-y-0"
                  onClick={handleCollapseSidebar}
                  title={m.collapse_sidebar()}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "min-h-0 flex flex-1 flex-col transition-[opacity,filter] duration-300 ease-out",
              showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
            )}
            aria-hidden={!showExpandedContent}
          >
            {hasSidebarCalendars ? (
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-5 p-3">
                  <section className="space-y-2">
                    <div className="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      Google
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSidebarItem("google-overview")}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        selectedSidebarItem === "google-overview"
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60 bg-background/60 hover:bg-accent/40",
                      )}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <HugeiconsIcon icon={GoogleIcon} className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">Google Calendar</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {accounts.length} account{accounts.length > 1 ? "s" : ""}
                        </div>
                      </div>
                    </button>

                    <div className="space-y-1">
                      {accounts.map((account) => {
                        const isActive = selectedSidebarItem === `google-account:${account.id}`;

                        return (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => {
                              setActiveAccountId(account.id);
                              setSelectedSidebarItem(`google-account:${account.id}`);
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                              isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/40",
                            )}
                          >
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <HugeiconsIcon icon={Calendar03Icon} className="size-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-foreground">{account.label}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {account.email || account.username}
                              </div>
                            </div>
                            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 text-muted-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </ScrollArea>
            ) : (
              <div className="min-h-0 flex-1" />
            )}

          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize calendar sidebar"
            onPointerDown={handleResizeStart}
            className={cn(
              "group absolute right-[-8px] top-0 z-20 h-full w-4",
              sidebarCollapsed && "hidden",
              isResizingSidebar && "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
            )}
          >
            <div
              className={cn(
                "absolute top-1/2 left-1/2 flex h-12 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-[background-color,border-color,box-shadow] duration-150 ease-out group-hover:bg-muted group-hover:shadow-md",
                isResizingSidebar && "border-border bg-muted shadow-md",
              )}
            >
              <div
                className={cn(
                  "h-8 w-px rounded-full bg-border transition-[background-color] duration-150 ease-out group-hover:bg-foreground/35",
                  isResizingSidebar && "opacity-0",
                )}
              />
            </div>
          </div>
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          {sidebarCollapsed ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:translate-y-0"
              onClick={handleExpandSidebar}
              title={m.expand_sidebar()}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Button>
          ) : null}
          <ScrollArea className="h-full">
            <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 p-6">
              {loading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Spinner size="lg" className="text-muted-foreground" />
                </div>
              ) : selectedSidebarItem.startsWith("local") ? (
                <section className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-16 shadow-sm">
                  <div className="mx-auto max-w-xl text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <HugeiconsIcon icon={SquareArrowDataTransferHorizontalIcon} className="size-6" />
                    </div>
                    <h2 className="mt-5 text-lg font-semibold text-foreground">Local calendars are coming next</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      This sidebar now reserves space for your own calendar groups and calendars. The full local calendar model, event editor, and schedule views still need backend and calendar UI work.
                    </p>
                    <Button type="button" variant="outline" className="mt-5" onClick={() => setIsLocalCalendarDialogOpen(true)}>
                      <HugeiconsIcon icon={Add01Icon} className="size-4" />
                      Create local calendar
                    </Button>
                  </div>
                </section>
              ) : accounts.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <EmptyState
                    variant="subtle"
                    size="lg"
                    title="No calendar connected yet"
                    description="Add a Google Calendar account to manage meetings, deadlines, and project timing from this workspace."
                    icons={[
                      <HugeiconsIcon key="c1" icon={Calendar03Icon} className="size-6" />,
                      <HugeiconsIcon key="c2" icon={GoogleIcon} className="size-6" />,
                      <HugeiconsIcon key="c3" icon={Add01Icon} className="size-6" />,
                    ]}
                    action={{
                      label: "Add calendar",
                      icon: <HugeiconsIcon icon={Add01Icon} className="size-4" />,
                      onClick: () => setIsCalendarSourceDialogOpen(true),
                    }}
                    className="w-full max-w-lg"
                  />
                </div>
              ) : (
                <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-foreground">Connected accounts</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Manage each Google Calendar identity bound to this workspace.
                        </p>
                      </div>
                      {integration?.connected ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {m.connected()}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 space-y-3">
                      {accounts.map((account) => {
                        const isActive = account.id === activeAccount?.id;

                        return (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => setActiveAccountId(account.id)}
                            className={[
                              "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                              isActive
                                ? "border-primary/40 bg-primary/5"
                                : "border-border/70 bg-background/70 hover:bg-accent/40",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">{account.label}</div>
                                <div className="mt-1 truncate text-xs text-muted-foreground">
                                  {account.email || account.username}
                                </div>
                              </div>
                              <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                                {account.scopes.length} scopes
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-foreground">Account details</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Review scopes and remove access when needed.
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsCalendarSourceDialogOpen(true)}>
                        <HugeiconsIcon icon={Add01Icon} className="size-4" />
                        {m.add()}
                      </Button>
                    </div>

                    <div className="mt-5 space-y-3">
                      {activeAccount ? (
                        <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-foreground">
                                {activeAccount.label}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {activeAccount.email || activeAccount.username}
                              </div>
                            </div>
                            <button
                              onClick={() => void handleDeleteAccount(activeAccount.id)}
                              className="rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                            </button>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {activeAccount.scopes.map((scope) => (
                              <span key={scope} className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                                {scope.replace("https://www.googleapis.com/auth/", "")}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                          Select an account to inspect its permissions.
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <AppDialog
        open={isCalendarSourceDialogOpen}
        onOpenChange={setIsCalendarSourceDialogOpen}
        title="Add calendar"
        description="Choose whether to connect Google Calendar or create a local calendar."
        size="md"
        footer={
          <Button type="button" variant="outline" onClick={() => setIsCalendarSourceDialogOpen(false)}>
            {m.cancel()}
          </Button>
        }
      >
        <div className="grid gap-3">
          <button
            type="button"
            onClick={openGoogleCalendarDialog}
            className="flex w-full items-start gap-3 rounded-xl border border-border bg-background px-4 py-4 text-left transition-colors hover:bg-accent/40"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <HugeiconsIcon icon={GoogleIcon} className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">Google Calendar</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Connect an existing Google account with OAuth credentials and a refresh token.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={openLocalCalendarDialog}
            className="flex w-full items-start gap-3 rounded-xl border border-border bg-background px-4 py-4 text-left transition-colors hover:bg-accent/40"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <HugeiconsIcon icon={SquareArrowDataTransferHorizontalIcon} className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">Local calendar</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Reserve space for calendars and events managed directly inside this workspace.
              </div>
            </div>
          </button>
        </div>
      </AppDialog>

      <AppDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="Add Google Calendar"
        description="Connect a Google Calendar account with OAuth credentials and a refresh token."
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {m.cancel()}
            </Button>
            <Button type="button" onClick={() => void handleConnect()} disabled={submitting}>
              {submitting ? m.loading() : m.connect()}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
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
              className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <p className="text-xs text-muted-foreground">Required scopes: `calendar`, `calendar.events`</p>
        </div>
      </AppDialog>

      <AppDialog
        open={isLocalCalendarDialogOpen}
        onOpenChange={setIsLocalCalendarDialogOpen}
        title="Create local calendar"
        description="The local calendar model is not implemented yet. This entry point is reserved for your own grouped calendars and events."
        size="md"
        footer={
          <Button type="button" onClick={() => setIsLocalCalendarDialogOpen(false)}>
            {m.cancel()}
          </Button>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Planned here:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Create custom calendar groups</li>
            <li>Create multiple local calendars inside each group</li>
            <li>Store and edit your own events without Google</li>
          </ul>
        </div>
      </AppDialog>
    </div>
  );
}
