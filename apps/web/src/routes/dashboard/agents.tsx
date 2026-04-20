import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AgentList } from "@/components/panels/AgentList";
import { AgentDetailView } from "@/components/panels/AgentDetail";
import { EditAgentDialog } from "@/components/dialogs/EditAgentDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/dashboard/agents")({ component: AgentsPage });

function AgentsPage() {
  const {
    agents,
    rules,
    runtimes,
    skills,
    loading,
    handleRuleToggle,
    handleRuleDelete,
    handleUpdateAgent,
    handleDeleteAgent,
    refreshAll,
    setShowCreateAgentDialog,
  } = useDashboard();

  const { activeAgentId, setActiveAgentId } = useUIStore();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

  const activeAgent = agents.find((a) => a.id === activeAgentId);
  const editingAgent = agents.find((a) => a.id === editingAgentId);

  const handleDeleteClick = (id: string) => {
    setAgentToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (agentToDelete) {
      await handleDeleteAgent(agentToDelete);
      if (activeAgentId === agentToDelete) {
        setActiveAgentId(null);
      }
    }
    setDeleteConfirmOpen(false);
    setAgentToDelete(null);
  };

  const handleEditAgent = (id: string) => {
    setActiveAgentId(id);
    setEditingAgentId(id);
    setEditDialogOpen(true);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <AgentList
        agents={agents}
        activeAgentId={activeAgentId}
        loading={loading}
        onSelectAgent={setActiveAgentId}
        onAgentUpdated={refreshAll}
        onCreateAgent={() => setShowCreateAgentDialog(true)}
        onEditAgent={handleEditAgent}
        onDeleteAgent={handleDeleteClick}
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
            onDeleteAgent={handleDeleteClick}
            onEditAgent={handleEditAgent}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-sm">
              <p className="text-sm text-muted-foreground">{m.no_agent_selected()}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{m.no_agent_selected_desc()}</p>
            </div>
          </div>
        )}
      </div>

      {editingAgent && editDialogOpen && (
        <EditAgentDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingAgentId(null);
          }}
          agent={editingAgent}
          runtimes={runtimes}
          skills={skills}
          onSubmit={handleUpdateAgent}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete()}
        description={m.delete_agent_confirm()}
        onConfirm={handleDeleteConfirm}
        confirmLabel={m.delete()}
        variant="destructive"
      />
    </div>
  );
}
