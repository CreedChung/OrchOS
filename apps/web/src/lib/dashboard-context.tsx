import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  api,
  type McpServerProfile,
  type ProblemSummary,
  type SkillProfile,
  type RuntimeProfile,
} from "@/lib/api";
import { useWebSocket } from "@/lib/hooks";
import { useUIStore } from "@/lib/store";
import { useDashboardCache } from "@/lib/dashboard-cache";
import type {
  Goal,
  StateItem,
  Artifact,
  ActivityEntry,
  AgentProfile,
  Project,
  Organization,
  Problem,
  ProblemStatus,
  Rule,
  Command,
  ControlSettings,
} from "@/lib/types";

type DashboardView =
  | "inbox"
  | "creation"
  | "agents"
  | "rules"
  | "mcp-servers"
  | "skills"
  | "projects"
  | "observability";

function getViewFromPath(pathname: string): DashboardView {
  const segment = pathname.replace("/dashboard/", "").replace("/dashboard", "");
  const validViews: DashboardView[] = [
    "inbox",
    "creation",
    "agents",
    "rules",
    "mcp-servers",
    "skills",
    "projects",
    "observability",
  ];
  return validViews.includes(segment as DashboardView) ? (segment as DashboardView) : "inbox";
}

export type { AgentModelFilter } from "@/components/layout/Toolbar";

interface InboxCounts {
  all: number;
  github_pr: number;
  github_issue: number;
  mention: number;
  agent_request: number;
}

interface SystemProblemCounts {
  critical: number;
  warning: number;
  info: number;
}

interface GoalCounts {
  all: number;
  active: number;
  completed: number;
  paused: number;
}

interface ScopeCounts {
  all: number;
  global: number;
  project: number;
}

interface AgentModelCounts {
  all: number;
  local: number;
  cloud: number;
}

interface BoardCounts {
  waiting_user: number;
  blocked: number;
  in_progress: number;
  completed: number;
}

interface DashboardContextType {
  // Server data
  goals: Goal[];
  agents: AgentProfile[];
  runtimes: RuntimeProfile[];
  projects: Project[];
  organizations: Organization[];
  problems: Problem[];
  rules: Rule[];
  commands: Command[];
  mcpServers: McpServerProfile[];
  skills: SkillProfile[];
  states: StateItem[];
  artifacts: Artifact[];
  activities: ActivityEntry[];
  settings: ControlSettings | null;
  loading: boolean;

  // Computed
  activeGoal: Goal | null;
  activeCommand: Command | undefined;
  inboxCounts: InboxCounts;
  systemProblemCounts: SystemProblemCounts;
  goalCounts: GoalCounts;
  mcpScopeCounts: ScopeCounts;
  skillsScopeCounts: ScopeCounts;
  agentModelCounts: AgentModelCounts;
  boardCounts: BoardCounts;

  // Refresh
  refreshAll: () => Promise<void>;
  refreshGoalData: (goalId: string | null) => Promise<void>;

  // Problem actions
  handleProblemAction: (problemId: string, action: string) => Promise<void>;
  handleConvertToGoal: (problemId: string, suggestedGoal?: string) => Promise<void>;
  handleDismiss: (problemId: string) => Promise<void>;
  handleBulkAction: (ids: string[], status: ProblemStatus) => Promise<void>;
  handleCreateRuleFromProblem: (problem: Problem) => void;

  // Rule actions
  handleCreateRule: (data: {
    name: string;
    condition: string;
    action: string;
    scope?: Rule["scope"];
    projectId?: string;
    targetAgentIds?: string[];
    pathPatterns?: string[];
    taskTypes?: string[];
    instruction?: string;
    priority?: Rule["priority"];
  }) => Promise<void>;
  handleRuleToggle: (id: string, enabled: boolean) => Promise<void>;
  handleRuleDelete: (id: string) => Promise<void>;

  // State actions
  handleStateAction: (stateId: string, action: string) => Promise<void>;

