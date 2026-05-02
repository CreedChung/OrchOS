import { API_BASE, createEdenClient, getServerBaseUrl } from "./eden";
import type { ControlSettings as ControlSettingsType } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function resolveApiUrl(path: string) {
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }

  return new URL(path, `${getServerBaseUrl()}/`).toString();
}

function assertData<T>(result: { data: T | null; error: unknown; status: number }): T {
  if (result.data !== null) {
    return result.data;
  }

  throw new Error(`API error: ${result.status}`);
}

function normalizeTrace(trace: unknown): ConversationMessage["trace"] {
  if (!Array.isArray(trace)) return undefined;

  return trace
    .filter((item) => isRecord(item) && typeof item.kind === "string")
    .map((item) => {
      if (item.kind === "message" || item.kind === "thought") {
        return {
          kind: item.kind,
          text: readString(item.text) ?? "",
        };
      }

      if (item.kind === "tool") {
        return {
          kind: "tool" as const,
          toolName: readString(item.toolName),
          toolCallId: readString(item.toolCallId),
          state: readString(item.state),
          input: item.input,
          output: item.output,
          errorText: readString(item.errorText),
        };
      }

      return null;
    })
    .filter((item): item is NonNullable<ConversationMessage["trace"]>[number] => item !== null);
}

function normalizeConversationMessage(message: unknown): ConversationMessage {
  const record = isRecord(message) ? message : {};

  return {
    id: readString(record.id) ?? "",
    conversationId: readString(record.conversationId) ?? "",
    role: record.role === "user" ? "user" : "assistant",
    content: readString(record.content) ?? "",
    trace: normalizeTrace(record.trace),
    error: readString(record.error),
    responseTime: typeof record.responseTime === "number" ? record.responseTime : undefined,
    executionMode: record.executionMode === "sandbox" || record.executionMode === "local" ? record.executionMode : undefined,
    sandboxStatus:
      record.sandboxStatus === "created" ||
      record.sandboxStatus === "reused" ||
      record.sandboxStatus === "fallback" ||
      record.sandboxStatus === "required_failed"
        ? record.sandboxStatus
        : undefined,
    sandboxVmId: readString(record.sandboxVmId),
    projectId: readString(record.projectId),
    projectName: readString(record.projectName),
    clarificationQuestions: Array.isArray(record.clarificationQuestions)
      ? record.clarificationQuestions.map((item) => String(item))
      : undefined,
    createdAt: readString(record.createdAt) ?? new Date(0).toISOString(),
  };
}

function normalizeInboxThread(thread: unknown): InboxThread {
  const record = isRecord(thread) ? thread : {};

  return {
    id: readString(record.id) ?? "",
    kind:
      record.kind === "agent_request" ||
      record.kind === "pull_request" ||
      record.kind === "issue" ||
      record.kind === "mention" ||
      record.kind === "system_alert"
        ? record.kind
        : "agent_request",
    status:
      record.status === "open" ||
      record.status === "in_progress" ||
      record.status === "blocked" ||
      record.status === "waiting_user" ||
      record.status === "completed" ||
      record.status === "dismissed"
        ? record.status
        : "open",
    priority:
      record.priority === "critical" || record.priority === "warning" || record.priority === "info"
        ? record.priority
        : "warning",
    title: readString(record.title) ?? "Untitled",
    summary: readString(record.summary),
    projectId: readString(record.projectId),
    conversationId: readString(record.conversationId),
    commandId: readString(record.commandId),
    primaryGoalId: readString(record.primaryGoalId),
    createdByType:
      record.createdByType === "user" || record.createdByType === "agent" || record.createdByType === "system"
        ? record.createdByType
        : "system",
    createdById: readString(record.createdById),
    createdByName: readString(record.createdByName) ?? "System",
    lastMessageAt:
      typeof record.lastMessageAt === "string"
        ? record.lastMessageAt
        : typeof record.updatedAt === "string"
          ? record.updatedAt
          : new Date(0).toISOString(),
    createdAt: readString(record.createdAt) ?? new Date(0).toISOString(),
    updatedAt: readString(record.updatedAt) ?? new Date(0).toISOString(),
    archived: record.archived === true,
  };
}

// Types aligned with server
export type Status = "success" | "failed" | "error" | "pending" | "running" | "warning";
export type Action = "write_code" | "run_tests" | "fix_bug" | "commit" | "review";
export type ProblemPriority = "critical" | "warning" | "info";
export type ProblemStatus = "open" | "fixed" | "ignored" | "assigned";
export type CommandStatus = "sent" | "executing" | "completed" | "failed";

export interface Command {
  id: string;
  instruction: string;
  agentNames: string[];
  projectIds: string[];
  goalId?: string;
  status: CommandStatus;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  successCriteria: string[];
  constraints: string[];
  status: "active" | "completed" | "paused";
  projectId?: string;
  commandId?: string;
  watchers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  repositoryUrl?: string;
  createdAt: string;
}

