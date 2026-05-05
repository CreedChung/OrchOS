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
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/interactive-empty-state";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api, type Integration } from "@/lib/api";
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

type LocalCalendarGroup = {
  id: string;
  name: string;
};

type LocalCalendar = {
  id: string;
  groupId: string;
  name: string;
  color: string;
  description: string;
};

type LocalCalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
};

type LocalCalendarStore = {
  groups: LocalCalendarGroup[];
  calendars: LocalCalendar[];
  events: LocalCalendarEvent[];
};

type LocalGroupFormState = {
  id: string | null;
  name: string;
};

type LocalCalendarFormState = {
  id: string | null;
  groupId: string;
  name: string;
  color: string;
  description: string;
};

type LocalEventFormState = {
  id: string | null;
  calendarId: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
};

const LOCAL_CALENDAR_STORAGE_KEY = "orchos-local-calendars";
const LOCAL_CALENDAR_COLORS = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#ea580c", "#dc2626", "#db2777"];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const Route = createFileRoute("/dashboard/calendar")({ component: CalendarPage });

function CalendarPage() {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [selectedSidebarItem, setSelectedSidebarItem] = useState<string>("google-overview");
  const [isCalendarSourceDialogOpen, setIsCalendarSourceDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLocalGroupDialogOpen, setIsLocalGroupDialogOpen] = useState(false);
  const [isLocalCalendarDialogOpen, setIsLocalCalendarDialogOpen] = useState(false);
  const [isLocalEventDialogOpen, setIsLocalEventDialogOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localStoreLoaded, setLocalStoreLoaded] = useState(false);
  const [localStore, setLocalStore] = useState<LocalCalendarStore>(createInitialLocalCalendarStore);
  const [selectedLocalDate, setSelectedLocalDate] = useState(() => formatDayKey(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [localGroupForm, setLocalGroupForm] = useState<LocalGroupFormState>({ id: null, name: "" });
  const [localCalendarForm, setLocalCalendarForm] = useState<LocalCalendarFormState>({
    id: null,
    groupId: "",
    name: "",
    color: LOCAL_CALENDAR_COLORS[0],
    description: "",
  });
  const [localEventForm, setLocalEventForm] = useState<LocalEventFormState>(() => createEmptyEventForm());
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
  const localGroups = localStore.groups;
  const localCalendars = localStore.calendars;
  const localEvents = localStore.events;
  const hasSidebarCalendars = accounts.length > 0 || localGroups.length > 0;
  const selectedLocalGroupId = selectedSidebarItem.startsWith("local-group:")
    ? selectedSidebarItem.slice("local-group:".length)
    : null;
  const selectedLocalCalendarId = selectedSidebarItem.startsWith("local-calendar:")
    ? selectedSidebarItem.slice("local-calendar:".length)
    : null;
  const selectedLocalGroup = selectedLocalGroupId
    ? localGroups.find((group) => group.id === selectedLocalGroupId) ?? null
    : null;
  const selectedLocalCalendar = selectedLocalCalendarId
    ? localCalendars.find((calendar) => calendar.id === selectedLocalCalendarId) ?? null
    : null;

  const groupedLocalCalendars = useMemo(
    () =>
      localGroups.map((group) => ({
        group,
        calendars: localCalendars.filter((calendar) => calendar.groupId === group.id),
      })),
    [localGroups, localCalendars],
  );

  const activeLocalCalendarIds = useMemo(() => {
    if (selectedLocalCalendar) {
      return [selectedLocalCalendar.id];
    }

    if (selectedLocalGroup) {
      return localCalendars.filter((calendar) => calendar.groupId === selectedLocalGroup.id).map((calendar) => calendar.id);
    }

    return localCalendars.map((calendar) => calendar.id);
  }, [localCalendars, selectedLocalCalendar, selectedLocalGroup]);

  const localEventsInScope = useMemo(() => {
    const ids = new Set(activeLocalCalendarIds);

    return localEvents
      .filter((event) => ids.has(event.calendarId))
      .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
  }, [activeLocalCalendarIds, localEvents]);

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, LocalCalendarEvent[]>();

    for (const event of localEventsInScope) {
      const dayKey = formatDayKey(new Date(event.startAt));
      const bucket = grouped.get(dayKey) ?? [];
      bucket.push(event);
      grouped.set(dayKey, bucket);
    }

    return grouped;
  }, [localEventsInScope]);

  const selectedDateEvents = eventsByDay.get(selectedLocalDate) ?? [];

  const monthDays = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);

  useEffect(() => {
    void loadIntegrations();
  }, []);

  useEffect(() => {
    try {
      setLocalStore(loadLocalCalendarStore());
    } finally {
      setLocalStoreLoaded(true);
    }
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

  useEffect(() => {
    if (!localStoreLoaded) {
      return;
    }

    window.localStorage.setItem(LOCAL_CALENDAR_STORAGE_KEY, JSON.stringify(localStore));
  }, [localStore, localStoreLoaded]);

  useEffect(() => {
    if (selectedSidebarItem.startsWith("local-calendar:") && !selectedLocalCalendar) {
      setSelectedSidebarItem(localGroups.length > 0 ? "local-overview" : "google-overview");
      return;
    }

    if (selectedSidebarItem.startsWith("local-group:") && !selectedLocalGroup) {
      setSelectedSidebarItem(localGroups.length > 0 ? "local-overview" : "google-overview");
    }
  }, [localGroups.length, selectedLocalCalendar, selectedLocalGroup, selectedSidebarItem]);

  useEffect(() => {
    if (selectedDateEvents.length > 0) {
      return;
    }

    const nextAvailableDay = [...eventsByDay.keys()].sort()[0];
    if (nextAvailableDay) {
      setSelectedLocalDate(nextAvailableDay);
    }
  }, [eventsByDay, selectedDateEvents.length]);

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
      setIntegrations((current) => [...current.filter((item) => item.id !== updated.id), updated]);
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
      setIntegrations((current) => [...current.filter((item) => item.id !== updated.id), updated]);
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

  function openLocalGroupDialog(group?: LocalCalendarGroup) {
    setIsCalendarSourceDialogOpen(false);
    setLocalGroupForm(group ? { id: group.id, name: group.name } : { id: null, name: "" });
    setIsLocalGroupDialogOpen(true);
  }

  function openLocalCalendarDialog(groupId?: string, calendar?: LocalCalendar) {
    setIsCalendarSourceDialogOpen(false);
    if (calendar) {
      setLocalCalendarForm({
        id: calendar.id,
        groupId: calendar.groupId,
        name: calendar.name,
        color: calendar.color,
        description: calendar.description,
      });
    } else {
      setLocalCalendarForm({
        id: null,
        groupId: groupId ?? localGroups[0]?.id ?? "",
        name: "",
        color: LOCAL_CALENDAR_COLORS[0],
        description: "",
      });
    }
    setIsLocalCalendarDialogOpen(true);
  }

  function openLocalEventDialog(dayKey?: string, event?: LocalCalendarEvent) {
    const defaultCalendarId = event?.calendarId ?? selectedLocalCalendar?.id ?? activeLocalCalendarIds[0] ?? localCalendars[0]?.id ?? "";

    if (!defaultCalendarId) {
      toast.error("Create a local calendar before adding events");
      return;
    }

    if (event) {
      setLocalEventForm({
        id: event.id,
        calendarId: event.calendarId,
        title: event.title,
        description: event.description,
        location: event.location,
        startAt: toDateTimeLocalValue(new Date(event.startAt)),
        endAt: toDateTimeLocalValue(new Date(event.endAt)),
        allDay: event.allDay,
      });
    } else {
      const targetDay = dayKey ? parseDayKey(dayKey) : new Date();
      const start = new Date(targetDay);
      start.setHours(9, 0, 0, 0);
      const end = new Date(start);
      end.setHours(10, 0, 0, 0);

      setLocalEventForm({
        id: null,
        calendarId: defaultCalendarId,
        title: "",
        description: "",
        location: "",
        startAt: toDateTimeLocalValue(start),
        endAt: toDateTimeLocalValue(end),
        allDay: false,
      });
    }

    if (dayKey) {
      setSelectedLocalDate(dayKey);
      setVisibleMonth(startOfMonth(parseDayKey(dayKey)));
    }

    setIsLocalEventDialogOpen(true);
  }

  function handleSaveLocalGroup() {
    const name = localGroupForm.name.trim();
    if (!name) {
      toast.error("Enter a group name");
      return;
    }

    setLocalStore((current) => {
      if (localGroupForm.id) {
        return {
          ...current,
          groups: current.groups.map((group) => (group.id === localGroupForm.id ? { ...group, name } : group)),
        };
      }

      const groupId = createId("group");
      setSelectedSidebarItem(`local-group:${groupId}`);

      return {
        ...current,
        groups: [...current.groups, { id: groupId, name }],
      };
    });

    setIsLocalGroupDialogOpen(false);
    toast.success(localGroupForm.id ? "Group updated" : "Group created");
  }

  function handleSaveLocalCalendar() {
    const name = localCalendarForm.name.trim();
    if (!localCalendarForm.groupId) {
      toast.error("Choose a group first");
      return;
    }

    if (!name) {
      toast.error("Enter a calendar name");
      return;
    }

    setLocalStore((current) => {
      if (localCalendarForm.id) {
        return {
          ...current,
          calendars: current.calendars.map((calendar) =>
            calendar.id === localCalendarForm.id
              ? {
                  ...calendar,
                  groupId: localCalendarForm.groupId,
                  name,
                  color: localCalendarForm.color,
                  description: localCalendarForm.description.trim(),
                }
              : calendar,
          ),
        };
      }

      const calendarId = createId("calendar");
      setSelectedSidebarItem(`local-calendar:${calendarId}`);

      return {
        ...current,
        calendars: [
          ...current.calendars,
          {
            id: calendarId,
            groupId: localCalendarForm.groupId,
            name,
            color: localCalendarForm.color,
            description: localCalendarForm.description.trim(),
          },
        ],
      };
    });

    setIsLocalCalendarDialogOpen(false);
    toast.success(localCalendarForm.id ? "Calendar updated" : "Calendar created");
  }

  function handleSaveLocalEvent() {
    if (!localEventForm.calendarId) {
      toast.error("Choose a calendar for this event");
      return;
    }

    const title = localEventForm.title.trim();
    if (!title) {
      toast.error("Enter an event title");
      return;
    }

    const startAt = new Date(localEventForm.startAt);
    const endAt = new Date(localEventForm.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      toast.error("Enter a valid start and end time");
      return;
    }

    if (endAt.getTime() < startAt.getTime()) {
      toast.error("End time must be after start time");
      return;
    }

    const payload = {
      calendarId: localEventForm.calendarId,
      title,
      description: localEventForm.description.trim(),
      location: localEventForm.location.trim(),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      allDay: localEventForm.allDay,
    };

    setLocalStore((current) => {
      if (localEventForm.id) {
        return {
          ...current,
          events: current.events.map((event) => (event.id === localEventForm.id ? { ...event, ...payload } : event)),
        };
      }

      return {
        ...current,
        events: [...current.events, { id: createId("event"), ...payload }],
      };
    });

    setSelectedLocalDate(formatDayKey(startAt));
    setVisibleMonth(startOfMonth(startAt));
    setIsLocalEventDialogOpen(false);
    toast.success(localEventForm.id ? "Event updated" : "Event created");
  }

  function handleDeleteLocalGroup(group: LocalCalendarGroup) {
    const relatedCalendarIds = localCalendars.filter((calendar) => calendar.groupId === group.id).map((calendar) => calendar.id);
    if (!window.confirm(`Delete "${group.name}" and all calendars and events inside it?`)) {
      return;
    }

    setLocalStore((current) => ({
      groups: current.groups.filter((item) => item.id !== group.id),
      calendars: current.calendars.filter((item) => item.groupId !== group.id),
      events: current.events.filter((item) => !relatedCalendarIds.includes(item.calendarId)),
    }));
    setSelectedSidebarItem(localGroups.length > 1 ? "local-overview" : "google-overview");
    toast.success("Group deleted");
  }

  function handleDeleteLocalCalendar(calendar: LocalCalendar) {
    if (!window.confirm(`Delete "${calendar.name}" and all events in it?`)) {
      return;
    }

    setLocalStore((current) => ({
      ...current,
      calendars: current.calendars.filter((item) => item.id !== calendar.id),
      events: current.events.filter((item) => item.calendarId !== calendar.id),
    }));
    setSelectedSidebarItem(`local-group:${calendar.groupId}`);
    toast.success("Calendar deleted");
  }

  function handleDeleteLocalEvent(event: LocalCalendarEvent) {
    if (!window.confirm(`Delete "${event.title}"?`)) {
      return;
    }

    setLocalStore((current) => ({
      ...current,
      events: current.events.filter((item) => item.id !== event.id),
    }));
    toast.success("Event deleted");
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
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 280), 420);
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
            "relative hidden min-h-0 shrink-0 flex-col overflow-visible border-r bg-card transition-[width] duration-300 ease-out lg:flex",
            sidebarCollapsed ? "w-0 border-r-transparent" : "w-[var(--calendar-sidebar-width)]",
            isResizingSidebar ? "border-r-transparent" : "border-border",
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
                  {accounts.length > 0 ? (
                    <section className="space-y-2">
                      <div className="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Google</div>
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
                                <div className="truncate text-xs text-muted-foreground">{account.email || account.username}</div>
                              </div>
                              <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 text-muted-foreground" />
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  <div className="space-y-0.5">
                    {groupedLocalCalendars.length > 0 ? (
                      <div className="space-y-0.5">
                        {groupedLocalCalendars.map(({ group, calendars }) => {
                          const isGroupActive = selectedSidebarItem === `local-group:${group.id}`;

                          return (
                            <div key={group.id}>
                              <div
                                onClick={() => setSelectedSidebarItem(`local-group:${group.id}`)}
                                className={cn(
                                  "flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                                  isGroupActive
                                    ? "bg-accent font-medium text-accent-foreground"
                                    : "text-foreground/70 hover:bg-accent/50 hover:text-foreground",
                                )}
                              >
                                <HugeiconsIcon
                                  icon={Calendar03Icon}
                                  className="size-3.5 shrink-0 text-violet-500"
                                />
                                <span className="min-w-0 flex-1 truncate">{group.name}</span>
                                <span className="text-xs text-muted-foreground/60">{calendars.length}</span>
                              </div>

                              <div className="ml-3 space-y-0.5">
                                {calendars.map((calendar) => {
                                  const isCalendarActive = selectedSidebarItem === `local-calendar:${calendar.id}`;

                                  return (
                                    <div
                                      key={calendar.id}
                                      onClick={() => setSelectedSidebarItem(`local-calendar:${calendar.id}`)}
                                      className={cn(
                                        "group flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                                        isCalendarActive
                                          ? "bg-accent font-medium text-accent-foreground"
                                          : "text-foreground/70 hover:bg-accent/50 hover:text-foreground",
                                      )}
                                    >
                                      <span
                                        className="size-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: calendar.color }}
                                        aria-hidden="true"
                                      />
                                      <span className="min-w-0 flex-1 truncate">{calendar.name}</span>
                                      <span className="text-xs text-muted-foreground/60">
                                        {localEvents.filter((event) => event.calendarId === calendar.id).length}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <HugeiconsIcon icon={Calendar03Icon} className="mx-auto mb-1.5 size-5 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">Create a group to start organizing local calendars.</p>
                      </div>
                    )}
                  </div>
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
              isResizingSidebar &&
                "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
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
              className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:!translate-y-[-50%]"
              onClick={handleExpandSidebar}
              title={m.expand_sidebar()}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Button>
          ) : null}
          <ScrollArea className="h-full">
            <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 p-6">
              {loading ? (
                <div className="flex flex-1 items-center justify-center">
                  <Spinner size="lg" className="text-muted-foreground" />
                </div>
              ) : selectedSidebarItem.startsWith("local") ? (
                localGroups.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center">
                    <EmptyState
                      variant="subtle"
                      size="lg"
                      title="Build your local calendar workspace"
                      description="Create calendar groups, add multiple calendars to each group, and keep your own events entirely inside this workspace."
                      icons={[
                        <HugeiconsIcon key="l1" icon={SquareArrowDataTransferHorizontalIcon} className="size-6" />,
                        <HugeiconsIcon key="l2" icon={Calendar03Icon} className="size-6" />,
                        <HugeiconsIcon key="l3" icon={Add01Icon} className="size-6" />,
                      ]}
                      action={{
                        label: "Create group",
                        icon: <HugeiconsIcon icon={Add01Icon} className="size-4" />,
                        onClick: () => openLocalGroupDialog(),
                      }}
                      className="w-full max-w-lg"
                    />
                  </div>
                ) : selectedLocalCalendar ? (
                  <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
                    <div className="space-y-6">
                      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="size-3 rounded-full" style={{ backgroundColor: selectedLocalCalendar.color }} aria-hidden="true" />
                              <h2 className="text-balance text-xl font-semibold text-foreground">{selectedLocalCalendar.name}</h2>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {selectedLocalCalendar.description || "A dedicated local calendar for workspace-only planning and event tracking."}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full bg-muted px-2.5 py-1">{selectedLocalGroup?.name ?? "Ungrouped"}</span>
                              <span className="rounded-full bg-muted px-2.5 py-1">
                                {localEventsInScope.length} event{localEventsInScope.length === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={() => openLocalCalendarDialog(selectedLocalCalendar.groupId, selectedLocalCalendar)}>
                              Edit calendar
                            </Button>
                            <Button type="button" onClick={() => openLocalEventDialog(selectedLocalDate)}>
                              <HugeiconsIcon icon={Add01Icon} className="size-4" />
                              Add event
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">Month view</div>
                            <div className="mt-1 text-lg font-semibold text-foreground">{formatMonthLabel(visibleMonth)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setVisibleMonth((current) => addMonths(current, -1))}>
                              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setVisibleMonth(startOfMonth(new Date()))}>
                              Today
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setVisibleMonth((current) => addMonths(current, 1))}>
                              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {WEEKDAY_LABELS.map((label) => (
                            <div key={label} className="py-2">
                              {label}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                          {monthDays.map((day) => {
                            const dayKey = formatDayKey(day);
                            const dayEvents = eventsByDay.get(dayKey) ?? [];
                            const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                            const isToday = dayKey === formatDayKey(new Date());
                            const isSelected = dayKey === selectedLocalDate;

                            return (
                              <button
                                key={dayKey}
                                type="button"
                                onClick={() => {
                                  setSelectedLocalDate(dayKey);
                                  setVisibleMonth(startOfMonth(day));
                                }}
                                className={cn(
                                  "min-h-28 rounded-2xl border p-3 text-left shadow-sm transition-colors hover:bg-accent/40",
                                  isSelected ? "border-primary/40 bg-primary/5" : "border-border/60 bg-background/80",
                                  !isCurrentMonth && "opacity-55",
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={cn(
                                      "inline-flex size-7 items-center justify-center rounded-full text-sm font-medium tabular-nums",
                                      isToday && "bg-foreground text-background",
                                    )}
                                  >
                                    {day.getDate()}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">{dayEvents.length}</span>
                                </div>
                                <div className="mt-3 space-y-1.5">
                                  {dayEvents.slice(0, 3).map((event) => {
                                    const calendar = localCalendars.find((item) => item.id === event.calendarId);
                                    return (
                                      <div
                                        key={event.id}
                                        className="truncate rounded-lg px-2 py-1 text-xs font-medium"
                                        style={{
                                          backgroundColor: `${calendar?.color ?? LOCAL_CALENDAR_COLORS[0]}1A`,
                                          color: calendar?.color ?? LOCAL_CALENDAR_COLORS[0],
                                        }}
                                      >
                                        {event.title}
                                      </div>
                                    );
                                  })}
                                  {dayEvents.length > 3 ? <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div> : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">Selected day</div>
                            <div className="mt-1 text-lg font-semibold text-foreground">{formatLongDate(selectedLocalDate)}</div>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => openLocalEventDialog(selectedLocalDate)}>
                            <HugeiconsIcon icon={Add01Icon} className="size-4" />
                            Add
                          </Button>
                        </div>

                        <div className="mt-5 space-y-3">
                          {selectedDateEvents.length > 0 ? (
                            selectedDateEvents.map((event) => {
                              const calendar = localCalendars.find((item) => item.id === event.calendarId);

                              return (
                                <div key={event.id} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="size-2.5 rounded-full" style={{ backgroundColor: calendar?.color ?? LOCAL_CALENDAR_COLORS[0] }} />
                                        <div className="truncate text-sm font-medium text-foreground">{event.title}</div>
                                      </div>
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        {event.allDay ? "All day" : `${formatTime(event.startAt)} - ${formatTime(event.endAt)}`}
                                      </div>
                                      {event.location ? <div className="mt-1 text-xs text-muted-foreground">{event.location}</div> : null}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => openLocalEventDialog(selectedLocalDate, event)}>
                                        <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                                      </Button>
                                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleDeleteLocalEvent(event)}>
                                        <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  {event.description ? <p className="mt-3 text-sm text-muted-foreground">{event.description}</p> : null}
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                              No events on this day yet.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">Upcoming</div>
                            <div className="mt-1 text-lg font-semibold text-foreground">Next events</div>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteLocalCalendar(selectedLocalCalendar)}>
                            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                            Delete
                          </Button>
                        </div>

                        <div className="mt-5 space-y-3">
                          {localEventsInScope.slice(0, 6).map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => {
                                const dayKey = formatDayKey(new Date(event.startAt));
                                setSelectedLocalDate(dayKey);
                                setVisibleMonth(startOfMonth(new Date(event.startAt)));
                              }}
                              className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">{event.title}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {formatLongDate(formatDayKey(new Date(event.startAt)))} · {event.allDay ? "All day" : formatTime(event.startAt)}
                                </div>
                              </div>
                              <HugeiconsIcon icon={ArrowRight01Icon} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            </button>
                          ))}
                          {localEventsInScope.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                              Add your first event to start using this calendar.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </section>
                ) : selectedLocalGroup ? (
                  <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Group</div>
                          <h2 className="mt-1 text-balance text-2xl font-semibold text-foreground">{selectedLocalGroup.name}</h2>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Keep related calendars together so personal planning, projects, and operations each have their own event streams.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => openLocalGroupDialog(selectedLocalGroup)}>
                            Edit group
                          </Button>
                          <Button type="button" onClick={() => openLocalCalendarDialog(selectedLocalGroup.id)}>
                            <HugeiconsIcon icon={Add01Icon} className="size-4" />
                            Add calendar
                          </Button>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {localCalendars.filter((calendar) => calendar.groupId === selectedLocalGroup.id).map((calendar) => {
                          const calendarEventCount = localEvents.filter((event) => event.calendarId === calendar.id).length;

                          return (
                            <div key={calendar.id} className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="size-3 rounded-full" style={{ backgroundColor: calendar.color }} />
                                    <div className="truncate text-sm font-semibold text-foreground">{calendar.name}</div>
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    {calendarEventCount} event{calendarEventCount === 1 ? "" : "s"}
                                  </div>
                                  {calendar.description ? <p className="mt-3 text-sm text-muted-foreground">{calendar.description}</p> : null}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedSidebarItem(`local-calendar:${calendar.id}`)}
                                  className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                >
                                  Open
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {localCalendars.filter((calendar) => calendar.groupId === selectedLocalGroup.id).length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground md:col-span-2">
                            This group is empty. Add a calendar to start storing events.
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Group actions</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">Manage this group</div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteLocalGroup(selectedLocalGroup)}>
                          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                          Delete
                        </Button>
                      </div>

                      <div className="mt-5 grid gap-3">
                        <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                          <div className="text-sm font-medium text-foreground">Calendars</div>
                          <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                            {localCalendars.filter((calendar) => calendar.groupId === selectedLocalGroup.id).length}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                          <div className="text-sm font-medium text-foreground">Events</div>
                          <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                            {
                              localEvents.filter((event) =>
                                localCalendars.some((calendar) => calendar.id === event.calendarId && calendar.groupId === selectedLocalGroup.id),
                              ).length
                            }
                          </div>
                        </div>
                        <Button type="button" className="mt-2" onClick={() => openLocalCalendarDialog(selectedLocalGroup.id)}>
                          <HugeiconsIcon icon={Add01Icon} className="size-4" />
                          Create another calendar
                        </Button>
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="space-y-6">
                    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Overview</div>
                          <h2 className="mt-1 text-balance text-2xl font-semibold text-foreground">Local calendar workspace</h2>
                          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            This is your own calendar layer inside OrchOS: build groups, split work across multiple calendars, and keep events local without relying on Google.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => openLocalGroupDialog()}>
                            <HugeiconsIcon icon={Add01Icon} className="size-4" />
                            New group
                          </Button>
                          <Button type="button" onClick={() => openLocalCalendarDialog(localGroups[0]?.id)} disabled={localGroups.length === 0}>
                            <HugeiconsIcon icon={Add01Icon} className="size-4" />
                            New calendar
                          </Button>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <MetricCard label="Groups" value={localGroups.length} />
                        <MetricCard label="Calendars" value={localCalendars.length} />
                        <MetricCard label="Events" value={localEvents.length} />
                      </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-muted-foreground">Groups</div>
                            <div className="mt-1 text-lg font-semibold text-foreground">Organize by context</div>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => openLocalGroupDialog()}>
                            <HugeiconsIcon icon={Add01Icon} className="size-4" />
                            Add group
                          </Button>
                        </div>

                        <div className="mt-5 space-y-4">
                          {groupedLocalCalendars.map(({ group, calendars }) => (
                            <div key={group.id} className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSidebarItem(`local-group:${group.id}`)}
                                    className="text-left text-base font-semibold text-foreground transition-colors hover:text-primary"
                                  >
                                    {group.name}
                                  </button>
                                  <div className="mt-1 text-sm text-muted-foreground">
                                    {calendars.length} calendar{calendars.length === 1 ? "" : "s"}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" variant="outline" size="sm" onClick={() => openLocalGroupDialog(group)}>
                                    Edit
                                  </Button>
                                  <Button type="button" size="sm" onClick={() => openLocalCalendarDialog(group.id)}>
                                    <HugeiconsIcon icon={Add01Icon} className="size-4" />
                                    Add calendar
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {calendars.map((calendar) => (
                                  <button
                                    key={calendar.id}
                                    type="button"
                                    onClick={() => setSelectedSidebarItem(`local-calendar:${calendar.id}`)}
                                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent/40"
                                  >
                                    <span className="size-2.5 rounded-full" style={{ backgroundColor: calendar.color }} />
                                    {calendar.name}
                                  </button>
                                ))}
                                {calendars.length === 0 ? <div className="text-sm text-muted-foreground">No calendars yet.</div> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Upcoming local events</div>
                          <div className="mt-1 text-lg font-semibold text-foreground">What is next</div>
                        </div>

                        <div className="mt-5 space-y-3">
                          {localEvents
                            .slice()
                            .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())
                            .slice(0, 8)
                            .map((event) => {
                              const calendar = localCalendars.find((item) => item.id === event.calendarId);

                              return (
                                <button
                                  key={event.id}
                                  type="button"
                                  onClick={() => {
                                    if (calendar) {
                                      setSelectedSidebarItem(`local-calendar:${calendar.id}`);
                                    }
                                    setSelectedLocalDate(formatDayKey(new Date(event.startAt)));
                                    setVisibleMonth(startOfMonth(new Date(event.startAt)));
                                  }}
                                  className="flex w-full items-start gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                                >
                                  <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: calendar?.color ?? LOCAL_CALENDAR_COLORS[0] }} />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium text-foreground">{event.title}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {calendar?.name ?? "Unknown calendar"} · {formatLongDate(formatDayKey(new Date(event.startAt)))}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}

                          {localEvents.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                              Local events will show up here once you create them.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </section>
                )
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
                            className={cn(
                              "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                              isActive ? "border-primary/40 bg-primary/5" : "border-border/70 bg-background/70 hover:bg-accent/40",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">{account.label}</div>
                                <div className="mt-1 truncate text-xs text-muted-foreground">{account.email || account.username}</div>
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
                        <p className="mt-1 text-sm text-muted-foreground">Review scopes and remove access when needed.</p>
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
                              <div className="truncate text-sm font-medium text-foreground">{activeAccount.label}</div>
                              <div className="truncate text-xs text-muted-foreground">{activeAccount.email || activeAccount.username}</div>
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
        description="Choose whether to connect Google Calendar or create a local calendar setup."
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
            onClick={() => openLocalGroupDialog()}
            className="flex w-full items-start gap-3 rounded-xl border border-border bg-background px-4 py-4 text-left transition-colors hover:bg-accent/40"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <HugeiconsIcon icon={SquareArrowDataTransferHorizontalIcon} className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">Local calendar</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Create local groups, multiple calendars inside them, and store your own events in this workspace.
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
            <Input
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              placeholder="Ops Calendar"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Client ID</span>
            <Input
              value={form.clientId}
              onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
              placeholder="Google OAuth Client ID"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Client Secret</span>
            <Input
              type="password"
              value={form.clientSecret}
              onChange={(event) => setForm((current) => ({ ...current, clientSecret: event.target.value }))}
              placeholder="Google OAuth Client Secret"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Refresh Token</span>
            <Textarea
              value={form.refreshToken}
              onChange={(event) => setForm((current) => ({ ...current, refreshToken: event.target.value }))}
              placeholder="Google refresh token with calendar scopes"
              className="min-h-32"
            />
          </label>
          <p className="text-xs text-muted-foreground">Required scopes: `calendar`, `calendar.events`</p>
        </div>
      </AppDialog>

      <AppDialog
        open={isLocalGroupDialogOpen}
        onOpenChange={setIsLocalGroupDialogOpen}
        title={localGroupForm.id ? "Edit local group" : "Create local group"}
        description="Use groups to separate contexts such as personal planning, project delivery, or operations."
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsLocalGroupDialogOpen(false)}>
              {m.cancel()}
            </Button>
            <Button type="button" onClick={handleSaveLocalGroup}>
              {localGroupForm.id ? "Save changes" : "Create group"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Group name</span>
            <Input
              value={localGroupForm.name}
              onChange={(event) => setLocalGroupForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Product planning"
            />
          </label>
        </div>
      </AppDialog>

      <AppDialog
        open={isLocalCalendarDialogOpen}
        onOpenChange={setIsLocalCalendarDialogOpen}
        title={localCalendarForm.id ? "Edit local calendar" : "Create local calendar"}
        description="Each group can contain multiple calendars with their own color, description, and events."
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsLocalCalendarDialogOpen(false)}>
              {m.cancel()}
            </Button>
            <Button type="button" onClick={handleSaveLocalCalendar} disabled={localGroups.length === 0}>
              {localCalendarForm.id ? "Save changes" : "Create calendar"}
            </Button>
          </>
        }
      >
        {localGroups.length > 0 ? (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Group</span>
              <select
                value={localCalendarForm.groupId}
                onChange={(event) => setLocalCalendarForm((current) => ({ ...current, groupId: event.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {localGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Calendar name</span>
              <Input
                value={localCalendarForm.name}
                onChange={(event) => setLocalCalendarForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Engineering schedule"
              />
            </label>

            <div className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Color</span>
              <div className="flex flex-wrap gap-2">
                {LOCAL_CALENDAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setLocalCalendarForm((current) => ({ ...current, color }))}
                    className={cn(
                      "size-10 rounded-full border-2 transition-transform active:scale-[0.96]",
                      localCalendarForm.color === color ? "border-foreground" : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Use color ${color}`}
                  />
                ))}
              </div>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Description</span>
              <Textarea
                value={localCalendarForm.description}
                onChange={(event) => setLocalCalendarForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Track launches, milestones, and team rituals."
              />
            </label>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            Create a local group first, then add calendars inside it.
          </div>
        )}
      </AppDialog>

      <AppDialog
        open={isLocalEventDialogOpen}
        onOpenChange={setIsLocalEventDialogOpen}
        title={localEventForm.id ? "Edit local event" : "Create local event"}
        description="Store an event inside one of your local calendars without relying on an external provider."
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsLocalEventDialogOpen(false)}>
              {m.cancel()}
            </Button>
            <Button type="button" onClick={handleSaveLocalEvent} disabled={localCalendars.length === 0}>
              {localEventForm.id ? "Save changes" : "Create event"}
            </Button>
          </>
        }
      >
        {localCalendars.length > 0 ? (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Calendar</span>
              <select
                value={localEventForm.calendarId}
                onChange={(event) => setLocalEventForm((current) => ({ ...current, calendarId: event.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {localCalendars.map((calendar) => {
                  const group = localGroups.find((item) => item.id === calendar.groupId);
                  return (
                    <option key={calendar.id} value={calendar.id}>
                      {group?.name ? `${group.name} / ${calendar.name}` : calendar.name}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Title</span>
              <Input
                value={localEventForm.title}
                onChange={(event) => setLocalEventForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Sprint review"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">Start</span>
                <Input
                  type="datetime-local"
                  value={localEventForm.startAt}
                  onChange={(event) => setLocalEventForm((current) => ({ ...current, startAt: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">End</span>
                <Input
                  type="datetime-local"
                  value={localEventForm.endAt}
                  onChange={(event) => setLocalEventForm((current) => ({ ...current, endAt: event.target.value }))}
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={localEventForm.allDay}
                onChange={(event) => setLocalEventForm((current) => ({ ...current, allDay: event.target.checked }))}
                className="size-4 rounded border-border"
              />
              All-day event
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Location</span>
              <Input
                value={localEventForm.location}
                onChange={(event) => setLocalEventForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="Main office or meeting link"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Notes</span>
              <Textarea
                value={localEventForm.description}
                onChange={(event) => setLocalEventForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Agenda, reminders, and context for this event."
              />
            </label>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            Create a local calendar before adding events.
          </div>
        )}
      </AppDialog>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function createInitialLocalCalendarStore(): LocalCalendarStore {
  return {
    groups: [],
    calendars: [],
    events: [],
  };
}

function createEmptyEventForm(): LocalEventFormState {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const later = new Date(now);
  later.setHours(now.getHours() + 1);

  return {
    id: null,
    calendarId: "",
    title: "",
    description: "",
    location: "",
    startAt: toDateTimeLocalValue(now),
    endAt: toDateTimeLocalValue(later),
    allDay: false,
  };
}

function loadLocalCalendarStore(): LocalCalendarStore {
  try {
    const raw = window.localStorage.getItem(LOCAL_CALENDAR_STORAGE_KEY);
    if (!raw) {
      return createInitialLocalCalendarStore();
    }

    const parsed = JSON.parse(raw) as Partial<LocalCalendarStore>;
    return {
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
      calendars: Array.isArray(parsed.calendars) ? parsed.calendars : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return createInitialLocalCalendarStore();
  }
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function formatDayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDayKey(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day);
}

function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildMonthGrid(month: Date) {
  const monthStart = startOfMonth(month);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

function formatLongDate(dayKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseDayKey(dayKey));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