  // Goal actions
  handleCreateGoal: (data: {
    title: string;
    description?: string;
    successCriteria: string[];
    constraints?: string[];
    projectId?: string;
  }) => Promise<void>;
  handlePauseGoal: () => Promise<void>;
  handleResumeGoal: () => Promise<void>;
  handleDeleteGoal: (goalId?: string) => Promise<void>;
  handleGoalRename: (goalId: string, name: string) => Promise<void>;

  // Organization actions
  handleOrganizationRename: (orgId: string, name: string) => Promise<void>;
  handleOrganizationDelete: (orgId: string) => Promise<void>;

  // Agent actions
  handleCreateAgent: (data: {
    name: string;
    role: string;
    capabilities: string[];
    model: string;
    cliCommand?: string;
    runtimeId?: string;
  }) => Promise<void>;
  handleUpdateAgent: (
    id: string,
    data: Partial<{
      name: string;
      role: string;
      capabilities: string[];
      status: AgentProfile["status"];
      model: string;
      enabled: boolean;
      cliCommand: string;
      runtimeId: string;
      avatarUrl: string;
    }>,
  ) => Promise<void>;
  handleDeleteAgent: (id: string) => Promise<void>;

  // Command actions
  handleCommand: (data: {
    instruction: string;
    agentNames: string[];
    projectIds: string[];
  }) => Promise<void>;

  // Dialog state
  showCreateDialog: boolean;
  setShowCreateDialog: (open: boolean) => void;
  showCommandBar: boolean;
  setShowCommandBar: (open: boolean) => void;
  showSettingsDialog: boolean;
  setShowSettingsDialog: (open: boolean) => void;
  showCreateRuleDialog: boolean;
  setShowCreateRuleDialog: (open: boolean) => void;
  showCreateAgentDialog: boolean;
  setShowCreateAgentDialog: (open: boolean) => void;
  ruleFromProblem: Problem | null;

  // Search & filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  agentModelFilter: "all" | "local" | "cloud";
  setAgentModelFilter: (filter: "all" | "local" | "cloud") => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeView = getViewFromPath(location.pathname);

  // Persisted state from zustand store
  const {
    activeGoalId,
    setActiveGoalId,
    activeOrganizationId,
    setActiveOrganizationId,
    settings: persistedSettings,
    setSettings,
  } = useUIStore();

  const cache = useDashboardCache();

