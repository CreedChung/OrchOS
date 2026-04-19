import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/goals")({
  component: () => <Navigate to="/dashboard/projects" replace />,
});
