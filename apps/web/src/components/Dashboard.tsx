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
  const [settings, setSettings] = useState<ControlSettings | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  const activeGoal = goals.find((g) => g.id === activeGoalId) ?? null

  // Fetch all data
  const refreshAll = useCallback(async () => {
    try {
      const [g, a, p, h, s, orgs] = await Promise.all([
        api.listGoals(),
        api.listAgents(),
        api.listProjects(),
        api.getHistory(undefined, 50),
        api.getSettings(),
        api.listOrganizations(),
      ])
      setGoals(g)
      setAgents(a)
      setProjects(p)
      setHistory(h)
      setSettings(s)
      setOrganizations(orgs)
      if (orgs.length > 0 && !activeOrganizationId) {
        setActiveOrganizationId(orgs[0].id)
      }
    } catch (err) {
      console.error("Failed to fetch data:", err)
    } finally {
      setLoading(false)
    }
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
  const handleDeleteGoal = async () => {
    if (!activeGoalId) return
    try {
      await api.deleteGoal(activeGoalId)
      const remaining = goals.filter((g) => g.id !== activeGoalId)
      setActiveGoalId(remaining.length > 0 ? remaining[0].id : null)
      await refreshAll()
    } catch (err) {
      console.error("Failed to delete goal:", err)
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
        />
        {activeGoal ? (
          <StateBoard
            goal={activeGoal}
            states={states}
            artifacts={artifacts}
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
      />
    </div>
  )
}
