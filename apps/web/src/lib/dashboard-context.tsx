import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

type RefreshResults = {
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
};

type DashboardView =
  | "inbox"
  | "creation"
  | "board"
  | "agents"
  | "calendar"
  | "mail"
  | "observability";

function getViewFromPath(pathname: string): DashboardView {
  const segment = pathname.replace("/dashboard/", "").replace("/dashboard", "");
  const validViews: DashboardView[] = [
    "inbox",
    "creation",
    "board",
    "agents",
    "calendar",
    "mail",
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
  handleOrganizationCreate: (name: string) => Promise<void>;
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
    avatarUrl?: string;
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

  const initialCacheRef = useRef(useDashboardCache.getState());
  const initialCache = initialCacheRef.current;

  // Server data (hydrated from cache, then refreshed from API)
  const [goals, setGoals] = useState<Goal[]>(() => initialCache.goals);
  const [agents, setAgents] = useState<AgentProfile[]>(() => initialCache.agents);
  const [runtimes, setRuntimes] = useState<RuntimeProfile[]>(() => initialCache.runtimes);
  const [projects, setProjects] = useState<Project[]>(() => initialCache.projects);
  const [organizations, setOrganizations] = useState<Organization[]>(() => initialCache.organizations);
  const [problems, setProblems] = useState<Problem[]>(() => initialCache.problems);
  const [problemSummary, setProblemSummary] = useState<ProblemSummary>(() => initialCache.problemSummary);
  const [rules, setRules] = useState<Rule[]>(() => initialCache.rules);
  const [commands, setCommands] = useState<Command[]>(() => initialCache.commands);
  const [mcpServers, setMcpServers] = useState<McpServerProfile[]>(() => initialCache.mcpServers);
  const [skills, setSkills] = useState<SkillProfile[]>(() => initialCache.skills);
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
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const refreshQueuedRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedViewsRef = useRef<Set<DashboardView>>(new Set());
  const [loading, setLoading] = useState(() => {
    return (
      initialCache.goals.length === 0 &&
      initialCache.runtimes.length === 0 &&
      initialCache.organizations.length === 0
    );
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
    () => {
      const runtimeById = new Map(runtimes.map((runtime) => [runtime.id, runtime]));

      return agents.reduce<AgentModelCounts>(
        (counts, agent) => {
          counts.all += 1;

          const runtime = agent.runtimeId ? runtimeById.get(agent.runtimeId) : undefined;
          if (runtime?.transport === "stdio") {
            counts.local += 1;
          } else {
            counts.cloud += 1;
          }

          return counts;
        },
        { all: 0, local: 0, cloud: 0 },
      );
    },
    [agents, runtimes],
  );

  const shouldLoadGoals = activeView === "observability";
  const shouldLoadProjects =
    activeView === "creation" ||
    activeView === "board" ||
    activeView === "calendar" ||
    activeView === "mail";
  const shouldLoadProblems = activeView === "inbox" || activeView === "observability";
  const shouldLoadAgents =
    activeView === "agents" ||
    activeView === "creation" ||
    activeView === "board" ||
    activeView === "calendar" ||
    activeView === "mail" ||
    activeView === "observability";
  const shouldLoadRules = activeView === "agents";
  const shouldLoadCommands = activeView === "board";
  const shouldLoadMcpServers = false;
  const shouldLoadSkills = false;

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
    (results: RefreshResults) => {
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

  const hasCachedDashboardData = useCallback(() => {
    const cache = useDashboardCache.getState();
    return cache.goals.length > 0 || cache.runtimes.length > 0 || cache.organizations.length > 0;
  }, []);

  // Data fetching
  const executeRefreshAll = useCallback(async () => {
    const hasCache = hasCachedDashboardData();
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
    const fresh: RefreshResults = {};
    if (results[0].status === "fulfilled") fresh.goals = results[0].value;
    if (results[1].status === "fulfilled") fresh.runtimes = results[1].value;
    if (results[2].status === "fulfilled") fresh.projects = results[2].value;
    if (results[3].status === "fulfilled") fresh.settings = results[3].value;
    if (results[4].status === "fulfilled") {
      fresh.organizations = results[4].value;
    }
    if (results[5].status === "fulfilled") fresh.problemSummary = results[5].value;
    if (results[6].status === "fulfilled") fresh.problems = results[6].value;
    if (results[7].status === "fulfilled") fresh.agents = results[7].value;
    if (results[8].status === "fulfilled") fresh.rules = results[8].value;
    if (results[9].status === "fulfilled") fresh.commands = results[9].value;
    if (results[10].status === "fulfilled") fresh.mcpServers = results[10].value;
    if (results[11].status === "fulfilled") fresh.skills = results[11].value;
    for (const r of results) {
      if (r.status === "rejected") console.error("Failed to fetch data:", r.reason);
    }
    applyRefreshResults(fresh);
    setLoading(false);
  }, [
    applyRefreshResults,
    hasCachedDashboardData,
    shouldLoadGoals,
    shouldLoadProjects,
    shouldLoadProblems,
    shouldLoadAgents,
    shouldLoadRules,
    shouldLoadCommands,
    shouldLoadMcpServers,
    shouldLoadSkills,
  ]);

  const refreshAll = useCallback(async () => {
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return refreshInFlightRef.current;
    }

    const run = (async () => {
      try {
        await executeRefreshAll();
      } finally {
        refreshInFlightRef.current = null;

        if (refreshQueuedRef.current) {
          refreshQueuedRef.current = false;
          void refreshAll();
        }
      }
    })();

    refreshInFlightRef.current = run;
    return run;
  }, [executeRefreshAll]);

  const initializeViewData = useCallback(async () => {
    if (initializedViewsRef.current.has(activeView)) {
      return;
    }

    initializedViewsRef.current.add(activeView);

    if (
      activeView === "creation" ||
      activeView === "board" ||
      activeView === "calendar" ||
      activeView === "mail"
    ) {
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
  }, [
    activeView,
    applyRefreshResults,
    refreshAll,
    shouldLoadAgents,
    shouldLoadProjects,
    shouldLoadGoals,
    shouldLoadProblems,
    shouldLoadRules,
    shouldLoadCommands,
    shouldLoadMcpServers,
    shouldLoadSkills,
  ]);

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
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
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
        navigate({ to: "/dashboard/board" });
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
        navigate({ to: "/dashboard/board" });
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
        navigate({ to: "/dashboard/board" });
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
  const handleOrganizationCreate = useCallback(
    async (name: string) => {
      try {
        const created = await api.createOrganization({ name });
        setActiveOrganizationId(created.id);
        await refreshAll();
      } catch (err) {
        console.error("Failed to create organization:", err);
      }
    },
    [refreshAll, setActiveOrganizationId],
  );

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
      avatarUrl?: string;
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
    handleOrganizationCreate,
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
