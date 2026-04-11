import { useState, useCallback, useEffect } from "react"
import { Sidebar } from "#/components/Sidebar"
import { ProblemInbox } from "#/components/ProblemInbox"
import { StateBoard } from "#/components/StateBoard"
import { ActivityPanel } from "#/components/ActivityPanel"
import { RulesPanel } from "#/components/RulesPanel"
import { CreateGoalDialog } from "#/components/CreateGoalDialog"
import { CreateRuleDialog } from "#/components/CreateRuleDialog"
import { SettingsDialog } from "#/components/SettingsDialog"
import { GoalActions } from "#/components/GoalActions"
import { Target } from "lucide-react"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty"
import { Button } from "#/components/ui/button"
import { api } from "#/lib/api"
import { useWebSocket } from "#/lib/hooks"
import type { Goal, StateItem, Artifact, ActivityEntry, AgentProfile, ControlSettings, Project, HistoryEntry, Status, Organization, Problem, ProblemStatus, Rule, SidebarView } from "#/lib/types"

export function Dashboard() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [agents, setAgents] = useState<AgentProfile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<SidebarView>("inbox")
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)
  const [states, setStates] = useState<StateItem[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [settings, setSettings] = useState<ControlSettings | null>({ autoCommit: false, autoFix: false, modelStrategy: "adaptive" })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showCreateRuleDialog, setShowCreateRuleDialog] = useState(false)
  const [ruleFromProblem, setRuleFromProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)

  const activeGoal = goals.find((g) => g.id === activeGoalId) ?? null

  const refreshAll = useCallback(async () => {
    const results = await Promise.allSettled([
      api.listGoals(),
      api.listAgents(),
      api.listProjects(),
      api.getHistory(undefined, 50),
      api.getSettings(),
      api.listOrganizations(),
      api.listProblems(),
      api.listRules(),
    ])
    if (results[0].status === "fulfilled") setGoals(results[0].value)
    if (results[1].status === "fulfilled") setAgents(results[1].value)
    if (results[2].status === "fulfilled") setProjects(results[2].value)
    if (results[3].status === "fulfilled") setHistory(results[3].value)
    if (results[4].status === "fulfilled") setSettings(results[4].value)
    if (results[5].status === "fulfilled") {
      setOrganizations(results[5].value)
      if (results[5].value.length > 0 && !activeOrganizationId) {
        setActiveOrganizationId(results[5].value[0].id)
      }
    }
    if (results[6].status === "fulfilled") setProblems(results[6].value)
    if (results[7].status === "fulfilled") setRules(results[7].value)
    for (const r of results) {
      if (r.status === "rejected") console.error("Failed to fetch data:", r.reason)
    }
    setLoading(false)
  }, [])

  const refreshGoalData = useCallback(async (goalId: string | null) => {
    if (!goalId) return
    try {
      const [s, a, act] = await Promise.all([
        api.getStates(goalId),
        api.getArtifacts(goalId),
        api.getActivities(goalId),
      ])
      setStates(s)
      setArtifacts(a)
      setActivities(act)
    } catch (err) {
      console.error("Failed to fetch goal data:", err)
    }
  }, [])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    refreshGoalData(activeGoalId)
  }, [activeGoalId, refreshGoalData])

  useWebSocket((event) => {
    if (event.goalId === activeGoalId || !event.goalId) {
      refreshGoalData(activeGoalId)
      refreshAll()
    }
  })

  // Problem actions
  const handleProblemAction = async (problemId: string, action: string) => {
    const problem = problems.find((p) => p.id === problemId)
    if (!problem) return

    const statusMap: Record<string, ProblemStatus> = {
      "Fix": "assigned",
      "Apply fix": "assigned",
      "Apply suggestion": "assigned",
      "Ignore": "ignored",
      "Dismiss": "ignored",
      "Override": "fixed",
      "Assign": "assigned",
      "Archive": "fixed",
    }

    const newStatus = statusMap[action]
    if (newStatus) {
      try {
        await api.updateProblem(problemId, { status: newStatus })
        // If action is Fix/Apply fix and there's a goal, trigger the agent
        if ((action === "Fix" || action === "Apply fix" || action === "Apply suggestion") && problem.goalId) {
          await api.triggerAction(problem.goalId, "fix_bug", problem.stateId)
        }
        await refreshAll()
      } catch (err) {
        console.error("Problem action failed:", err)
      }
    }
  }

  const handleBulkAction = async (ids: string[], status: ProblemStatus) => {
    try {
      await api.bulkUpdateProblems(ids, status)
      await refreshAll()
    } catch (err) {
      console.error("Bulk action failed:", err)
    }
  }

  const handleCreateRuleFromProblem = (problem: Problem) => {
    setRuleFromProblem(problem)
    setShowCreateRuleDialog(true)
  }

  const handleCreateRule = async (data: { name: string; condition: string; action: string }) => {
    try {
      await api.createRule(data)
      setShowCreateRuleDialog(false)
      setRuleFromProblem(null)
      await refreshAll()
    } catch (err) {
      console.error("Failed to create rule:", err)
    }
  }

  const handleRuleToggle = async (id: string, enabled: boolean) => {
    try {
      await api.updateRule(id, { enabled })
      await refreshAll()
    } catch (err) {
      console.error("Failed to toggle rule:", err)
    }
  }

  const handleRuleDelete = async (id: string) => {
    try {
      await api.deleteRule(id)
      await refreshAll()
    } catch (err) {
      console.error("Failed to delete rule:", err)
    }
  }

  // State actions
  const handleStateAction = async (stateId: string, action: string) => {
    if (!activeGoalId) return
    const actionMap: Record<string, string> = {
      "Fix": "fix_bug",
      "Ignore": "fix_bug",
      "Dismiss": "fix_bug",
      "Apply suggestion": "review",
      "Retry": "run_tests",
    }
    const apiAction = actionMap[action] || "fix_bug"
    try {
      await api.triggerAction(activeGoalId, apiAction as any, stateId)
      await refreshGoalData(activeGoalId)
    } catch (err) {
      console.error("Action failed:", err)
    }
  }

  const handleStateStatusChange = async (stateId: string, newStatus: Status) => {
    try {
      await api.updateState(stateId, newStatus)
      refreshGoalData(activeGoalId)
    } catch (err) {
      console.error("Failed to update state:", err)
    }
  }

  const handleCreateGoal = async (data: { title: string; description?: string; successCriteria: string[]; constraints?: string[] }) => {
    try {
      const goal = await api.createGoal(data)
      setShowCreateDialog(false)
      await refreshAll()
      setActiveGoalId(goal.id)
      setActiveView("goals")
    } catch (err) {
      console.error("Failed to create goal:", err)
    }
  }

  const handlePauseGoal = async () => {
    if (!activeGoalId) return
    try {
      await api.updateGoal(activeGoalId, { status: "paused" })
      await refreshAll()
    } catch (err) {
      console.error("Failed to pause goal:", err)
    }
  }

  const handleResumeGoal = async () => {
    if (!activeGoalId) return
    try {
      await api.updateGoal(activeGoalId, { status: "active" })
      await refreshAll()
    } catch (err) {
      console.error("Failed to resume goal:", err)
    }
  }

  const handleDeleteGoal = async (goalId?: string) => {
    const id = goalId ?? activeGoalId
    if (!id) return
    try {
      await api.deleteGoal(id)
      if (activeGoalId === id) {
        const remaining = goals.filter((g) => g.id !== id)
        setActiveGoalId(remaining.length > 0 ? remaining[0].id : null)
      }
      await refreshAll()
    } catch (err) {
      console.error("Failed to delete goal:", err)
    }
  }

  const handleGoalRename = async (goalId: string, name: string) => {
    try {
      await api.updateGoal(goalId, { title: name })
      await refreshAll()
    } catch (err) {
      console.error("Failed to rename goal:", err)
    }
  }

  const handleOrganizationRename = async (orgId: string, name: string) => {
    try {
      await api.updateOrganization(orgId, { name })
      await refreshAll()
    } catch (err) {
      console.error("Failed to rename organization:", err)
    }
  }

  const handleOrganizationDelete = async (orgId: string) => {
    try {
      await api.deleteOrganization(orgId)
      if (activeOrganizationId === orgId) {
        const remaining = organizations.filter((o) => o.id !== orgId)
        setActiveOrganizationId(remaining.length > 0 ? remaining[0].id : null)
      }
      await refreshAll()
    } catch (err) {
      console.error("Failed to delete organization:", err)
    }
  }

  const handleAgentToggle = async (agentId: string, enabled: boolean) => {
    try {
      await api.updateAgent(agentId, { enabled })
      await refreshAll()
    } catch (err) {
      console.error("Failed to toggle agent:", err)
    }
  }

  // Render main content based on active view
  const renderMainContent = () => {
    switch (activeView) {
      case "inbox":
        return (
          <ProblemInbox
            problems={problems}
            goals={goals}
            onProblemAction={handleProblemAction}
            onBulkAction={handleBulkAction}
            onCreateRule={handleCreateRuleFromProblem}
          />
        )

      case "goals":
        return activeGoal ? (
          <StateBoard
            goal={activeGoal}
            states={states}
            artifacts={artifacts}
            projects={projects}
            onStateAction={handleStateAction}
            onStateStatusChange={handleStateStatusChange}
            goalActions={
              <GoalActions
                goal={activeGoal}
                onPause={handlePauseGoal}
                onResume={handleResumeGoal}
                onDelete={handleDeleteGoal}
              />
            }
          />
        ) : (
          <Empty className="flex-1">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Target />
              </EmptyMedia>
              <EmptyTitle>No goal selected</EmptyTitle>
              <EmptyDescription>Select a goal from the sidebar or create a new one to get started.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setShowCreateDialog(true)}>Create Goal</Button>
            </EmptyContent>
          </Empty>
        )

      case "agents":
        return (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Agents</h2>
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{agent.name}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {agent.model}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{agent.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${agent.status === "active" ? "bg-emerald-500" : agent.status === "error" ? "bg-red-500" : "bg-muted-foreground"}`} />
                    <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case "rules":
        return (
          <RulesPanel
            rules={rules}
            onCreateRule={handleCreateRule}
            onToggleRule={handleRuleToggle}
            onDeleteRule={handleRuleDelete}
          />
        )

      case "history":
        return (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">History</h2>
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-2.5">
                  <span className="text-xs font-semibold text-foreground/70">{entry.type}</span>
                  <span className="text-xs text-muted-foreground">{JSON.stringify(entry.detail).slice(0, 80)}</span>
                  <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{entry.timestamp}</span>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground">No history yet</p>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          goals={goals}
          agents={agents}
          projects={projects}
          history={history}
          organizations={organizations}
          problems={problems}
          activeOrganizationId={activeOrganizationId}
          activeView={activeView}
          activeGoalId={activeGoalId}
          onViewChange={setActiveView}
          onGoalSelect={(id) => {
            setActiveGoalId(id)
            setActiveView("goals")
          }}
          onCreateGoal={() => setShowCreateDialog(true)}
          onOpenSettings={() => setShowSettingsDialog(true)}
          onOrganizationChange={setActiveOrganizationId}
          onOrganizationRename={handleOrganizationRename}
          onOrganizationDelete={handleOrganizationDelete}
          onGoalRename={handleGoalRename}
          onGoalDelete={handleDeleteGoal}
        />
        {renderMainContent()}
        <ActivityPanel activities={activities} />
      </div>
      <CreateGoalDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateGoal}
      />
      <CreateRuleDialog
        open={showCreateRuleDialog}
        onClose={() => {
          setShowCreateRuleDialog(false)
          setRuleFromProblem(null)
        }}
        problem={ruleFromProblem}
        onSubmit={handleCreateRule}
      />
      <SettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        settings={settings}
        onSettingsChange={setSettings}
        agents={agents}
        onAgentToggle={handleAgentToggle}
      />
    </div>
  )
}
