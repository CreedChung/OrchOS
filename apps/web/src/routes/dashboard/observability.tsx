import { createFileRoute } from "@tanstack/react-router";
import { ObservabilityView } from "@/components/panels/ObservabilityView";
import { useDashboard } from "@/lib/dashboard-context";

export const Route = createFileRoute("/dashboard/observability")({ component: ObservabilityPage });

function ObservabilityPage() {
  const { runtimes, problems } = useDashboard();

  return <ObservabilityView runtimes={runtimes} problems={problems} />;
}
