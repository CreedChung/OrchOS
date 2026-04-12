import { useState, useCallback, useEffect } from "react"
import { cn } from "#/lib/utils"
import { Sidebar } from "#/components/layout/Sidebar"
import { ProblemInbox } from "#/components/panels/ProblemInbox"
import { StateBoard } from "#/components/panels/StateBoard"
import { ActivityPanel } from "#/components/panels/ActivityPanel"
import { CommandBar } from "#/components/panels/CommandBar"
import { CreateGoalDialog } from "#/components/dialogs/CreateGoalDialog"
import { CreateRuleDialog } from "#/components/dialogs/CreateRuleDialog"
import { SettingsDialog } from "#/components/dialogs/SettingsDialog"
import { GoalActions } from "#/components/panels/GoalActions"
import { Toolbar } from "#/components/layout/Toolbar"
import { HugeiconsIcon } from "@hugeicons/react"
import { Target01Icon, Shield01Icon, ArrowRight01Icon, ToggleLeft, ToggleRight, Cancel01Icon, Circle, Wrench01Icon, SentIcon } from "@hugeicons/core-free-icons"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty"
import { Button } from "#/components/ui/button"
import { api } from "#/lib/api"
import { useWebSocket } from "#/lib/hooks"
import type { Goal, StateItem, Artifact, ActivityEntry, AgentProfile, ControlSettings, Project, Organization, Problem, ProblemStatus, Rule, SidebarView, Command } from "#/lib/types"

const conditionLabels: Record<string, string> = {
  test_failed: "Test failed",
  lint_error: "Lint error",
  lint_warning: "Lint warning",
  review_rejected: "Review rejected",
  build_failed: "Build failed",
  build_success: "Build success",
}

const actionLabels: Record<string, string> = {
  auto_fix: "Auto fix",
  ignore: "Ignore",
  assign_reviewer: "Assign reviewer",
  archive: "Archive",
  notify: "Notify",
}

