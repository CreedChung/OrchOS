import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createFileRoute, Outlet, useLocation, Navigate, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { isClerkConfigured } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ActivityPanel } from "@/components/panels/ActivityPanel";
import { CommandBar } from "@/components/panels/CommandBar";
import { CreateGoalDialog } from "@/components/dialogs/CreateGoalDialog";
import { CreateRuleDialog } from "@/components/dialogs/CreateRuleDialog";
import { SettingsDialog } from "@/components/dialogs/SettingsDialog";
import { CreateAgentDialog } from "@/components/dialogs/CreateAgentDialog";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toolbar } from "@/components/layout/Toolbar";
import { I18nProvider } from "@/lib/useI18n";
import { useUIStore } from "@/lib/store";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { AuthTransitionOverlay } from "@/components/ui/auth-transition-overlay";
import type { SidebarView } from "@/lib/types";

const MorphPanel = lazy(() =>
  import("@/components/ui/ai-input").then((module) => ({ default: module.MorphPanel })),
);

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
            style={{ backgroundImage: "url('/background.png')" }}
          />
          <div className="absolute inset-0 bg-background/72 backdrop-blur-[2px]" />
          <div className="relative flex h-full items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-white/85 shadow-lg backdrop-blur-md">
              <div className="size-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
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
        <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}

function getViewFromPath(pathname: string): SidebarView {
  const segment = pathname.replace("/dashboard/", "").replace("/dashboard", "");
  const validViews: SidebarView[] = [
    "inbox",
    "creation",
    "agents",
    "rules",
    "mcp-servers",
    "skills",
    "projects",
    "observability",
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
  return (
    <AuthProvider>
      <RequireAuth>
        <DashboardProvider>
          <DashboardLayout />
        </DashboardProvider>
      </RequireAuth>
    </AuthProvider>
  );
}

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dashboardPath = getDashboardEntryPath(location.pathname);
  const activeView = getViewFromPath(dashboardPath);
  const [showMorphPanel, setShowMorphPanel] = useState(false);
  const [showAuthTransition, setShowAuthTransition] = useState(() => isAuthTransition());
  const [startDashboardReveal, setStartDashboardReveal] = useState(false);
  const revealTriggeredRef = useRef(false);

  const {
    goals,
    runtimes,
    projects,
    organizations,
    problems,
    activities,
    settings,
    skills,
    refreshAll,
    handleCreateGoal,
    handleCommand,
    handleCreateRule,
    handleCreateAgent,
    handleOrganizationRename,
    handleOrganizationDelete,
    showCreateDialog,
    setShowCreateDialog,
    showCommandBar,
    setShowCommandBar,
    showSettingsDialog,
    setShowSettingsDialog,
    showCreateRuleDialog,
    setShowCreateRuleDialog,
    showCreateAgentDialog,
    setShowCreateAgentDialog,
    ruleFromProblem,
    searchQuery,
    setSearchQuery,
    agentModelFilter,
    setAgentModelFilter,
    inboxCounts,
    agentModelCounts,
    loading,
  } = useDashboard();

  const {
    activeOrganizationId,
    setActiveOrganizationId,
    sourceFilter,
    setSourceFilter,
    capabilityViewMode,
    setCapabilityViewMode,
    activityPanelOpen,
    toggleActivityPanel,
    sidebarCollapsed,
    toggleSidebar,
  } = useUIStore();

  useEffect(() => {
    let cancelled = false;

    const enableMorphPanel = () => {
      if (!cancelled) {
        setShowMorphPanel(true);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(enableMorphPanel, { timeout: 1200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(enableMorphPanel, 300);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, []);

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
    <I18nProvider>
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
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              organizations={organizations}
              problems={problems}
              activeOrganizationId={activeOrganizationId}
              activeView={activeView}
              collapsed={sidebarCollapsed}
              onOpenSettings={() => setShowSettingsDialog(true)}
              onOrganizationChange={setActiveOrganizationId}
              onOrganizationRename={handleOrganizationRename}
              onOrganizationDelete={handleOrganizationDelete}
              onToggleCollapse={toggleSidebar}
            />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Toolbar
                activeView={activeView}
                loading={loading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activityPanelOpen={activityPanelOpen}
                onToggleActivityPanel={toggleActivityPanel}
                sourceFilter={sourceFilter}
                onSourceFilterChange={setSourceFilter}
                inboxCounts={inboxCounts}
                capabilityViewMode={capabilityViewMode}
                onCapabilityViewModeChange={setCapabilityViewMode}
                agentModelFilter={agentModelFilter}
                onAgentModelFilterChange={setAgentModelFilter}
                agentModelCounts={agentModelCounts}
                onRefresh={refreshAll}
                onOpenCapabilityMarket={() => navigate({ to: "/dashboard/skills" })}
              />
              <Outlet />
            </div>
            <ActivityPanel
              activities={activities}
              goals={goals}
              projects={projects}
              problems={problems}
              collapsed={!activityPanelOpen}
              activeView={activeView}
            />
          </div>
          {showCommandBar && (
            <CommandBar
              runtimes={runtimes}
              projects={projects}
              open={showCommandBar}
              onSubmit={handleCommand}
              onClose={() => setShowCommandBar(false)}
            />
          )}
          {showCreateDialog && (
            <CreateGoalDialog
              open={showCreateDialog}
              onClose={() => setShowCreateDialog(false)}
              projects={projects}
              onSubmit={handleCreateGoal}
            />
          )}
          {showCreateRuleDialog && (
            <CreateRuleDialog
              open={showCreateRuleDialog}
              onClose={() => setShowCreateRuleDialog(false)}
              problem={ruleFromProblem}
              onSubmit={handleCreateRule}
            />
          )}
          {showSettingsDialog && (
            <SettingsDialog
              open={showSettingsDialog}
              onClose={() => setShowSettingsDialog(false)}
              settings={settings}
              onSettingsChange={useUIStore.getState().setSettings}
              onRuntimesRefresh={refreshAll}
              registeredRuntimes={runtimes}
            />
          )}
          {showCreateAgentDialog && (
            <CreateAgentDialog
              open={showCreateAgentDialog}
              onClose={() => setShowCreateAgentDialog(false)}
              runtimes={runtimes}
              skills={skills}
              onSubmit={handleCreateAgent}
            />
          )}
          {showMorphPanel && (
            <Suspense fallback={null}>
              <MorphPanel runtimes={runtimes} />
            </Suspense>
          )}
        </div>
      </>
    </I18nProvider>
  );
}
