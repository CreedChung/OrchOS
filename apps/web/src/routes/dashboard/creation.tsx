import { createFileRoute } from "@tanstack/react-router";
import { CreationView } from "@/components/panels/CreationView";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/creation")({ component: CreationPage });

function CreationPage() {
  const { agents, runtimes, projects, goals } = useDashboard();
  const {
    creationArchiveFilter,
    creationSidebarCollapsed,
    creationSidebarWidth,
    setCreationArchiveFilter,
    toggleCreationSidebar,
    setCreationSidebarWidth,
  } = useUIStore();
  const settings = useUIStore((s) => s.settings);
  const setSettings = useUIStore((s) => s.setSettings);

  return (
    <CreationView
      agents={agents}
      runtimes={runtimes}
      projects={projects}
      goals={goals}
      archiveFilter={creationArchiveFilter}
      onArchiveFilterChange={setCreationArchiveFilter}
      settings={settings}
      onSettingsChange={setSettings}
      sidebarCollapsed={creationSidebarCollapsed}
      onToggleSidebar={toggleCreationSidebar}
      sidebarWidth={creationSidebarWidth}
      onSidebarWidthChange={setCreationSidebarWidth}
    />
  );
}