function AgentDetailView({
  agents,
  activeAgentId,
  rules,
  onRuleToggle,
  onRuleDelete,
}: {
  agents: AgentProfile[]
  activeAgentId: string | null
  rules: Rule[]
  onRuleToggle: (id: string, enabled: boolean) => void
  onRuleDelete: (id: string) => void
}) {
  const activeAgent = agents.find((a) => a.id === activeAgentId)

  if (!activeAgent) {
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
  }

  const agentRules = rules

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
              {activeAgent.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{activeAgent.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {activeAgent.model}
                </span>
                <HugeiconsIcon
                  icon={Circle}
                  className={cn(
                    "size-2 fill-current",
                    activeAgent.status === "active"
                      ? "text-emerald-500"
                      : activeAgent.status === "error"
                        ? "text-red-500"
                        : "text-muted-foreground"
                  )}
                />
                <span className="text-xs text-muted-foreground capitalize">{activeAgent.status}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{activeAgent.role}</p>
            </div>
          </div>
        </div>

        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="size-1.5 rounded-full bg-primary" />
            Capabilities
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {activeAgent.capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-accent/30 px-2.5 py-1 text-xs text-foreground"
              >
                <HugeiconsIcon icon={Wrench01Icon} className="size-3 text-primary/60" />
                {cap.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="size-1.5 rounded-full bg-primary" />
            Rules
          </h2>
          <div className="space-y-1.5">
            {agentRules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                  rule.enabled
                    ? "border-border/50 bg-card"
                    : "border-border/30 bg-muted/20 opacity-60"
                )}
              >
                <HugeiconsIcon icon={Shield01Icon} className={cn("size-4 shrink-0", rule.enabled ? "text-primary" : "text-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{rule.name}</span>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">
                      {conditionLabels[rule.condition] || rule.condition}
                    </span>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-2.5" />
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">
                      {actionLabels[rule.action] || rule.action}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRuleToggle(rule.id, !rule.enabled)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  title={rule.enabled ? "Disable rule" : "Enable rule"}
                >
                  {rule.enabled ? (
                    <HugeiconsIcon icon={ToggleRight} className="size-5 text-emerald-500" />
                  ) : (
                    <HugeiconsIcon icon={ToggleLeft} className="size-5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this rule?")) onRuleDelete(rule.id)
                  }}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  title="Delete rule"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                </button>
              </div>
            ))}
            {agentRules.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
                <HugeiconsIcon icon={Shield01Icon} className="mx-auto size-6 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No rules yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Rules can be created from Inbox problems
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export function Dashboard() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [agents, setAgents] = useState<AgentProfile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [commands, setCommands] = useState<Command[]>([])
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<SidebarView>("inbox")
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [states, setStates] = useState<StateItem[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [settings, setSettings] = useState<ControlSettings | null>({ autoCommit: false, autoFix: false, modelStrategy: "adaptive" })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCommandBar, setShowCommandBar] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showCreateRuleDialog, setShowCreateRuleDialog] = useState(false)
  const [ruleFromProblem, setRuleFromProblem] = useState<Problem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activityPanelOpen, setActivityPanelOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const activeGoal = goals.find((g) => g.id === activeGoalId) ?? null
  const activeCommand = activeGoal?.commandId ? commands.find((c) => c.id === activeGoal.commandId) : undefined

  const refreshAll = useCallback(async () => {
    const results = await Promise.allSettled([
      api.listGoals(),
      api.listAgents(),
      api.listProjects(),
      api.getSettings(),
      api.listOrganizations(),
      api.listProblems(),
      api.listRules(),
      api.listCommands(),
    ])
    if (results[0].status === "fulfilled") setGoals(results[0].value)
    if (results[1].status === "fulfilled") setAgents(results[1].value)
    if (results[2].status === "fulfilled") setProjects(results[2].value)
    if (results[3].status === "fulfilled") setSettings(results[3].value)
    if (results[4].status === "fulfilled") {
      setOrganizations(results[4].value)
      if (results[4].value.length > 0 && !activeOrganizationId) {
        setActiveOrganizationId(results[4].value[0].id)
      }
    }
    if (results[5].status === "fulfilled") setProblems(results[5].value)
    if (results[6].status === "fulfilled") setRules(results[6].value)
    if (results[7].status === "fulfilled") setCommands(results[7].value)
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

  // Keyboard shortcut: Cmd+K or Ctrl+K to open command bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setShowCommandBar(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

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

  // Command submission: creates a Command, then a Goal linked to it
  const handleCommand = async (data: { instruction: string; agentNames: string[]; projectIds: string[] }) => {
    try {
      // 1. Create the command
      const command = await api.createCommand(data)
      // 2. Create a goal from the command
      const goal = await api.createGoal({
        title: data.instruction.length > 60 ? data.instruction.slice(0, 60) + "..." : data.instruction,
        description: data.instruction,
        successCriteria: ["completed"],
        commandId: command.id,
        watchers: data.agentNames,
        projectId: data.projectIds[0],
      })
      // 3. Link command back to goal
      await api.updateCommand(command.id, { goalId: goal.id })
      // 4. Update command status
      await api.updateCommand(command.id, { status: "executing" })
      setShowCommandBar(false)
      await refreshAll()
      setActiveGoalId(goal.id)
      setActiveView("goals")
    } catch (err) {
      console.error("Command failed:", err)
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
            activities={activities}
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
            activities={activities}
            projects={projects}
            command={activeCommand}
            problems={{
              critical: problems.filter((p) => p.status === "open" && p.priority === "critical" && p.goalId === activeGoalId).length,
              warning: problems.filter((p) => p.status === "open" && p.priority === "warning" && p.goalId === activeGoalId).length,
              info: problems.filter((p) => p.status === "open" && p.priority === "info" && p.goalId === activeGoalId).length,
            }}
            onStateAction={handleStateAction}
            onAutoModeToggle={activeGoal.status === "active" ? handlePauseGoal : handleResumeGoal}
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
                <HugeiconsIcon icon={Target01Icon} />
              </EmptyMedia>
              <EmptyTitle>No goal selected</EmptyTitle>
              <EmptyDescription>Select a goal from the sidebar or send a command to get started.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex gap-2">
                <Button onClick={() => setShowCommandBar(true)}>
                  <HugeiconsIcon icon={SentIcon} className="size-3.5 mr-1.5" />
                  Send Command
                </Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                  Create Goal
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        )

      case "agents":
        return (
          <AgentDetailView
            agents={agents}
            activeAgentId={activeAgentId}
            rules={rules}
            onRuleToggle={handleRuleToggle}
            onRuleDelete={handleRuleDelete}
          />
        )

      case "agent-detail":
        return (
          <AgentDetailView
            agents={agents}
            activeAgentId={activeAgentId}
            rules={rules}
            onRuleToggle={handleRuleToggle}
            onRuleDelete={handleRuleDelete}
          />
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
          organizations={organizations}
          problems={problems}
          activeOrganizationId={activeOrganizationId}
          activeView={activeView}
          activeGoalId={activeGoalId}
          activeAgentId={activeAgentId}
          searchQuery={searchQuery}
          onViewChange={setActiveView}
          onGoalSelect={(id) => {
            setActiveGoalId(id)
            setActiveView("goals")
          }}
          onAgentSelect={(id) => {
            setActiveAgentId(id)
            setActiveView("agent-detail")
          }}
          onOpenSettings={() => setShowSettingsDialog(true)}
          onOrganizationChange={setActiveOrganizationId}
          onOrganizationRename={handleOrganizationRename}
          onOrganizationDelete={handleOrganizationDelete}
          onGoalRename={handleGoalRename}
          onGoalDelete={handleDeleteGoal}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Toolbar
            activeView={activeView}
            onNewCommand={() => setShowCommandBar(true)}
            onCreateGoal={() => setShowCreateDialog(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activityPanelOpen={activityPanelOpen}
            onToggleActivityPanel={() => setActivityPanelOpen((v) => !v)}
          />
          {renderMainContent()}
        </div>
        <ActivityPanel
          activities={activities}
          collapsed={!activityPanelOpen}
          onToggle={() => setActivityPanelOpen((v) => !v)}
        />
      </div>
      <CommandBar
        agents={agents}
        projects={projects}
        open={showCommandBar}
        onSubmit={handleCommand}
        onClose={() => setShowCommandBar(false)}
      />
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
