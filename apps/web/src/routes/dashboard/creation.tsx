import { createFileRoute } from "@tanstack/react-router";
import { CreationView } from "#/components/panels/CreationView";
import { useDashboard } from "#/lib/dashboard-context";

export const Route = createFileRoute("/dashboard/creation")({ component: CreationPage });

function CreationPage() {
  const { agents, runtimes, projects } = useDashboard();

  return <CreationView agents={agents} runtimes={runtimes} projects={projects} />;
}