  // Server data (hydrated from cache, then refreshed from API)
  const [goals, setGoals] = useState<Goal[]>(() => cache.goals);
  const [agents, setAgents] = useState<AgentProfile[]>(() => cache.agents);
  const [runtimes, setRuntimes] = useState<RuntimeProfile[]>(() => cache.runtimes);
  const [projects, setProjects] = useState<Project[]>(() => cache.projects);
  const [organizations, setOrganizations] = useState<Organization[]>(() => cache.organizations);
  const [problems, setProblems] = useState<Problem[]>(() => cache.problems);
  const [problemSummary, setProblemSummary] = useState<ProblemSummary>(() => cache.problemSummary);
  const [rules, setRules] = useState<Rule[]>(() => cache.rules);
  const [commands, setCommands] = useState<Command[]>(() => cache.commands);
  const [mcpServers, setMcpServers] = useState<McpServerProfile[]>(() => cache.mcpServers);
  const [skills, setSkills] = useState<SkillProfile[]>(() => cache.skills);
  const [states, setStates] = useState<StateItem[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  // Transient UI state (not persisted)
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showCreateRuleDialog, setShowCreateRuleDialog] = useState(false);
  const [showCreateAgentDialog, setShowCreateAgentDialog] = useState(false);
  const [ruleFromProblem, setRuleFromProblem] = useState<Problem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentModelFilter, setAgentModelFilter] = useState<"all" | "local" | "cloud">("all");
  const [loading, setLoading] = useState(() => {
    return cache.goals.length === 0 && cache.runtimes.length === 0 && cache.organizations.length === 0;
  });

  // Computed values
  const activeGoal = useMemo(
    () => goals.find((g) => g.id === activeGoalId) ?? null,
    [goals, activeGoalId],
  );
  const activeCommand = useMemo(
    () => (activeGoal?.commandId ? commands.find((c) => c.id === activeGoal.commandId) : undefined),
    [activeGoal, commands],
  );

  const inboxCounts = useMemo<InboxCounts>(() => {
    return {
      all: problemSummary.inbox.all,
      github_pr: problemSummary.inbox.github_pr,
      github_issue: problemSummary.inbox.github_issue,
      mention: problemSummary.inbox.mention,
      agent_request: problemSummary.inbox.agent_request,
    };
  }, [problemSummary]);

  const systemProblemCounts = useMemo<SystemProblemCounts>(
    () => ({
      critical: problemSummary.system.critical,
      warning: problemSummary.system.warning,
      info: problemSummary.system.info,
    }),
    [problemSummary],
  );

  const goalCounts = useMemo<GoalCounts>(
    () => ({
      all: goals.length,
      active: goals.filter((g) => g.status === "active").length,
      completed: goals.filter((g) => g.status === "completed").length,
      paused: goals.filter((g) => g.status === "paused").length,
    }),
    [goals],
  );

  const mcpScopeCounts = useMemo<ScopeCounts>(
    () => ({
      all: mcpServers.length,
      global: mcpServers.filter((s) => s.scope === "global").length,
      project: mcpServers.filter((s) => s.scope === "project").length,
    }),
    [mcpServers],
  );

  const skillsScopeCounts = useMemo<ScopeCounts>(
    () => ({
      all: skills.length,
      global: skills.filter((s) => s.scope === "global").length,
      project: skills.filter((s) => s.scope === "project").length,
    }),
    [skills],
  );

  const agentModelCounts = useMemo<AgentModelCounts>(
    () => ({
      all: runtimes.length,
      local: runtimes.filter((r) => r.model.startsWith("local/")).length,
      cloud: runtimes.filter((r) => !r.model.startsWith("local/")).length,
    }),
    [runtimes],
  );

  const boardCounts = useMemo<BoardCounts>(() => {
    const counts: BoardCounts = {
      waiting_user: 0,
      blocked: 0,
      in_progress: 0,
      completed: 0,
    };

    for (const goal of goals) {
      const relatedProblems = problems.filter((problem) => problem.goalId === goal.id && problem.status === "open");

      if (goal.status === "completed") {
        counts.completed += 1;
        continue;
      }

      if (relatedProblems.some((problem) => (problem.source || "").includes("agent_request"))) {
        counts.waiting_user += 1;
        continue;
      }

      if (goal.status === "paused" || relatedProblems.length > 0) {
        counts.blocked += 1;
        continue;
      }

      counts.in_progress += 1;
    }

    return counts;
  }, [goals, problems]);

  const shouldLoadGoals = activeView === "projects" || activeView === "observability";
  const shouldLoadProjects =
    activeView === "creation" || activeView === "projects" || activeView === "skills";
  const shouldLoadProblems =
    activeView === "inbox" || activeView === "projects" || activeView === "observability";
  const shouldLoadAgents =
    activeView === "agents" || activeView === "creation" || activeView === "observability";
  const shouldLoadRules = activeView === "agents" || activeView === "rules";
  const shouldLoadCommands = activeView === "projects";
  const shouldLoadMcpServers = activeView === "mcp-servers";
  const shouldLoadSkills = activeView === "skills" || activeView === "agents";

  const applyOrganizationResult = useCallback(
    (nextOrganizations: Organization[]) => {
      setOrganizations(nextOrganizations);
      const currentOrgId = useUIStore.getState().activeOrganizationId;
      if (nextOrganizations.length > 0 && !currentOrgId) {
        setActiveOrganizationId(nextOrganizations[0].id);
      }
    },
    [setActiveOrganizationId],
  );

  const applyRefreshResults = useCallback(
    (results: {
      goals?: Goal[];
      runtimes?: RuntimeProfile[];
      projects?: Project[];
      settings?: ControlSettings;
      organizations?: Organization[];
      problemSummary?: ProblemSummary;
      problems?: Problem[];
      agents?: AgentProfile[];
      rules?: Rule[];
      commands?: Command[];
      mcpServers?: McpServerProfile[];
      skills?: SkillProfile[];
    }) => {
      if (results.goals) setGoals(results.goals);
      if (results.runtimes) setRuntimes(results.runtimes);
      if (results.projects) setProjects(results.projects);
      if (results.settings) setSettings(results.settings);
      if (results.organizations) applyOrganizationResult(results.organizations);
      if (results.problemSummary) setProblemSummary(results.problemSummary);
      if (results.problems) setProblems(results.problems);
      if (results.agents) setAgents(results.agents);
      if (results.rules) setRules(results.rules);
      if (results.commands) setCommands(results.commands);
      if (results.mcpServers) setMcpServers(results.mcpServers);
      if (results.skills) setSkills(results.skills);
      useDashboardCache.getState().hydrate(results);
    },
    [applyOrganizationResult, setSettings],
  );

  // Data fetching
  const refreshAll = useCallback(async () => {
    const hasCache = cache.goals.length > 0 || cache.runtimes.length > 0 || cache.organizations.length > 0;
    if (!hasCache) setLoading(true);

    const results = await Promise.allSettled([
      shouldLoadGoals ? api.listGoals() : Promise.resolve<Goal[]>([]),
      api.listRuntimes(),
      shouldLoadProjects ? api.listProjects() : Promise.resolve<Project[]>([]),
      api.getSettings(),
      api.listOrganizations(),
      api.getProblemSummary(),
      shouldLoadProblems ? api.listProblems() : Promise.resolve<Problem[]>([]),
      shouldLoadAgents ? api.listAgents() : Promise.resolve<AgentProfile[]>([]),
      shouldLoadRules ? api.listRules() : Promise.resolve<Rule[]>([]),
      shouldLoadCommands ? api.listCommands() : Promise.resolve<Command[]>([]),
      shouldLoadMcpServers ? api.listMcpServers() : Promise.resolve<McpServerProfile[]>([]),
      shouldLoadSkills ? api.listSkills() : Promise.resolve<SkillProfile[]>([]),
    ]);
    const fresh: Record<string, unknown> = {};
    if (results[0].status === "fulfilled") { setGoals(results[0].value); fresh.goals = results[0].value; }
    if (results[1].status === "fulfilled") { setRuntimes(results[1].value); fresh.runtimes = results[1].value; }
    if (results[2].status === "fulfilled") { setProjects(results[2].value); fresh.projects = results[2].value; }
    if (results[3].status === "fulfilled") { setSettings(results[3].value); fresh.settings = results[3].value; }
    if (results[4].status === "fulfilled") {
      setOrganizations(results[4].value); fresh.organizations = results[4].value;
      const currentOrgId = useUIStore.getState().activeOrganizationId;
      if (results[4].value.length > 0 && !currentOrgId) {
        setActiveOrganizationId(results[4].value[0].id);
      }
    }
    if (results[5].status === "fulfilled") { setProblemSummary(results[5].value); fresh.problemSummary = results[5].value; }
    if (results[6].status === "fulfilled") { setProblems(results[6].value); fresh.problems = results[6].value; }
    if (results[7].status === "fulfilled") { setAgents(results[7].value); fresh.agents = results[7].value; }
    if (results[8].status === "fulfilled") { setRules(results[8].value); fresh.rules = results[8].value; }
    if (results[9].status === "fulfilled") { setCommands(results[9].value); fresh.commands = results[9].value; }
    if (results[10].status === "fulfilled") { setMcpServers(results[10].value); fresh.mcpServers = results[10].value; }
    if (results[11].status === "fulfilled") { setSkills(results[11].value); fresh.skills = results[11].value; }
    for (const r of results) {
      if (r.status === "rejected") console.error("Failed to fetch data:", r.reason);
    }
    useDashboardCache.getState().hydrate(fresh);
    setLoading(false);
  }, [
    cache.goals, cache.runtimes, cache.organizations,
    setSettings,
    setActiveOrganizationId,
    shouldLoadGoals,
    shouldLoadProjects,
    shouldLoadProblems,
    shouldLoadAgents,
    shouldLoadRules,
    shouldLoadCommands,
    shouldLoadMcpServers,
    shouldLoadSkills,
  ]);

  const initializeViewData = useCallback(async () => {
    const hasCache = cache.goals.length > 0 || cache.runtimes.length > 0 || cache.organizations.length > 0;
    if (!hasCache) setLoading(true);

    if (activeView === "creation") {
      const criticalResults = await Promise.allSettled([
        api.listRuntimes(),
        shouldLoadProjects ? api.listProjects() : Promise.resolve<Project[]>([]),
        api.getSettings(),
        api.listOrganizations(),
        shouldLoadAgents ? api.listAgents() : Promise.resolve<AgentProfile[]>([]),
      ]);

      if (criticalResults[0].status === "fulfilled") {
        applyRefreshResults({ runtimes: criticalResults[0].value });
      } else {
        console.error("Failed to fetch runtimes:", criticalResults[0].reason);
      }

      if (criticalResults[1].status === "fulfilled") {
        applyRefreshResults({ projects: criticalResults[1].value });
      } else {
        console.error("Failed to fetch projects:", criticalResults[1].reason);
      }

      if (criticalResults[2].status === "fulfilled") {
        applyRefreshResults({ settings: criticalResults[2].value });
      } else {
        console.error("Failed to fetch settings:", criticalResults[2].reason);
      }

      if (criticalResults[3].status === "fulfilled") {
        applyRefreshResults({ organizations: criticalResults[3].value });
      } else {
        console.error("Failed to fetch organizations:", criticalResults[3].reason);
      }

      if (criticalResults[4].status === "fulfilled") {
        applyRefreshResults({ agents: criticalResults[4].value });
      } else {
        console.error("Failed to fetch agents:", criticalResults[4].reason);
      }

      setLoading(false);

      void Promise.allSettled([
        api.getProblemSummary(),
      ]).then((backgroundResults) => {
        if (backgroundResults[0].status === "fulfilled") {
          applyRefreshResults({ problemSummary: backgroundResults[0].value });
        } else {
          console.error("Failed to fetch problem summary:", backgroundResults[0].reason);
        }
      });

      return;
    }

    await refreshAll();
  }, [activeView, applyRefreshResults, cache.goals, cache.runtimes, cache.organizations, refreshAll, shouldLoadAgents, shouldLoadProjects]);

  const refreshGoalData = useCallback(async (goalId: string | null) => {
    if (!goalId) return;
    try {
      const [s, a, act] = await Promise.all([
        api.getStates(goalId),
        api.getArtifacts(goalId),
        api.getActivities(goalId),
      ]);
      setStates(s);
      setArtifacts(a);
      setActivities(act);
    } catch (err) {
      console.error("Failed to fetch goal data:", err);
    }
  }, []);

  useEffect(() => {
    void initializeViewData();
  }, [initializeViewData]);

  useEffect(() => {
    if (!shouldLoadGoals) {
      setGoals([]);
    }
    if (!shouldLoadProjects) {
      setProjects([]);
    }
    if (!shouldLoadProblems) {
      setProblems([]);
    }
    if (!shouldLoadAgents) {
      setAgents([]);
    }
    if (!shouldLoadRules) {
      setRules([]);
    }
    if (!shouldLoadCommands) {
      setCommands([]);
    }
    if (!shouldLoadMcpServers) {
      setMcpServers([]);
    }
    if (!shouldLoadSkills) {
      setSkills([]);
    }
  }, [
    shouldLoadGoals,
    shouldLoadProjects,
    shouldLoadProblems,
    shouldLoadAgents,
    shouldLoadRules,
    shouldLoadCommands,
    shouldLoadMcpServers,
    shouldLoadSkills,
  ]);

  useEffect(() => {
    refreshGoalData(activeGoalId);
  }, [activeGoalId, refreshGoalData]);

  useEffect(() => {
    if (!activeGoalId) {
      setStates([]);
      setArtifacts([]);
      setActivities([]);
    }
  }, [activeGoalId]);

  useWebSocket((event) => {
    const eventGoalId = typeof event.goalId === "string" ? event.goalId : null;
    const eventType = typeof event.type === "string" ? event.type : null;
    const touchesActiveGoal = Boolean(activeGoalId && eventGoalId === activeGoalId);
    const touchesGoalCollections =
      eventType === "goal_created" ||
      eventType === "goal_completed" ||
      eventType === "state_changed" ||
      eventType === "command_sent";

    if (touchesActiveGoal) {
      void refreshGoalData(activeGoalId);
      if (shouldLoadGoals || shouldLoadCommands || shouldLoadProblems) {
        void refreshAll();
      }
      return;
    }

    if (
      !eventGoalId &&
      touchesGoalCollections &&
      (shouldLoadGoals || shouldLoadCommands || shouldLoadProblems)
    ) {
      void refreshAll();
      return;
    }

    if (activeView === "inbox" || activeView === "observability") {
      void refreshAll();
    }
  });

  // Keyboard shortcut: Cmd+K or Ctrl+K to open command bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandBar(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Problem actions
  const handleProblemAction = useCallback(
    async (problemId: string, action: string) => {
      const problem = problems.find((p) => p.id === problemId);
      if (!problem) return;

      const statusMap: Record<string, ProblemStatus> = {
        Fix: "assigned",
        "Apply fix": "assigned",
        "Apply suggestion": "assigned",
        Ignore: "ignored",
        Dismiss: "ignored",
        Override: "fixed",
        Assign: "assigned",
        Archive: "fixed",
      };

      const newStatus = statusMap[action];
      if (newStatus) {
        try {
          await api.updateProblem(problemId, { status: newStatus });
          if (
            (action === "Fix" || action === "Apply fix" || action === "Apply suggestion") &&
            problem.goalId
          ) {
            await api.triggerAction(problem.goalId, "fix_bug", problem.stateId);
          }
          await refreshAll();
        } catch (err) {
          console.error("Problem action failed:", err);
        }
      }
    },
    [problems, refreshAll],
  );

  const handleConvertToGoal = useCallback(
    async (problemId: string, suggestedGoal?: string) => {
      const problem = problems.find((p) => p.id === problemId);
      if (!problem) return;

      try {
        const goalTitle = suggestedGoal || problem.title;
        const goal = await api.createGoal({
          title: goalTitle,
          description: `Converted from inbox: ${problem.source} — ${problem.title}${problem.context ? `\n\n${problem.context}` : ""}`,
          successCriteria: ["completed"],
          watchers: problem.source === "agent_request" ? [problem.context || ""] : [],
        });
        await api.updateProblem(problemId, { status: "assigned" });
        await refreshAll();
        setActiveGoalId(goal.id);
        navigate({ to: "/dashboard/projects" });
      } catch (err) {
        console.error("Convert to goal failed:", err);
      }
    },
    [problems, refreshAll, setActiveGoalId, navigate],
  );

  const handleDismiss = useCallback(
    async (problemId: string) => {
      try {
        await api.updateProblem(problemId, { status: "ignored" });
        await refreshAll();
      } catch (err) {
        console.error("Dismiss failed:", err);
      }
    },
    [refreshAll],
  );

  const handleBulkAction = useCallback(
    async (ids: string[], status: ProblemStatus) => {
      try {
        await api.bulkUpdateProblems(ids, status);
        await refreshAll();
      } catch (err) {
        console.error("Bulk action failed:", err);
      }
    },
    [refreshAll],
  );

  const handleCreateRuleFromProblem = useCallback((problem: Problem) => {
    setRuleFromProblem(problem);
    setShowCreateRuleDialog(true);
  }, []);

  // Rule actions
  const handleCreateRule = useCallback(
    async (data: {
      name: string;
      condition: string;
      action: string;
      scope?: Rule["scope"];
      projectId?: string;
      targetAgentIds?: string[];
      pathPatterns?: string[];
      taskTypes?: string[];
      instruction?: string;
      priority?: Rule["priority"];
    }) => {
      try {
        await api.createRule(data);
        setShowCreateRuleDialog(false);
        setRuleFromProblem(null);
        await refreshAll();
      } catch (err) {
        console.error("Failed to create rule:", err);
      }
    },
    [refreshAll],
  );

  const handleRuleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await api.updateRule(id, { enabled });
        await refreshAll();
      } catch (err) {
        console.error("Failed to toggle rule:", err);
      }
    },
    [refreshAll],
  );

  const handleRuleDelete = useCallback(
    async (id: string) => {
      try {
        await api.deleteRule(id);
        await refreshAll();
      } catch (err) {
        console.error("Failed to delete rule:", err);
      }
    },
    [refreshAll],
  );

  // State actions
  const handleStateAction = useCallback(
    async (stateId: string, action: string) => {
      if (!activeGoalId) return;
      const actionMap: Record<string, string> = {
        Fix: "fix_bug",
        Ignore: "fix_bug",
        Dismiss: "fix_bug",
        "Apply suggestion": "review",
        Retry: "run_tests",
      };
      const apiAction = actionMap[action] || "fix_bug";
      try {
        await api.triggerAction(activeGoalId, apiAction as any, stateId);
        await refreshGoalData(activeGoalId);
      } catch (err) {
        console.error("Action failed:", err);
      }
    },
    [activeGoalId, refreshGoalData],
  );

  // Goal actions
  const handleCreateGoal = useCallback(
    async (data: {
      title: string;
      description?: string;
      successCriteria: string[];
      constraints?: string[];
      projectId?: string;
    }) => {
      try {
        const goal = await api.createGoal(data);
        setShowCreateDialog(false);
        await refreshAll();
        setActiveGoalId(goal.id);
        navigate({ to: "/dashboard/projects" });
      } catch (err) {
        console.error("Failed to create goal:", err);
      }
    },
    [refreshAll, setActiveGoalId, navigate],
  );

  const handleCommand = useCallback(
    async (data: { instruction: string; agentNames: string[]; projectIds: string[] }) => {
      try {
        const selectedRuntime = runtimes.find((r) =>
          data.agentNames.includes(r.name),
        );
        const result = await api.dispatchCommand({
          instruction: data.instruction,
          agentNames: data.agentNames.length > 0 ? data.agentNames : undefined,
          projectIds: data.projectIds.length > 0 ? data.projectIds : undefined,
          runtimeId: selectedRuntime?.id,
        });
        setShowCommandBar(false);
        await refreshAll();
        if (result.goals.length > 0) {
          setActiveGoalId(result.goals[0].id);
        }
        navigate({ to: "/dashboard/projects" });
      } catch (err) {
        console.error("Command failed:", err);
      }
    },
    [refreshAll, setActiveGoalId, navigate, runtimes],
  );

  const handlePauseGoal = useCallback(async () => {
    if (!activeGoalId) return;
    try {
      await api.updateGoal(activeGoalId, { status: "paused" });
      await refreshAll();
    } catch (err) {
      console.error("Failed to pause goal:", err);
    }
  }, [activeGoalId, refreshAll]);

  const handleResumeGoal = useCallback(async () => {
    if (!activeGoalId) return;
    try {
      await api.updateGoal(activeGoalId, { status: "active" });
      await refreshAll();
    } catch (err) {
      console.error("Failed to resume goal:", err);
    }
  }, [activeGoalId, refreshAll]);

  const handleDeleteGoal = useCallback(
    async (goalId?: string) => {
      const id = goalId ?? activeGoalId;
      if (!id) return;
      try {
        await api.deleteGoal(id);
        if (activeGoalId === id) {
          const remaining = goals.filter((g) => g.id !== id);
          setActiveGoalId(remaining.length > 0 ? remaining[0].id : null);
        }
        await refreshAll();
      } catch (err) {
        console.error("Failed to delete goal:", err);
      }
    },
    [activeGoalId, goals, refreshAll, setActiveGoalId],
  );

  const handleGoalRename = useCallback(
    async (goalId: string, name: string) => {
      try {
        await api.updateGoal(goalId, { title: name });
        await refreshAll();
      } catch (err) {
        console.error("Failed to rename goal:", err);
      }
    },
    [refreshAll],
  );

  // Organization actions
  const handleOrganizationRename = useCallback(
    async (orgId: string, name: string) => {
      try {
        await api.updateOrganization(orgId, { name });
        await refreshAll();
      } catch (err) {
        console.error("Failed to rename organization:", err);
      }
    },
    [refreshAll],
  );

  const handleOrganizationDelete = useCallback(
    async (orgId: string) => {
      try {
        await api.deleteOrganization(orgId);
        if (activeOrganizationId === orgId) {
          const remaining = organizations.filter((o) => o.id !== orgId);
          setActiveOrganizationId(remaining.length > 0 ? remaining[0].id : null);
        }
        await refreshAll();
      } catch (err) {
        console.error("Failed to delete organization:", err);
      }
    },
    [activeOrganizationId, organizations, refreshAll, setActiveOrganizationId],
  );

  // Agent actions
  const handleCreateAgent = useCallback(
    async (data: {
      name: string;
      role: string;
      capabilities: string[];
      model: string;
      cliCommand?: string;
      runtimeId?: string;
    }) => {
      try {
        await api.createAgent(data);
        setShowCreateAgentDialog(false);
        await refreshAll();
      } catch (err) {
        console.error("Failed to create agent:", err);
      }
    },
    [refreshAll],
  );

  const handleUpdateAgent = useCallback(
    async (
      id: string,
      data: Partial<{
        name: string;
        role: string;
        capabilities: string[];
        status: AgentProfile["status"];
        model: string;
        enabled: boolean;
        cliCommand: string;
        runtimeId: string;
        avatarUrl: string;
      }>,
    ) => {
      try {
        await api.updateAgent(id, data);
        await refreshAll();
      } catch (err) {
        console.error("Failed to update agent:", err);
      }
    },
    [refreshAll],
  );

  const handleDeleteAgent = useCallback(
    async (id: string) => {
      try {
        await api.deleteAgent(id);
        await refreshAll();
      } catch (err) {
        console.error("Failed to delete agent:", err);
      }
    },
    [refreshAll],
  );

  const value: DashboardContextType = {
    goals,
    agents,
    runtimes,
    projects,
    organizations,
    problems,
    rules,
    commands,
    mcpServers,
    skills,
    states,
    artifacts,
    activities,
    settings: persistedSettings,
    loading,
    activeGoal,
    activeCommand,
    inboxCounts,
    systemProblemCounts,
    goalCounts,
    mcpScopeCounts,
    skillsScopeCounts,
    agentModelCounts,
    boardCounts,
    refreshAll,
    refreshGoalData,
    handleProblemAction,
    handleConvertToGoal,
    handleDismiss,
    handleBulkAction,
    handleCreateRuleFromProblem,
    handleCreateRule,
    handleRuleToggle,
    handleRuleDelete,
    handleStateAction,
    handleCreateGoal,
    handlePauseGoal,
    handleResumeGoal,
    handleDeleteGoal,
    handleGoalRename,
    handleOrganizationRename,
    handleOrganizationDelete,
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    handleCommand,
    showCreateDialog,
    setShowCreateDialog,
    showCommandBar,
    setShowCommandBar,
    showSettingsDialog,
    setShowSettingsDialog,
    showCreateRuleDialog,
    setShowCreateRuleDialog,
    showCreateAgentDialog,
    setShowCreateAgentDialog,
    ruleFromProblem,
    searchQuery,
    setSearchQuery,
    agentModelFilter,
    setAgentModelFilter,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
