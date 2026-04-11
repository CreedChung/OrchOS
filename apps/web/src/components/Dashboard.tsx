import { useState, useCallback, useEffect } from "react"
import { Sidebar } from "#/components/Sidebar"
import { StateBoard } from "#/components/StateBoard"
import { ActivityPanel } from "#/components/ActivityPanel"

import { CreateGoalDialog } from "#/components/CreateGoalDialog"
import { SettingsDialog } from "#/components/SettingsDialog"
import { GoalActions } from "#/components/GoalActions"
import { Target } from "lucide-react"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty"
import { Button } from "#/components/ui/button"
import { api } from "#/lib/api"
import { useWebSocket } from "#/lib/hooks"
import type { Goal, StateItem, Artifact, ActivityEntry, AgentProfile, ControlSettings, Project, HistoryEntry, Status, Organization } from "#/lib/types"

export function Dashboard() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [agents, setAgents] = useState<AgentProfile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null)
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)
  const [states, setStates] = useState<StateItem[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [settings, setSettings] = useState<ControlSettings | null>({ autoCommit: false, autoFix: false, modelStrategy: "adaptive" })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  const activeGoal = goals.find((g) => g.id === activeGoalId) ?? null

  // Fetch all data
  const refreshAll = useCallback(async () => {
    const results = await Promise.allSettled([
      api.listGoals(),
      api.listAgents(),
      api.listProjects(),
      api.getHistory(undefined, 50),
      api.getSettings(),
      api.listOrganizations(),
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

  // Initial load
  useEffect(() => {
    refreshAll().then(() => {
      api.listGoals().then((g) => {
        if (g.length > 0) setActiveGoalId(g[0].id)
      })
    })
  }, [refreshAll])

  // Load goal-specific data when active goal changes
  useEffect(() => {
    refreshGoalData(activeGoalId)
  }, [activeGoalId, refreshGoalData])

  // WebSocket for real-time updates
  useWebSocket((event) => {
    if (event.goalId === activeGoalId || !event.goalId) {
      refreshGoalData(activeGoalId)
      refreshAll()
    }
  })

  // Handle state actions (Fix, Ignore, etc.)
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

  // Handle state status change (manual edit)
  const handleStateStatusChange = async (stateId: string, newStatus: Status) => {
    try {
      await api.updateState(stateId, newStatus)
      refreshGoalData(activeGoalId)
    } catch (err) {
      console.error("Failed to update state:", err)
    }
  }

  // Handle goal creation
  const handleCreateGoal = async (data: { title: string; description?: string; successCriteria: string[]; constraints?: string[] }) => {
    try {
      const goal = await api.createGoal(data)
      setShowCreateDialog(false)
      await refreshAll()
      setActiveGoalId(goal.id)
    } catch (err) {
      console.error("Failed to create goal:", err)
    }
  }

  // Handle goal pause
  const handlePauseGoal = async () => {
    if (!activeGoalId) return
    try {
      await api.updateGoal(activeGoalId, { status: "paused" })
      await refreshAll()
    } catch (err) {
      console.error("Failed to pause goal:", err)
    }
  }

  // Handle goal resume
  const handleResumeGoal = async () => {
    if (!activeGoalId) return
    try {
      await api.updateGoal(activeGoalId, { status: "active" })
      await refreshAll()
    } catch (err) {
      console.error("Failed to resume goal:", err)
    }
  }

  // Handle goal delete
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

  // Handle goal rename
  const handleGoalRename = async (goalId: string, name: string) => {
    try {
      await api.updateGoal(goalId, { title: name })
      await refreshAll()
    } catch (err) {
      console.error("Failed to rename goal:", err)
    }
  }

  // Handle organization rename
  const handleOrganizationRename = async (orgId: string, name: string) => {
    try {
      await api.updateOrganization(orgId, { name })
      await refreshAll()
    } catch (err) {
      console.error("Failed to rename organization:", err)
    }
  }

  // Handle organization delete
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

  // Handle agent toggle
  const handleAgentToggle = async (agentId: string, enabled: boolean) => {
    try {
      await api.updateAgent(agentId, { enabled })
      await refreshAll()
    } catch (err) {
      console.error("Failed to toggle agent:", err)
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
          activeOrganizationId={activeOrganizationId}
          activeGoalId={activeGoalId}
          onGoalSelect={setActiveGoalId}
          onCreateGoal={() => setShowCreateDialog(true)}
          onOpenSettings={() => setShowSettingsDialog(true)}
          onOrganizationChange={setActiveOrganizationId}
          onOrganizationRename={handleOrganizationRename}
          onOrganizationDelete={handleOrganizationDelete}
          onGoalRename={handleGoalRename}
          onGoalDelete={handleDeleteGoal}
        />
        {activeGoal ? (
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
        )}
        <ActivityPanel activities={activities} />
      </div>
      <CreateGoalDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateGoal}
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
