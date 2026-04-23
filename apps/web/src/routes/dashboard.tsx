import { lazy, Suspense, useEffect, useState } from "react";
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
import { Toolbar } from "@/components/layout/Toolbar";
import { I18nProvider } from "@/lib/useI18n";
import { m } from "@/paraglide/messages";
import { useUIStore } from "@/lib/store";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
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

function ClerkAuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm" suppressHydrationWarning>
            {m.loading()}
          </span>
        </div>
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

function DashboardWrapper() {
  return (
    <RequireAuth>
      <DashboardProvider>
        <DashboardLayout />
      </DashboardProvider>
    </RequireAuth>
  );
}

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeView = getViewFromPath(location.pathname);
  const [showMorphPanel, setShowMorphPanel] = useState(false);

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
    boardCounts,
    mcpScopeCounts,
    skillsScopeCounts,
    loading,
  } = useDashboard();

  const {
    activeOrganizationId,
    setActiveOrganizationId,
    sourceFilter,
    setSourceFilter,
    scopeFilter,
    setScopeFilter,
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm" suppressHydrationWarning>
            {m.loading()}
          </span>
        </div>
      </div>
    );
  }

  const scopeCounts = activeView === "skills" ? skillsScopeCounts : mcpScopeCounts;

  return (
    <I18nProvider>
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
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activityPanelOpen={activityPanelOpen}
              onToggleActivityPanel={toggleActivityPanel}
              sourceFilter={sourceFilter}
              onSourceFilterChange={setSourceFilter}
              inboxCounts={inboxCounts}
              scopeFilter={scopeFilter}
              onScopeFilterChange={setScopeFilter}
              scopeCounts={scopeCounts}
              capabilityViewMode={capabilityViewMode}
              onCapabilityViewModeChange={setCapabilityViewMode}
              agentModelFilter={agentModelFilter}
              onAgentModelFilterChange={setAgentModelFilter}
              agentModelCounts={agentModelCounts}
              boardCounts={boardCounts}
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
    </I18nProvider>
  );
}
