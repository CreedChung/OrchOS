import { useEffect, useRef, useState } from "react";
import { createFileRoute, Outlet, useLocation, Navigate, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { isClerkConfigured } from "@/lib/auth";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { ActivityPanel } from "@/components/panels/ActivityPanel";
import { SettingsDialog } from "@/components/dialogs/SettingsDialog";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toolbar } from "@/components/layout/Toolbar";
import { CreateBoardConversationDialog } from "@/components/dialogs/CreateBoardConversationDialog";
import { useUIStore } from "@/lib/store";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useConversationStore } from "@/lib/stores/conversation";
import { AuthTransitionOverlay } from "@/components/ui/auth-transition-overlay";
import { Spinner } from "@/components/ui/spinner";
import type { SidebarView } from "@/lib/types";
import { getCapabilityModeFromPath, getCapabilityPath, isCapabilityView } from "@/lib/capability-routing";

const ACTIVITY_PANEL_TRANSITION_MS = 320;
const ACTIVITY_PANEL_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export const Route = createFileRoute("/dashboard")({
  component: DashboardWrapper,
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured) return <>{children}</>;
  return <ClerkAuthGate>{children}</ClerkAuthGate>;
}

function isAuthTransition(): boolean {
  try {
    return sessionStorage.getItem("orch_auth_transition") === "true";
  } catch {
    return false;
  }
}

function ClerkAuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const fromAuth = isAuthTransition();

  if (!isLoaded) {
    if (fromAuth) {
      return (
        <div className="relative h-screen overflow-hidden bg-background">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100 blur-xl scale-105"
            style={{ backgroundImage: "url('/hero/background.png')" }}
          />
          <div className="absolute inset-0 bg-background/72 backdrop-blur-[2px]" />
          <div className="relative flex h-full items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-white/85 shadow-lg backdrop-blur-md">
              <Spinner size="xl" className="text-white/85" />
              <span className="text-sm" suppressHydrationWarning>
                Checking authentication...
              </span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="xl" className="text-muted-foreground/70" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}

function getViewFromPath(pathname: string): SidebarView {
  const segment = pathname.replace("/dashboard/", "").replace("/dashboard", "").split("/")[0] ?? "";
  const validViews: SidebarView[] = [
    "inbox",
    "creation",
    "bookmarks",
    "board",
    "calendar",
    "mail",
    "observability",
    "agents",
  ];
  return validViews.includes(segment as SidebarView) ? (segment as SidebarView) : "inbox";
}

function getDashboardEntryPath(pathname: string) {
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return "/dashboard/creation";
  }

  return pathname;
}

function DashboardWrapper() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/dashboard" || location.pathname === "/dashboard/") {
    return (
      <AuthProvider>
        <RequireAuth>
          <DashboardProvider>
            <Navigate to="/dashboard/creation" replace />
          </DashboardProvider>
        </RequireAuth>
      </AuthProvider>
    );
  }

  const dashboardPath = getDashboardEntryPath(location.pathname);
  const activeView = getViewFromPath(dashboardPath);
  const capabilityViewMode = isCapabilityView(activeView)
    ? getCapabilityModeFromPath(dashboardPath, activeView)
    : "mine";
  const [showAuthTransition, setShowAuthTransition] = useState(() => isAuthTransition());
  const [startDashboardReveal, setStartDashboardReveal] = useState(false);
  const [createBoardDialogOpen, setCreateBoardDialogOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<"general" | "notifications" | "runtimes" | "mail" | "about">("general");
  const revealTriggeredRef = useRef(false);
  const { createConversation, setActiveConversationId } = useConversationStore();

  const {
    runtimes,
    projects: dashboardProjects,
    organizations,
    problems,
    settings,
    refreshAll,
    handleOrganizationCreate,
    handleOrganizationRename,
    handleOrganizationDelete,
    showSettingsDialog,
    setShowSettingsDialog,
    searchQuery,
    setSearchQuery,
    inboxCounts,
    loading,
  } = useDashboard();
  const projects = dashboardProjects ?? [];

  const {
    activeOrganizationId,
    setActiveOrganizationId,
    sourceFilter,
    setSourceFilter,
    inboxStatusFilter,
    setInboxStatusFilter,
    mailFolderFilter,
    setMailFolderFilter,
    calendarViewMode,
    setCalendarViewMode,
    boardFilter,
    setBoardFilter,
    activityPanelOpen,
    toggleActivityPanel,
    activityExpanded,
    sidebarCollapsed,
    toggleSidebar,
  } = useUIStore();

  const dashboardColumns = activityExpanded
    ? "auto minmax(0,0fr) minmax(0,1fr)"
    : `auto minmax(0,1fr) ${activityPanelOpen ? "300px" : "0px"}`;

  useEffect(() => {
    if (revealTriggeredRef.current || loading) {
      return;
    }

    revealTriggeredRef.current = true;

    if (!showAuthTransition) {
      try {
        sessionStorage.removeItem("orch_auth_transition");
      } catch {}
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStartDashboardReveal(true);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [loading, showAuthTransition]);

  return (
    <AuthProvider>
      <RequireAuth>
        <DashboardProvider>
          <>
        <AuthTransitionOverlay
          active={showAuthTransition}
          reveal={startDashboardReveal}
          onComplete={() => {
            setShowAuthTransition(false);
            try {
              sessionStorage.removeItem("orch_auth_transition");
            } catch {}
          }}
        />
        <div className="flex h-screen flex-col overflow-hidden bg-background">
          <div
            className="grid flex-1 overflow-hidden transition-[grid-template-columns]"
            style={{
              gridTemplateColumns: dashboardColumns,
              transitionDuration: `${ACTIVITY_PANEL_TRANSITION_MS}ms`,
              transitionTimingFunction: ACTIVITY_PANEL_EASING,
            }}
          >
            <Sidebar
              organizations={organizations}
              activeOrganizationId={activeOrganizationId}
              activeView={activeView}
              collapsed={sidebarCollapsed}
              onOpenSettings={() => setShowSettingsDialog(true)}
              onOrganizationChange={setActiveOrganizationId}
              onOrganizationCreate={handleOrganizationCreate}
              onOrganizationRename={handleOrganizationRename}
              onOrganizationDelete={handleOrganizationDelete}
              onToggleCollapse={toggleSidebar}
            />
            <div
              className={[
                "flex min-w-0 flex-col overflow-hidden transition-[opacity,transform,filter]",
                activityExpanded
                  ? "pointer-events-none -translate-x-3 opacity-0 blur-[1px]"
                  : "translate-x-0 opacity-100 blur-0",
              ].join(" ")}
              style={{
                transitionDuration: `${ACTIVITY_PANEL_TRANSITION_MS}ms`,
                transitionTimingFunction: ACTIVITY_PANEL_EASING,
              }}
              aria-hidden={activityExpanded}
            >
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <Toolbar
                  activeView={activeView}
                  loading={loading}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activityPanelOpen={activityPanelOpen}
                  onToggleActivityPanel={toggleActivityPanel}
                  sourceFilter={sourceFilter}
                  onSourceFilterChange={setSourceFilter}
                  inboxStatusFilter={inboxStatusFilter}
                   onInboxStatusFilterChange={setInboxStatusFilter}
                   mailFolderFilter={mailFolderFilter}
                   onMailFolderFilterChange={setMailFolderFilter}
                   calendarViewMode={calendarViewMode}
                   onCalendarViewModeChange={setCalendarViewMode}
                   boardFilter={boardFilter}
                   onBoardFilterChange={setBoardFilter}
                  inboxCounts={inboxCounts}
                  agentModelFilter="all"
                  onAgentModelFilterChange={() => {}}
                  agentModelCounts={{ all: 0, local: 0, cloud: 0 }}
                  capabilityViewMode={capabilityViewMode}
                  onCapabilityViewModeChange={(mode) => {
                    if (isCapabilityView(activeView)) {
                      void navigate({ to: getCapabilityPath(activeView, mode) });
                    }
                  }}
                   onOpenCreateGoal={
                     activeView === "board"
                       ? () => {
                           setCreateBoardDialogOpen(true);
                         }
                       : undefined
                   }
                    onOpenMailAccounts={() => {
                      setSettingsDefaultTab("mail");
                      setShowSettingsDialog(true);
                    }}
                    onRefresh={refreshAll}
                >
                  {activeView === "bookmarks" && (
                    <div className="relative mx-auto w-full max-w-md">
                      <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search bookmarks..."
                        className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring/50 focus:ring-2 focus:ring-ring/20"
                      />
                    </div>
                  )}
                </Toolbar>
                <Outlet />
              </div>
            </div>
            <ActivityPanel
              problems={problems}
              collapsed={!activityPanelOpen}
              activeView={activeView}
            />
          </div>
          {showSettingsDialog && (
            <SettingsDialog
              open={showSettingsDialog}
              onClose={() => {
                setShowSettingsDialog(false);
                setSettingsDefaultTab("general");
              }}
              settings={settings}
              onSettingsChange={useUIStore.getState().setSettings}
              onRuntimesRefresh={refreshAll}
              registeredRuntimes={runtimes}
              defaultTab={settingsDefaultTab}
            />
          )}
          <CreateBoardConversationDialog
            open={createBoardDialogOpen}
            projects={projects}
            onClose={() => setCreateBoardDialogOpen(false)}
            onSubmit={async (values) => {
              const created = await createConversation({
                title: values.title,
                projectId: values.projectId,
              });
              const noteSections = [
                values.description ? `Notes:\n${values.description}` : "",
                values.dueDate ? `Due date: ${values.dueDate}` : "",
                `Priority: ${values.priority}`,
                values.tags.length > 0 ? `Tags:\n${values.tags.map((item) => `- ${item}`).join("\n")}` : "",
                values.subtasks.length > 0
                  ? `Subtasks:\n${values.subtasks.map((item) => `- [ ] ${item}`).join("\n")}`
                  : "",
              ].filter(Boolean);
              if (noteSections.length > 0) {
                await api.sendConversationMessage(created.id, noteSections.join("\n\n"));
              }
              setActiveConversationId(created.id);
              await navigate({ to: "/dashboard/creation" });
            }}
          />
        </div>
          </>
        </DashboardProvider>
      </RequireAuth>
    </AuthProvider>
  );
}
