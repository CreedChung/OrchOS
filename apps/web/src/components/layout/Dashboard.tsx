import { useState, useCallback, useEffect, useMemo } from "react"
import { cn } from "#/lib/utils"
import { Sidebar } from "#/components/layout/Sidebar"
import { InboxList } from "#/components/panels/InboxList"
import { InboxDetail, InboxNoSelection } from "#/components/panels/InboxDetail"
import { StateBoard } from "#/components/panels/StateBoard"
import { ActivityPanel } from "#/components/panels/ActivityPanel"
import { CommandBar } from "#/components/panels/CommandBar"
import { CreateGoalDialog } from "#/components/dialogs/CreateGoalDialog"
import { CreateRuleDialog } from "#/components/dialogs/CreateRuleDialog"
import { SettingsDialog } from "#/components/dialogs/SettingsDialog"
import { CreateAgentDialog } from "#/components/dialogs/CreateAgentDialog"
import { ObservabilityView } from "#/components/panels/ObservabilityView"
import { GoalActions } from "#/components/panels/GoalActions"
import { GoalList } from "#/components/panels/GoalList"
import { AgentList } from "#/components/panels/AgentList"
import { Toolbar, type AgentModelFilter } from "#/components/layout/Toolbar"
import { McpServersView } from "#/components/panels/McpServersView"
import { SkillsView } from "#/components/panels/SkillsView"
import { EnvironmentsView } from "#/components/panels/EnvironmentsView"
import { HugeiconsIcon } from "@hugeicons/react"
import { Shield01Icon, ArrowRight01Icon, ToggleLeft, ToggleRight, Cancel01Icon, Circle, Wrench01Icon } from "@hugeicons/core-free-icons"
import { ConfirmDialog } from "#/components/ui/confirm-dialog"
import { api } from "#/lib/api"
import { useWebSocket } from "#/lib/hooks"
import { I18nProvider } from "#/lib/useI18n"
import { m } from "#/paraglide/messages"
import { useUIStore } from "#/lib/store"
import type { Goal, StateItem, Artifact, ActivityEntry, AgentProfile, Project, Organization, Problem, ProblemStatus, Rule, SidebarView, Command } from "#/lib/types"
import { isInboxItem, isSystemProblem } from "#/lib/types"

const conditionLabels: Record<string, string> = {
  test_failed: m.test_failed(),
  lint_error: m.lint_error(),
  lint_warning: m.lint_warning(),
  review_rejected: m.review_rejected(),
  build_failed: m.build_failed(),
  build_success: m.build_success(),
}

const actionLabels: Record<string, string> = {
  auto_fix: m.auto_fix_rule(),
  ignore: m.ignore_rule(),
  assign_reviewer: m.assign_reviewer(),
  archive: m.archive(),
  notify: m.notify(),
}

