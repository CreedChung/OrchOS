import { createFileRoute } from "@tanstack/react-router";
import { DevicesPage } from "./devices";

export const Route = createFileRoute("/dashboard/agents")({
  component: DevicesPage,
});