export interface ProjectPreviewStatus {
  projectId: string;
  running: boolean;
  command?: string;
  url?: string;
  port?: number;
  pid?: number;
  startedAt?: string;
  logs?: string;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  type: string;
  goalId?: string;
  detail: Record<string, unknown>;
  timestamp: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  capabilities: Action[];
  status: "idle" | "active" | "error";
  model: string;
  enabled: boolean;
  cliCommand?: string;
  currentModel?: string;
  runtimeId?: string;
  avatarUrl?: string;
}

export interface RuntimeProfile {
  id: string;
  name: string;
  command: string;
  version?: string;
  path?: string;
  role: string;
  capabilities: string[];
  model: string;
  transport: "stdio" | "tcp";
  enabled: boolean;
  currentModel?: string;
  status: "idle" | "active" | "error";
  registryId?: string;
}

export interface RuntimeModelsResponse {
  models: string[];
  currentModel?: string;
  source: "cli" | "config" | "registry";
}

export interface SkillMarketItem {
  id: string;
  name: string;
  description: string;
  source: string;
  browseUrl?: string;
  installSource?: string;
  category?: string;
  installable: boolean;
  installed: boolean;
  owner?: string;
  repo?: string;
  stars?: number;
  homepage?: string;
  lastUpdatedAt?: string;
  sourceType: "official";
  tags: string[];
}

