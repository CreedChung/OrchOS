import { createFileRoute } from "@tanstack/react-router";
import { CreationView } from "@/components/panels/CreationView";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/creation")({ component: CreationPage });

function CreationPage() {
  const { runtimes } = useDashboard();
  const settings = useUIStore((s) => s.settings);
  const setSettings = useUIStore((s) => s.setSettings);

  return (
    <CreationView
      runtimes={runtimes}
      settings={settings}
      onSettingsChange={setSettings}
    />
  );
}
