import { createFileRoute } from "@tanstack/react-router";
import { RulesPanel } from "@/components/panels/RulesPanel";
import { api } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard-context";

export const Route = createFileRoute("/dashboard/rules")({ component: RulesPage });

function RulesPage() {
  const { rules, projects, agents, handleCreateRule, handleRuleToggle, handleRuleDelete, refreshAll } = useDashboard();

  return (
    <RulesPanel
      rules={rules}
      projects={projects}
      agents={agents}
      onCreateRule={handleCreateRule}
      onUpdateRule={async (id, data) => {
        await api.updateRule(id, data);
        await refreshAll();
      }}
      onToggleRule={handleRuleToggle}
      onDeleteRule={handleRuleDelete}
    />
  );
}