export interface SkillMarketResponse {
  items: SkillMarketItem[];
  tags: string[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface McpMarketItem {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  source: string;
  category?: string;
  installed: boolean;
  owner?: string;
  repo?: string;
  stars?: number;
  homepage?: string;
  lastUpdatedAt?: string;
  sourceType: "official";
  tags: string[];
}

export interface McpMarketResponse {
  items: McpMarketItem[];
  tags: string[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DetectedRuntime {
  id: string;
  name: string;
  command: string;
  version?: string;
  path?: string;
  role: string;
  capabilities: string[];
  model: string;
  transport: "stdio" | "tcp";
  error?: string;
}

export interface DetectRuntimesResponse {
  available: DetectedRuntime[];
  unavailable: DetectedRuntime[];
}

export interface RegisterRuntimesResponse {
  registered: RuntimeProfile[];
  skipped: DetectedRuntime[];
}

export interface Integration {
  id: string;
  name: string;
  type: "github" | "gitlab";
  connected: boolean;
  username?: string;
}

export interface IntegrationRepo {
  id: number | string;
  name: string;
  url: string;
  private: boolean;
}

export interface ObservabilityMetrics {
  goals: { total: number; active: number; completed: number; paused: number };
  activities: { total: number };
  events: { total: number };
   graphs: { total: number };
   runtime: { avgLatencyMs: number; totalCostUsd: number };
}

export interface TimeSeriesPoint {
  time: number;
  label: string;
  operations: number;
  successes: number;
}

export interface GoalTimeSeriesPoint {
  time: number;
  label: string;
  completed: number;
  active: number;
}

export interface StateEntry {
  id: string;
  goalId: string;
  label: string;
  status: Status;
  actions?: string[];
  updatedAt: string;
}

export interface Artifact {
  id: string;
  goalId: string;
  name: string;
  type: "file" | "pr" | "test" | "log";
  status: Status;
  detail?: string;
  updatedAt: string;
}

export interface ActivityEntry {
  id: string;
  goalId: string;
  timestamp: string;
  agent: string;
  action: string;
  detail?: string;
  reasoning?: string;
  diff?: string;
}

export type ControlSettings = ControlSettingsType;

export interface Event {
  id: string;
  type: string;
  goalId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Problem {
  id: string;
  title: string;
  priority: ProblemPriority;
  source?: string;
  context?: string;
  goalId?: string;
  stateId?: string;
  status: ProblemStatus;
  actions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Rule {
  id: string;
  name: string;
  condition: string;
  action: string;
  scope: "global" | "project";
  projectId?: string;
  targetAgentIds: string[];
  pathPatterns: string[];
  taskTypes: string[];
  instruction: string;
  priority: "low" | "normal" | "high";
  enabled: boolean;
  createdAt: string;
}

export interface McpServerProfile {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  scope: "global" | "project";
  projectId?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillProfile {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  scope: "global" | "project";
  projectId?: string;
  organizationId?: string;
  sourceType: "manual" | "repository";
  sourceUrl?: string;
  installPath?: string;
  manifestPath?: string;
  executionCount?: number;
  successCount?: number;
  successRate?: number;
  applicability?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphAttemptTrace {
  id: string;
  nodeId: string;
  attemptNumber: number;
  strategy: string;
  status: string;
  traceId?: string;
  inputSnapshotId?: string;
  outputSnapshotId?: string;
  latencyMs?: number;
  tokenUsage?: { input: number; output: number; total: number };
  costEstimateUsd?: number;
  errorCode?: string;
  errorText?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface ExecutionGraphSummary {
  id: string;
  status: string;
  traceId?: string;
  contextSnapshotId?: string;
  attemptCount: number;
  avgLatencyMs: number;
}

export interface ReflectionRecord {
  id: string;
  graphId?: string;
  nodeId?: string;
  attemptId?: string;
  kind: string;
  summary: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface GraphReplayResponse {
  graph: Record<string, unknown>;
  attempts: GraphAttemptTrace[];
  context?: Record<string, unknown>;
  reflections: ReflectionRecord[];
  handoffs: Array<Record<string, unknown>>;
  conflicts: Array<Record<string, unknown>>;
}

export interface SkillRepositoryCandidate {
  name: string;
  description?: string;
  relativePath: string;
}

export interface SkillRepositoryAnalysis {
  analysisId: string;
  source: string;
  riskLevel: "low" | "medium" | "high";
  safeToInstall: boolean;
  summary: string;
  warnings: string[];
  installTarget: string;
  installableSkills: SkillRepositoryCandidate[];
}

export interface SkillRepositoryInstallResponse {
  installed: SkillProfile[];
  installTarget: string;
  warnings: string[];
  riskLevel: "low" | "medium" | "high";
}

export interface DispatchResult {
  needsClarification: boolean;
  questions: string[];
  command: {
    id: string;
    instruction: string;
    agentNames: string[];
    projectIds: string[];
    goalId: string | null;
    status: string;
    createdAt: string;
  };
  goals: Array<{
    id: string;
    title: string;
    assignedAgentName?: string;
  }>;
}

export interface Conversation {
  id: string;
  title?: string;
  projectId?: string;
  agentId?: string;
  runtimeId?: string;
  archived: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  trace?: Array<
    | { kind: "message"; text: string }
    | { kind: "thought"; text: string }
    | {
        kind: "tool";
        toolName?: string;
        toolCallId?: string;
        state?: string;
        input?: unknown;
        output?: unknown;
        errorText?: string;
      }
  >;
  error?: string;
  responseTime?: number;
  executionMode?: "sandbox" | "local";
  sandboxStatus?: "created" | "reused" | "fallback" | "required_failed";
  sandboxVmId?: string;
  projectId?: string;
  projectName?: string;
  clarificationQuestions?: string[];
  createdAt: string;
}

export interface ProblemSummary {
  status: Record<ProblemStatus, number>;
  inbox: {
    all: number;
    github_pr: number;
    github_issue: number;
    mention: number;
    agent_request: number;
  };
  system: {
    critical: number;
    warning: number;
    info: number;
  };
}

export type InboxThreadKind =
  | "agent_request"
  | "pull_request"
  | "issue"
  | "mention"
  | "system_alert";

export type InboxThreadStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "waiting_user"
  | "completed"
  | "dismissed";

export type InboxPriority = "critical" | "warning" | "info";

export type InboxMessageType =
  | "request"
  | "status_update"
  | "question"
  | "blocker"
  | "artifact"
  | "review_request"
  | "completion"
  | "system_note";

export interface InboxThread {
  id: string;
  kind: InboxThreadKind;
  status: InboxThreadStatus;
  priority: InboxPriority;
  title: string;
  summary?: string;
  projectId?: string;
  conversationId?: string;
  commandId?: string;
  primaryGoalId?: string;
  createdByType: "user" | "agent" | "system";
  createdById?: string;
  createdByName: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface InboxMessage {
  id: string;
  threadId: string;
  messageType: InboxMessageType;
  senderType: "user" | "agent" | "system";
  senderId?: string;
  senderName: string;
  subject?: string;
  body: string;
  to: string[];
  cc: string[];
  goalId?: string;
  stateId?: string;
  problemId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const EMPTY_PROBLEM_SUMMARY: ProblemSummary = {
  status: {
    open: 0,
    fixed: 0,
    ignored: 0,
    assigned: 0,
  },
  inbox: {
    all: 0,
    github_pr: 0,
    github_issue: 0,
    mention: 0,
    agent_request: 0,
  },
  system: {
    critical: 0,
    warning: 0,
    info: 0,
  },
};

// API functions
export const api = {
  // Goals
  listGoals: async (): Promise<Goal[]> => {
    const client = createEdenClient();
    const result = await client.api.goals.get();
    return assertData(result);
  },
  getGoal: async (id: string): Promise<Goal> => {
    const client = createEdenClient();
    const result = await client.api.goals({ goalId: id }).get();
    return assertData(result);
  },
  createGoal: (data: {
    title: string;
    description?: string;
    successCriteria: string[];
    constraints?: string[];
    projectId?: string;
    commandId?: string;
    watchers?: string[];
  }): Promise<Goal> => {
    const client = createEdenClient();
    return client.api.goals.post(data).then(assertData);
  },
  updateGoal: (
    id: string,
    data: Partial<
      Pick<
        Goal,
        "title" | "description" | "successCriteria" | "constraints" | "status" | "watchers"
      > & { projectId?: string; commandId?: string }
    >,
  ): Promise<Goal> => {
    const client = createEdenClient();
    return client.api.goals({ goalId: id }).patch(data).then(assertData);
  },
  deleteGoal: async (id: string): Promise<void> => {
    const client = createEdenClient();
    const result = await client.api.goals({ goalId: id }).delete();
    return assertData(result);
  },

  // States
  getStates: async (goalId: string): Promise<StateEntry[]> => {
    const client = createEdenClient();
    const result = await client.api.goals({ goalId }).states.get();
    return assertData(result);
  },
  updateState: (id: string, status: Status): Promise<StateEntry> => {
    const client = createEdenClient();
    return client.api.states({ id }).patch({ status }).then(assertData);
  },

  // Artifacts
  getArtifacts: async (goalId: string): Promise<Artifact[]> => {
    const client = createEdenClient();
    const result = await client.api.goals({ goalId }).artifacts.get();
    return assertData(result);
  },

  // Activities
  getActivities: async (goalId: string): Promise<ActivityEntry[]> => {
    const client = createEdenClient();
    const result = await client.api.goals({ goalId }).activities.get();
    return assertData(result);
  },
  getAllActivities: async (): Promise<ActivityEntry[]> => {
    const client = createEdenClient();
    const result = await client.api.activities.get();
    return assertData(result);
  },

  // Agents
  listAgents: async (): Promise<AgentProfile[]> => {
    const client = createEdenClient();
    const result = await client.api.agents.get();
    return assertData(result);
  },
  createAgent: (data: {
    name: string;
    role: string;
    capabilities: string[];
    model: string;
    cliCommand?: string;
    runtimeId?: string;
  }): Promise<AgentProfile> => {
    const client = createEdenClient();
    return client.api.agents.post(data).then(assertData);
  },
  updateAgent: (
    id: string,
    data: {
      name?: string;
      role?: string;
      capabilities?: string[];
      status?: AgentProfile["status"];
      model?: string;
      enabled?: boolean;
      cliCommand?: string;
      runtimeId?: string;
      avatarUrl?: string;
    },
  ): Promise<AgentProfile> => {
    const client = createEdenClient();
    return client.api.agents({ id }).patch(data).then(assertData);
  },
  uploadAgentAvatar: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(resolveApiUrl(`/api/agents/${id}/avatar`), {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json() as Promise<AgentProfile>;
  },
  deleteAgent: async (id: string): Promise<void> => {
    const client = createEdenClient();
    const result = await client.api.agents({ id }).delete();
    return assertData(result);
  },

  // Runtimes
  listRuntimes: async (): Promise<RuntimeProfile[]> => {
    const client = createEdenClient();
    const result = await client.api.runtimes.get();
    return assertData(result);
  },
  detectRuntimes: async (): Promise<DetectRuntimesResponse> => {
    const client = createEdenClient();
    const result = await client.api.runtimes.detect.get();
    return assertData(result);
  },
  registerDetectedRuntimes: (data: {
    runtimeIds?: string[];
    registerAll?: boolean;
  }): Promise<RegisterRuntimesResponse> => {
    const client = createEdenClient();
    return client.api.runtimes.detect.register.post(data).then(assertData);
  },
  updateRuntime: (
    id: string,
    data: {
      enabled?: boolean;
      status?: RuntimeProfile["status"];
      transport?: RuntimeProfile["transport"];
    },
  ): Promise<RuntimeProfile> => {
    const client = createEdenClient();
    return client.api.runtimes({ id }).patch(data).then(assertData);
  },
  healthCheckRuntime: async (runtimeId: string, level?: "basic" | "ping" | "full") => {
    const client = createEdenClient();
    const result = await client.api.runtimes({ runtimeId }).health.get({
      query: {
        level,
      },
    });
    return assertData(result) as {
      healthy: boolean;
      level: string;
      output: string;
      error?: string;
      responseTime: number;
      agentName: string;
      agentCommand: string;
      authRequired?: boolean;
    };
  },
  listRuntimeModels: async (runtimeId: string) => {
    const client = createEdenClient();
    const result = await client.api.runtimes({ runtimeId }).models.get();
    return assertData(result) as RuntimeModelsResponse;
  },

  // Runtime Chat
  chatWithRuntime: (runtimeId: string, prompt: string) => {
    const client = createEdenClient();
    return client.api.runtimes({ runtimeId }).chat.post({ prompt }).then(assertData) as Promise<{
      success: boolean;
      output: string;
      error?: string;
      agentName: string;
      responseTime: number;
    }>;
  },

  // Projects
  listProjects: async (): Promise<Project[]> => {
    const client = createEdenClient();
    const result = await client.api.projects.get();
    return assertData(result);
  },
  getProject: async (id: string): Promise<Project> => {
    const client = createEdenClient();
    const result = await client.api.projects({ id }).get();
    return assertData(result);
  },
  createProject: (data: { name: string; path: string; repositoryUrl?: string }): Promise<Project> =>
    createEdenClient().api.projects.post(data).then(assertData),
  updateProject: (
    id: string,
    data: Partial<Pick<Project, "name" | "path" | "repositoryUrl">>,
  ): Promise<Project> => {
    const client = createEdenClient();
    return client.api.projects({ id }).patch(data).then(assertData);
  },
  deleteProject: async (id: string): Promise<void> => {
    const client = createEdenClient();
    const result = await client.api.projects({ id }).delete();
    return assertData(result);
  },
  cloneProject: async (
    id: string,
    options?: { force?: boolean },
  ): Promise<{ success: boolean; path: string }> => {
    const client = createEdenClient();
    const result = await client.api.projects({ id }).clone.post(options);
    return assertData(result);
  },
  getProjectPreview: async (id: string): Promise<ProjectPreviewStatus> => {
    const client = createEdenClient();
    const result = await client.api.projects({ id }).preview.get();
    return assertData(result);
  },
  startProjectPreview: async (id: string): Promise<ProjectPreviewStatus> => {
    const client = createEdenClient();
    const result = await client.api.projects({ id }).preview.post(undefined);
    return assertData(result);
  },

  // Filesystem
  browseDirectory: async (path?: string) => {
    const client = createEdenClient();
    const result = await client.api.filesystem.browse.get({
      query: {
        path,
      },
    });
    return assertData(result) as {
      currentPath: string;
      parentPath?: string;
      directories: { name: string; path: string }[];
    };
  },
  readWorkspaceFile: async (path: string) => {
    const client = createEdenClient();
    const result = await client.api.filesystem.file.get({
      query: {
        path,
      },
    });

    return assertData(result) as {
      path: string;
      content: string | null;
    };
  },
  writeWorkspaceFile: async (path: string, content: string) => {
    const client = createEdenClient();
    const result = await client.api.filesystem.file.put({
      path,
      content,
    });

    return assertData(result) as {
      path: string;
      content: string;
    };
  },

  // History
  getHistory: async (goalId?: string, limit?: number): Promise<HistoryEntry[]> => {
    const client = createEdenClient();
    const result = await client.api.history.get({
      query: {
        goalId,
        limit,
      },
    });
    return assertData(result);
  },

  // Execution
  triggerAction: (
    goalId: string,
    action: Action,
    stateId?: string,
    agentId?: string,
  ): Promise<{ success: boolean }> => {
    const client = createEdenClient();
    return client.api.goals({ goalId }).actions.post({ action, stateId, agentId }).then(assertData);
  },
  runLoop: (goalId: string): Promise<{ success: boolean }> => {
    const client = createEdenClient();
    return client.api.goals({ goalId }).loop.post(undefined).then(assertData);
  },

  // Settings
  getSettings: async (): Promise<ControlSettings> => {
    const client = createEdenClient();
    const result = await client.api.settings.get();
    return assertData(result);
  },
  updateSettings: async (data: Partial<ControlSettings>): Promise<ControlSettings> => {
    const client = createEdenClient();
    const result = await client.api.settings.patch(data);
    return assertData(result);
  },

  // Events
  getEvents: async (goalId?: string, limit?: number): Promise<Event[]> => {
    const client = createEdenClient();
    const result = await client.api.events.get({
      query: {
        goalId,
        limit,
      },
    });
    return assertData(result);
  },

  // Organizations
  listOrganizations: async (): Promise<Organization[]> => {
    const client = createEdenClient();
    const result = await client.api.organizations.get();
    return assertData(result);
  },
  updateOrganization: (id: string, data: { name?: string }): Promise<Organization> => {
    const client = createEdenClient();
    return client.api.organizations({ id }).patch(data).then(assertData);
  },
  deleteOrganization: async (id: string): Promise<void> => {
    const client = createEdenClient();
    const result = await client.api.organizations({ id }).delete();
    return assertData(result);
  },

  // Problems
  listProblems: async (filters?: {
    status?: ProblemStatus;
    priority?: ProblemPriority;
  }): Promise<Problem[]> => {
    const client = createEdenClient();
    const result = await client.api.problems.get({
      query: {
        status: filters?.status,
        priority: filters?.priority,
      },
    });
    return assertData(result);
  },
  getProblemCounts: async (): Promise<Record<ProblemStatus, number>> => {
    const client = createEdenClient();
    const result = await client.api.problems.counts.get();
    return assertData(result);
  },
  getProblemSummary: async (): Promise<ProblemSummary> => {
    const client = createEdenClient();
    try {
      const result = await client.api.problems.summary.get();
      return assertData(result);
    } catch {
      const countsResult = await client.api.problems.counts.get();
      const counts = assertData(countsResult) as Record<ProblemStatus, number>;
      return {
        ...EMPTY_PROBLEM_SUMMARY,
        status: counts,
      };
    }
  },
  createProblem: (data: {
    title: string;
    priority?: ProblemPriority;
    source?: string;
    context?: string;
    goalId?: string;
    actions?: string[];
  }): Promise<Problem> => {
    const client = createEdenClient();
    return client.api.problems.post(data).then(assertData);
  },
  updateProblem: (
    id: string,
    data: Partial<Pick<Problem, "title" | "priority" | "status" | "source" | "context">>,
  ): Promise<Problem> => {
    const client = createEdenClient();
    return client.api.problems({ id }).patch(data).then(assertData);
  },
  deleteProblem: async (id: string): Promise<void> => {
    const client = createEdenClient();
    const result = await client.api.problems({ id }).delete();
    return assertData(result);
  },
  bulkUpdateProblems: async (
    ids: string[],
    status: ProblemStatus,
  ): Promise<{ updated: number }> => {
    const client = createEdenClient();
    const result = await client.api.problems.bulk.post({ ids, status });
    return assertData(result);
  },

  // Inbox
  listInboxThreads: async (filters?: {
    kind?: InboxThreadKind;
    status?: InboxThreadStatus;
    projectId?: string;
    conversationId?: string;
  }): Promise<InboxThread[]> => {
    const client = createEdenClient();
    const result = await client.api.inbox.threads.get({
      query: {
        kind: filters?.kind,
        status: filters?.status,
        projectId: filters?.projectId,
        conversationId: filters?.conversationId,
      },
    });
    return assertData(result).map(normalizeInboxThread);
  },
  getInboxThread: async (id: string): Promise<InboxThread> => {
    const client = createEdenClient();
    const result = await client.api.inbox.threads({ id }).get();
    return normalizeInboxThread(assertData(result));
  },
  updateInboxThread: async (
    id: string,
    data: {
      title?: string;
      summary?: string;
      status?: InboxThreadStatus;
      priority?: InboxPriority;
      primaryGoalId?: string;
      archived?: boolean;
    },
  ): Promise<InboxThread> => {
    const client = createEdenClient();
    const result = await client.api.inbox.threads({ id }).patch(data);
    return normalizeInboxThread(assertData(result));
  },
  listInboxMessages: async (threadId: string): Promise<InboxMessage[]> => {
    const client = createEdenClient();
    const result = await client.api.inbox.threads({ id: threadId }).messages.get();
    return assertData(result);
  },
  addInboxMessage: async (
    threadId: string,
    data: {
      messageType: InboxMessageType;
      senderType: "user" | "agent" | "system";
      senderId?: string;
      senderName: string;
      subject?: string;
      body: string;
      to?: string[];
      cc?: string[];
      goalId?: string;
      stateId?: string;
      problemId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<InboxMessage> => {
    const client = createEdenClient();
    const result = await client.api.inbox.threads({ id: threadId }).messages.post(data);
    return assertData(result);
  },

  // Rules
  listRules: async (): Promise<Rule[]> => {
    const client = createEdenClient();
    const result = await client.api.rules.get();
    return assertData(result);
  },
  createRule: (data: {
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
    enabled?: boolean;
  }): Promise<Rule> => createEdenClient().api.rules.post(data).then(assertData),
  updateRule: (
    id: string,
    data: Partial<Pick<Rule, "name" | "condition" | "action" | "scope" | "projectId" | "targetAgentIds" | "pathPatterns" | "taskTypes" | "instruction" | "priority" | "enabled">>,
  ): Promise<Rule> => {
    const client = createEdenClient();
    return client.api.rules({ id }).patch(data).then(assertData);
  },
  deleteRule: async (id: string): Promise<void> => {
    const client = createEdenClient();
    const result = await client.api.rules({ id }).delete();
    return assertData(result);
  },

  // Commands
  listCommands: async (): Promise<Command[]> => {
    const client = createEdenClient();
    const result = await client.api.commands.get();
    return assertData(result);
  },
  createCommand: (data: {
    instruction: string;
    agentNames?: string[];
    projectIds?: string[];
  }): Promise<Command> => createEdenClient().api.commands.post(data).then(assertData),
  getCommand: async (id: string): Promise<Command> => {
    const client = createEdenClient();
    const result = await client.api.commands({ id }).get();
    return assertData(result);
  },
  updateCommand: (
    id: string,
    data: { status?: CommandStatus; goalId?: string },
  ): Promise<Command> => {
    const client = createEdenClient();
    return client.api.commands({ id }).patch(data).then(assertData);
  },
  deleteCommand: async (id: string): Promise<void> => {
    const client = createEdenClient();
    const result = await client.api.commands({ id }).delete();
    return assertData(result);
  },

  // MCP Servers
  listMcpServers: async (options?: {
    projectId?: string;
    organizationId?: string;
    scope?: "global" | "project";
  }): Promise<McpServerProfile[]> => {
    const client = createEdenClient();
    const result = await client.api["mcp-servers"].get({
      query: {
        projectId: options?.projectId,
        organizationId: options?.organizationId,
        scope: options?.scope,
      },
    });
    return assertData(result);
  },
  listMcpServersGlobal: async (): Promise<McpServerProfile[]> => {
    const client = createEdenClient();
    const result = await client.api["mcp-servers"].global.get();
    return assertData(result);
  },
  listMcpServersByProject: async (projectId: string): Promise<McpServerProfile[]> => {
    const client = createEdenClient();
    const result = await client.api["mcp-servers"].project({ projectId }).get();
    return assertData(result);
  },
  getMcpServer: async (id: string): Promise<McpServerProfile> => {
    const client = createEdenClient();
    const result = await client.api["mcp-servers"]({ id }).get();
    return assertData(result);
  },
  createMcpServer: (data: {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    scope?: "global" | "project";
    projectId?: string;
    organizationId?: string;
  }): Promise<McpServerProfile> =>
    createEdenClient().api["mcp-servers"].post(data).then(assertData),
  updateMcpServer: (
    id: string,
    data: Partial<
      Pick<McpServerProfile, "name" | "command" | "args" | "env" | "enabled" | "scope">
    >,
  ): Promise<McpServerProfile> => {
    const client = createEdenClient();
    return client.api["mcp-servers"]({ id }).patch(data).then(assertData);
  },
  deleteMcpServer: async (id: string): Promise<void> => {
    const client = createEdenClient();
    const result = await client.api["mcp-servers"]({ id }).delete();
    return assertData(result);
  },
  toggleMcpServer: (id: string, enabled: boolean): Promise<McpServerProfile> => {
    const client = createEdenClient();
    return client.api["mcp-servers"]({ id }).toggle.post({ enabled }).then(assertData);
  },
  getMcpMarketItem: async (id: string): Promise<McpMarketItem> => {
    const client = createEdenClient();
    const result = await client.api["mcp-servers"].market({ id }).get();
    return assertData(result);
  },

  // Skills
  listSkills: async (options?: {
    projectId?: string;
    organizationId?: string;
    scope?: "global" | "project";
  }): Promise<SkillProfile[]> => {
    const client = createEdenClient();
    const result = await client.api.skills.get({
      query: {
        projectId: options?.projectId,
        organizationId: options?.organizationId,
        scope: options?.scope,
      },
    });
    return assertData(result);
  },
  getSkill: async (id: string): Promise<SkillProfile> => {
    const client = createEdenClient();
    const result = await client.api.skills({ id }).get();
    return assertData(result);
  },
  listSkillMarket: async (options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    filter?: "all" | "official" | "installed";
    tag?: string;
  }): Promise<SkillMarketResponse> => {
    const client = createEdenClient();
    const result = await client.api.skills.market.get({
      query: {
        page: options?.page ? String(options.page) : undefined,
        pageSize: options?.pageSize ? String(options.pageSize) : undefined,
        search: options?.search,
        filter: options?.filter,
        tag: options?.tag,
      },
    });
    return assertData(result);
  },
  getSkillMarketItem: async (id: string): Promise<SkillMarketItem> => {
    const client = createEdenClient();
    const result = await client.api.skills.market({ id }).get();
    return assertData(result);
  },
  createSkill: (data: {
    name: string;
    description?: string;
    scope?: "global" | "project";
    projectId?: string;
    organizationId?: string;
    sourceType?: "manual" | "repository";
    sourceUrl?: string;
    installPath?: string;
    manifestPath?: string;
  }): Promise<SkillProfile> => createEdenClient().api.skills.post(data).then(assertData),
  updateSkill: (
    id: string,
    data: Partial<Pick<SkillProfile, "name" | "description" | "enabled" | "scope">>,
  ): Promise<SkillProfile> => {
    const client = createEdenClient();
    return client.api.skills({ id }).patch(data).then(assertData);
  },
  deleteSkill: async (id: string): Promise<void> => {
    const client = createEdenClient();
    const result = await client.api.skills({ id }).delete();
    return assertData(result);
  },
  toggleSkill: (id: string, enabled: boolean): Promise<SkillProfile> => {
    const client = createEdenClient();
    return client.api.skills({ id }).toggle.post({ enabled }).then(assertData);
  },
  analyzeSkillRepository: (data: {
    source: string;
    scope?: "global" | "project";
    projectId?: string;
    organizationId?: string;
  }): Promise<SkillRepositoryAnalysis> =>
    createEdenClient().api.skills["analyze-repository"].post(data).then(assertData),
  installSkillRepository: (data: {
    analysisId: string;
    selectedSkills?: string[];
    allowHighRisk?: boolean;
  }): Promise<SkillRepositoryInstallResponse> =>
    createEdenClient().api.skills["install-repository"].post(data).then(assertData),
  listMcpMarket: async (options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    filter?: "all" | "official" | "installed";
    tag?: string;
  }): Promise<McpMarketResponse> => {
    const client = createEdenClient();
    const result = await client.api["mcp-servers"].market.get({
      query: {
        page: options?.page ? String(options.page) : undefined,
        pageSize: options?.pageSize ? String(options.pageSize) : undefined,
        search: options?.search,
        filter: options?.filter,
        tag: options?.tag,
      },
    });
    return assertData(result);
  },

  // Conversations
  listConversations: async (): Promise<Conversation[]> => {
    const client = createEdenClient();
    const result = await client.api.conversations.get();
    return assertData(result);
  },
  getConversation: async (id: string): Promise<Conversation> => {
    const client = createEdenClient();
    const result = await client.api.conversations({ id }).get();
    return assertData(result);
  },
  createConversation: (data: {
    title?: string;
    projectId?: string;
    agentId?: string;
    runtimeId?: string;
    deleted?: boolean;
  }): Promise<Conversation> => createEdenClient().api.conversations.post(data).then(assertData),
  updateConversation: (
    id: string,
    data: {
      title?: string;
      projectId?: string;
      agentId?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    },
  ): Promise<Conversation> => {
    const client = createEdenClient();
    return client.api.conversations({ id }).patch(data).then(assertData);
  },
  deleteConversation: async (id: string, options?: { permanent?: boolean }): Promise<void> => {
    const client = createEdenClient();
    const result = await client.api.conversations({ id }).delete({
      query: {
        permanent: options?.permanent ? "true" : undefined,
      },
    });
    return assertData(result);
  },
  clearDeletedConversations: async (): Promise<{ count: number }> => {
    const client = createEdenClient();
    const result = await client.api.conversations.deleted.delete();
    return assertData(result);
  },
  getConversationMessages: async (id: string): Promise<ConversationMessage[]> => {
    const client = createEdenClient();
    const result = await client.api.conversations({ id }).messages.get();
    return assertData(result).map(normalizeConversationMessage);
  },
  sendConversationMessage: async (id: string, content: string): Promise<ConversationMessage> => {
    const client = createEdenClient();
    const result = await client.api.conversations({ id }).messages.post({ content });
    return normalizeConversationMessage(assertData(result));
  },

  createGoalsFromConversation: async (
    id: string,
    data: {
      instruction: string;
      runtimeId?: string;
      agentNames?: string[];
      projectIds?: string[];
    },
  ): Promise<DispatchResult> => {
    const client = createEdenClient();
    const result = await client.api.conversations({ id })["create-goals"].post(data);
    return assertData(result) as DispatchResult;
  },

  dispatchCommand: async (data: {
    instruction: string;
    agentNames?: string[];
    projectIds?: string[];
    runtimeId?: string;
  }): Promise<DispatchResult> => {
    const client = createEdenClient();
    const result = await client.api.commands.dispatch.post(data);
    return assertData(result) as DispatchResult;
  },

  getObservabilityThroughput: async (_timeRange: string): Promise<TimeSeriesPoint[]> => {
    const client = createEdenClient();
    const result = await client.api.observability.throughput.get({
      query: { range: _timeRange },
    });
    return assertData(result);
  },

  getObservabilityGoals: async (_timeRange: string): Promise<GoalTimeSeriesPoint[]> => {
    const client = createEdenClient();
    const result = await client.api.observability.goals.get({
      query: { range: _timeRange },
    });
    return assertData(result);
  },

  getObservabilityMetrics: async (timeRange: string): Promise<ObservabilityMetrics> => {
    const client = createEdenClient();
    const result = await client.api.observability.metrics.get({ query: { range: timeRange } });
    return assertData(result);
  },

  getObservabilityGraphs: async (): Promise<ExecutionGraphSummary[]> => {
    const client = createEdenClient();
    const result = await client.api.observability.graphs.get();
    return assertData(result) as ExecutionGraphSummary[];
  },

  getGraphReplay: async (id: string): Promise<GraphReplayResponse> => {
    const client = createEdenClient();
    const result = await client.api.graphs({ id }).replay.get();
    return assertData(result) as GraphReplayResponse;
  },

  getGraphTrace: async (id: string): Promise<GraphAttemptTrace[]> => {
    const client = createEdenClient();
    const result = await client.api.graphs({ id }).trace.get();
    return assertData(result) as GraphAttemptTrace[];
  },

  getAttemptDebug: async (attemptId: string): Promise<Record<string, unknown>> => {
    const client = createEdenClient();
    const result = await client.api.graphs.attempts({ attemptId }).debug.get();
    return assertData(result) as Record<string, unknown>;
  },

  getContextSnapshotsByGoal: async (goalId: string): Promise<Array<Record<string, unknown>>> => {
    const client = createEdenClient();
    const result = await client.api.context.goals({ goalId }).snapshots.get();
    return assertData(result) as Array<Record<string, unknown>>;
  },

  getContextDiff: async (fromSnapshotId: string, toSnapshotId: string): Promise<Record<string, unknown> | null> => {
    const client = createEdenClient();
    const result = await client.api.context.diff.get({
      query: { fromSnapshotId, toSnapshotId },
    });
    return assertData(result) as Record<string, unknown> | null;
  },

  listReflections: async (): Promise<ReflectionRecord[]> => {
    const client = createEdenClient();
    const result = await client.api.reflections.get();
    return assertData(result) as ReflectionRecord[];
  },
};