function AgentDetailView({
  agent,
  rules,
  onRuleToggle,
  onRuleDelete,
}: {
  agent: AgentProfile
  rules: Rule[]
  onRuleToggle: (id: string, enabled: boolean) => void
  onRuleDelete: (id: string) => void
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null)

  const handleDeleteClick = (id: string) => {
    setRuleToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (ruleToDelete) {
      onRuleDelete(ruleToDelete)
      setRuleToDelete(null)
    }
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{agent.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {agent.model}
                </span>
                <HugeiconsIcon
                  icon={Circle}
                  className={cn(
                    "size-2 fill-current",
                    agent.status === "active"
                      ? "text-emerald-500"
                      : agent.status === "error"
                        ? "text-red-500"
                        : "text-muted-foreground"
                  )}
                />
                <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{agent.role}</p>
            </div>
          </div>
        </div>

        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="size-1.5 rounded-full bg-primary" />
            {m.capabilities()}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.map((cap) => (
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
            {m.automation_rules()}
          </h2>
          <div className="space-y-1.5">
            {rules.map((rule) => (
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
                  title={rule.enabled ? m.disable_rule() : m.enable_rule()}
                >
                  {rule.enabled ? (
                    <HugeiconsIcon icon={ToggleRight} className="size-5 text-emerald-500" />
                  ) : (
                    <HugeiconsIcon icon={ToggleLeft} className="size-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDeleteClick(rule.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  title={m.delete()}
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                </button>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
                <HugeiconsIcon icon={Shield01Icon} className="mx-auto size-6 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{m.no_rules_yet()}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {m.create_rules_desc()}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete_rule_confirm()}
        description={m.delete_rule_confirm()}
        onConfirm={handleDeleteConfirm}
        confirmLabel={m.delete()}
        variant="destructive"
      />
    </main>
  )
}

export function Dashboard() {
  // Persisted state from zustand store
  const {
    activeView, setActiveView,
    activeGoalId, setActiveGoalId,
    activeAgentId, setActiveAgentId,
    activeInboxId, setActiveInboxId,
    activeOrganizationId, setActiveOrganizationId,
    sourceFilter, setSourceFilter,
    goalStatusFilter, setGoalStatusFilter,
    scopeFilter, setScopeFilter,
    activityPanelOpen, toggleActivityPanel,
    settings: persistedSettings, setSettings,
  } = useUIStore()

  // Server data (not persisted - refetched on load)
  const [goals, setGoals] = useState<Goal[]>([])
  const [agents, setAgents] = useState<AgentProfile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [commands, setCommands] = useState<Command[]>([])
  const [mcpServers, setMcpServers] = useState<import("#/lib/api").McpServerProfile[]>([])
  const [skills, setSkills] = useState<import("#/lib/api").SkillProfile[]>([])
  const [states, setStates] = useState<StateItem[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])

  // Transient UI state (not persisted)
  const settings = persistedSettings
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCommandBar, setShowCommandBar] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showCreateRuleDialog, setShowCreateRuleDialog] = useState(false)
  const [showCreateAgentDialog, setShowCreateAgentDialog] = useState(false)
  const [ruleFromProblem, setRuleFromProblem] = useState<Problem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [agentModelFilter, setAgentModelFilter] = useState<AgentModelFilter>("all")
  const [loading, setLoading] = useState(true)

  const activeGoal = goals.find((g) => g.id === activeGoalId) ?? null
  const activeCommand = activeGoal?.commandId ? commands.find((c) => c.id === activeGoal.commandId) : undefined

  const inboxCounts = useMemo(() => {
    const inboxItems = problems.filter((p) => p.status === "open" && isInboxItem(p))
    return {
      all: inboxItems.length,
      github_pr: inboxItems.filter((p) => p.source === "github_pr").length,
      github_issue: inboxItems.filter((p) => p.source === "github_issue").length,
      mention: inboxItems.filter((p) => p.source === "mention").length,
      agent_request: inboxItems.filter((p) => p.source === "agent_request").length,
    }
  }, [problems])

  const systemProblemCounts = useMemo(() => ({
    critical: problems.filter((p) => p.status === "open" && p.priority === "critical" && isSystemProblem(p)).length,
    warning: problems.filter((p) => p.status === "open" && p.priority === "warning" && isSystemProblem(p)).length,
    info: problems.filter((p) => p.status === "open" && p.priority === "info" && isSystemProblem(p)).length,
  }), [problems])

  const goalCounts = useMemo(() => ({
    all: goals.length,
    active: goals.filter((g) => g.status === "active").length,
    completed: goals.filter((g) => g.status === "completed").length,
    paused: goals.filter((g) => g.status === "paused").length,
  }), [goals])

  const scopeCounts = useMemo(() => {
    const items = activeView === "skills" ? skills : mcpServers
    return {
      all: items.length,
      global: items.filter((s: { scope: string }) => s.scope === "global").length,
      project: items.filter((s: { scope: string }) => s.scope === "project").length,
    }
  }, [activeView, mcpServers, skills])

  const agentModelCounts = useMemo(() => ({
    all: agents.length,
    local: agents.filter((a) => a.model.startsWith("local/")).length,
    cloud: agents.filter((a) => !a.model.startsWith("local/")).length,
  }), [agents])

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
      api.listMcpServers(),
      api.listSkills(),
    ])
    if (results[0].status === "fulfilled") setGoals(results[0].value)
    if (results[1].status === "fulfilled") setAgents(results[1].value)
    if (results[2].status === "fulfilled") setProjects(results[2].value)
    if (results[3].status === "fulfilled") setSettings(results[3].value)
    if (results[4].status === "fulfilled") {
      setOrganizations(results[4].value)
      const currentOrgId = useUIStore.getState().activeOrganizationId
      if (results[4].value.length > 0 && !currentOrgId) {
        setActiveOrganizationId(results[4].value[0].id)
      }
    }
    if (results[5].status === "fulfilled") setProblems(results[5].value)
    if (results[6].status === "fulfilled") setRules(results[6].value)
    if (results[7].status === "fulfilled") setCommands(results[7].value)
    if (results[8].status === "fulfilled") setMcpServers(results[8].value)
    if (results[9].status === "fulfilled") setSkills(results[9].value)
    for (const r of results) {
      if (r.status === "rejected") console.error("Failed to fetch data:", r.reason)
    }
    setLoading(false)
  }, [setSettings, setActiveOrganizationId])

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

  // Convert inbox item to goal
  const handleConvertToGoal = async (problemId: string, suggestedGoal?: string) => {
    const problem = problems.find((p) => p.id === problemId)
    if (!problem) return

    try {
      const goalTitle = suggestedGoal || problem.title
      const goal = await api.createGoal({
        title: goalTitle,
        description: `Converted from inbox: ${problem.source} — ${problem.title}${problem.context ? `\n\n${problem.context}` : ""}`,
        successCriteria: ["completed"],
        watchers: problem.source === "agent_request" ? [problem.context || ""] : [],
      })
      await api.updateProblem(problemId, { status: "assigned" })
      await refreshAll()
      setActiveGoalId(goal.id)
      setActiveView("goals")
    } catch (err) {
      console.error("Convert to goal failed:", err)
    }
  }

  const handleDismiss = async (problemId: string) => {
    try {
      await api.updateProblem(problemId, { status: "ignored" })
      await refreshAll()
    } catch (err) {
      console.error("Dismiss failed:", err)
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

  const handleCreateGoal = async (data: { title: string; description?: string; successCriteria: string[]; constraints?: string[]; projectId?: string }) => {
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

  const handleCreateAgent = async (data: { name: string; role: string; capabilities: string[]; model: string; cliCommand?: string; runtimeId?: string }) => {
    try {
      await api.createAgent(data)
      setShowCreateAgentDialog(false)
      await refreshAll()
    } catch (err) {
      console.error("Failed to create agent:", err)
    }
  }

  // Render main content based on active view
  const renderMainContent = () => {
    switch (activeView) {
      case "inbox": {
        const activeInboxItem = problems.find((p) => p.id === activeInboxId && p.status === "open" && isInboxItem(p))
        return (
          <div className="flex flex-1 overflow-hidden">
            <InboxList
              problems={problems}
              activeInboxId={activeInboxId}
              sourceFilter={sourceFilter}
              onSelectItem={setActiveInboxId}
            />
            <div className="flex-1 overflow-hidden">
              {activeInboxItem ? (
                <InboxDetail
                  item={activeInboxItem}
                  onConvertToGoal={handleConvertToGoal}
                  onDismiss={handleDismiss}
                />
              ) : (
                <InboxNoSelection />
              )}
            </div>
          </div>
        )
      }

      case "goals":
        return (
          <div className="flex flex-1 overflow-hidden">
            <GoalList
              goals={goals}
              projects={projects}
              activeGoalId={activeGoalId}
              statusFilter={goalStatusFilter}
              searchQuery={searchQuery}
              onSelectGoal={setActiveGoalId}
              onNewCommand={() => setShowCommandBar(true)}
              onCreateGoal={() => setShowCreateDialog(true)}
            />
            <div className="flex-1 overflow-hidden">
              {activeGoal ? (
                <StateBoard
                  goal={activeGoal}
                  states={states}
                  artifacts={artifacts}
                  activities={activities}
                  projects={projects}
                  command={activeCommand}
                  problems={{
                    critical: problems.filter((p) => p.status === "open" && p.priority === "critical" && isSystemProblem(p) && p.goalId === activeGoalId).length,
                    warning: problems.filter((p) => p.status === "open" && p.priority === "warning" && isSystemProblem(p) && p.goalId === activeGoalId).length,
                    info: problems.filter((p) => p.status === "open" && p.priority === "info" && isSystemProblem(p) && p.goalId === activeGoalId).length,
                  }}
                  systemProblems={problems.filter((p) => p.status === "open" && isSystemProblem(p) && p.goalId === activeGoalId)}
                  onStateAction={handleStateAction}
                  onProblemAction={handleProblemAction}
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
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{m.no_goal_selected()}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{m.no_goal_selected_desc()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case "agents":
      case "agent-detail": {
        const activeAgent = agents.find((a) => a.id === activeAgentId)
        return (
          <div className="flex flex-1 overflow-hidden">
            <AgentList
              agents={agents}
              activeAgentId={activeAgentId}
              onSelectAgent={setActiveAgentId}
              onCreateAgent={() => setShowCreateAgentDialog(true)}
            />
            <div className="flex-1 overflow-hidden">
              {activeAgent ? (
                <AgentDetailView
                  agent={activeAgent}
                  rules={rules}
                  onRuleToggle={handleRuleToggle}
                  onRuleDelete={handleRuleDelete}
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

      case "mcp-servers":
        return <McpServersView servers={mcpServers} onRefresh={refreshAll} scopeFilter={scopeFilter} />

      case "skills":
        return <SkillsView skills={skills} onRefresh={refreshAll} scopeFilter={scopeFilter} />

      case "environments":
        return <EnvironmentsView agents={agents} projects={projects} onRefresh={refreshAll} />

      case "observability":
      case "settings": {
        if (activeView === "observability") {
          return (
            <ObservabilityView
              agents={agents}
              goals={goals}
              problems={problems}
            />
          )
        }
        const placeholder = placeholderViews[activeView]
        return placeholder ? renderPlaceholderContent(placeholder.title, placeholder.description) : null
      }

      default:
        return null
    }
  }

  const renderPlaceholderContent = (title: string, description: string) => (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )

  const placeholderViews: Partial<Record<SidebarView, { title: string; description: string }>> = {
    "mcp-servers": { title: m.mcp_servers(), description: m.mcp_servers_desc() },
    "observability": { title: m.observability(), description: m.observability_desc() },
    "settings": { title: m.settings(), description: m.settings_desc() },
  }

  return (
    <I18nProvider>
    {loading ? (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm" suppressHydrationWarning>{m.loading()}</span>
        </div>
      </div>
    ) : (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          organizations={organizations}
          problems={problems}
          activeOrganizationId={activeOrganizationId}
          activeView={activeView}
          onViewChange={(view) => { setActiveView(view); setScopeFilter("all") }}
          onOpenSettings={() => { setActiveView("settings"); setShowSettingsDialog(true) }}
          onOrganizationChange={setActiveOrganizationId}
          onOrganizationRename={handleOrganizationRename}
          onOrganizationDelete={handleOrganizationDelete}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Toolbar
            activeView={activeView}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activityPanelOpen={activityPanelOpen}
            onToggleActivityPanel={toggleActivityPanel}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            inboxCounts={inboxCounts}
            goalStatusFilter={goalStatusFilter}
            onGoalStatusFilterChange={setGoalStatusFilter}
            goalCounts={goalCounts}
            scopeFilter={scopeFilter}
            onScopeFilterChange={setScopeFilter}
            scopeCounts={scopeCounts}
            agentModelFilter={agentModelFilter}
            onAgentModelFilterChange={setAgentModelFilter}
            agentModelCounts={agentModelCounts}
          />
          {renderMainContent()}
        </div>
        <ActivityPanel
          activities={activities}
          collapsed={!activityPanelOpen}
          onToggle={toggleActivityPanel}
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
        projects={projects}
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
        onAgentsRefresh={refreshAll}
        registeredAgents={agents}
      />
      <CreateAgentDialog
        open={showCreateAgentDialog}
        onClose={() => setShowCreateAgentDialog(false)}
        runtimes={agents.filter((a) => a.cliCommand)}
        onSubmit={handleCreateAgent}
      />
    </div>
    )}
    </I18nProvider>
  )
}
