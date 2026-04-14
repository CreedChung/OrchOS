import { createFileRoute } from '@tanstack/react-router'
import { AgentList } from '#/components/panels/AgentList'
import { AgentDetailView } from '#/components/panels/AgentDetail'
import { useDashboard } from '#/lib/dashboard-context'
import { useUIStore } from '#/lib/store'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/dashboard/agents')({ component: AgentsPage })

function AgentsPage() {
  const {
    agents, rules,
    handleRuleToggle, handleRuleDelete, handleUpdateAgent,
    showCreateAgentDialog, setShowCreateAgentDialog,
    refreshAll,
  } = useDashboard()

  const { activeAgentId, setActiveAgentId } = useUIStore()

  // Show all agents (user-created). Runtimes are managed separately in Environments.
  const agentInstances = agents
  const activeAgent = agentInstances.find((a) => a.id === activeAgentId)

  return (
    <div className="flex flex-1 overflow-hidden">
      <AgentList
        agents={agentInstances}
        activeAgentId={activeAgentId}
        onSelectAgent={setActiveAgentId}
        onCreateAgent={() => setShowCreateAgentDialog(true)}
        onAgentUpdated={refreshAll}
      />
      <div className="flex-1 overflow-hidden">
        {activeAgent ? (
          <AgentDetailView
            agent={activeAgent}
            rules={rules}
            onRuleToggle={handleRuleToggle}
            onRuleDelete={handleRuleDelete}
            onAgentUpdated={refreshAll}
            onUpdateAgent={handleUpdateAgent}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{m.no_agent_selected()}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{m.no_agent_selected_desc()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
