import { createFileRoute, Outlet, useLocation, Navigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { isClerkConfigured } from "#/lib/auth";
import { Sidebar } from "#/components/layout/Sidebar";
import { ActivityPanel } from "#/components/panels/ActivityPanel";
import { CommandBar } from "#/components/panels/CommandBar";
import { CreateGoalDialog } from "#/components/dialogs/CreateGoalDialog";
import { CreateRuleDialog } from "#/components/dialogs/CreateRuleDialog";
import { SettingsDialog } from "#/components/dialogs/SettingsDialog";
import { CreateAgentDialog } from "#/components/dialogs/CreateAgentDialog";
import { MorphPanel } from "#/components/ui/ai-input";
import { Toolbar } from "#/components/layout/Toolbar";
import { I18nProvider } from "#/lib/useI18n";
import { m } from "#/paraglide/messages";
import { useUIStore } from "#/lib/store";
import { DashboardProvider, useDashboard } from "#/lib/dashboard-context";
import type { SidebarView } from "#/lib/types";

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
          <span className="text-sm" suppressHydrationWarning>{m.loading()}</span>
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
    "goals",
    "creation",
    "agents",
    "mcp-servers",
    "skills",
    "environments",
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
  )
}

function DashboardLayout() {
  const location = useLocation();
  const activeView = getViewFromPath(location.pathname);

  const {
    runtimes,
    projects,
    organizations,
    problems,
    activities,
    settings,
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
    goalCounts,
    agentModelCounts,
    mcpScopeCounts,
    skillsScopeCounts,
    loading,
  } = useDashboard();

  const {
    activeOrganizationId,
    setActiveOrganizationId,
    sourceFilter,
    setSourceFilter,
    goalStatusFilter,
    setGoalStatusFilter,
    scopeFilter,
    setScopeFilter,
    creationArchiveFilter,
    setCreationArchiveFilter,
    environmentSection,
    setEnvironmentSection,
    activityPanelOpen,
    toggleActivityPanel,
  } = useUIStore();

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
            onOpenSettings={() => setShowSettingsDialog(true)}
            onOrganizationChange={setActiveOrganizationId}
            onOrganizationRename={handleOrganizationRename}
            onOrganizationDelete={handleOrganizationDelete}
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
              goalStatusFilter={goalStatusFilter}
              onGoalStatusFilterChange={setGoalStatusFilter}
              goalCounts={goalCounts}
              scopeFilter={scopeFilter}
              onScopeFilterChange={setScopeFilter}
              scopeCounts={scopeCounts}
              creationArchiveFilter={creationArchiveFilter}
              onCreationArchiveFilterChange={setCreationArchiveFilter}
              environmentSection={environmentSection}
              onEnvironmentSectionChange={setEnvironmentSection}
              agentModelFilter={agentModelFilter}
              onAgentModelFilterChange={setAgentModelFilter}
              agentModelCounts={agentModelCounts}
            />
            <Outlet />
          </div>
          <ActivityPanel
            activities={activities}
            collapsed={!activityPanelOpen}
            onToggle={toggleActivityPanel}
          />
        </div>
        <CommandBar
          runtimes={runtimes}
          projects={projects}
          open={showCommandBar}
          onSubmit={handleCommand}
          onClose={() => setShowCommandBar(false)}
        />
        <CreateGoalDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          projects={projects}
          onSubmit={handleCreateGoal}
        />
        <CreateRuleDialog
          open={showCreateRuleDialog}
          onClose={() => setShowCreateRuleDialog(false)}
          problem={ruleFromProblem}
          onSubmit={handleCreateRule}
        />
        <SettingsDialog
          open={showSettingsDialog}
          onClose={() => setShowSettingsDialog(false)}
          settings={settings}
          onSettingsChange={useUIStore.getState().setSettings}
          onRuntimesRefresh={refreshAll}
          registeredRuntimes={runtimes}
        />
        <CreateAgentDialog
          open={showCreateAgentDialog}
          onClose={() => setShowCreateAgentDialog(false)}
          runtimes={runtimes}
          onSubmit={handleCreateAgent}
        />
        <MorphPanel runtimes={runtimes} />
      </div>
    </I18nProvider>
  );
}
