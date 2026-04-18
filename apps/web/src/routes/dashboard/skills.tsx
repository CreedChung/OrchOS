import { createFileRoute } from "@tanstack/react-router";
import { SkillsView } from "@/components/panels/SkillsView";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/skills")({ component: SkillsPage });

function SkillsPage() {
  const { skills, projects, refreshAll } = useDashboard();
  const { scopeFilter } = useUIStore();

  return (
    <SkillsView
      skills={skills}
      projects={projects}
      onRefresh={refreshAll}
      scopeFilter={scopeFilter}
    />
  );
}
