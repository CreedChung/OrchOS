import { createEdenClient } from "./eden";
import type { ControlSettings as ControlSettingsType } from "./types";

const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL?.trim() ?? import.meta.env.VITE_API_BASE?.trim() ?? "";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function getServerBaseUrl() {
  if (API_BASE) {
    return API_BASE;
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:3000";
  }

  return window.location.origin;
}

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
export type ProblemPriority = "critical" | "warning" | "info";
export type ProblemStatus = "open" | "fixed" | "ignored" | "assigned";
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

export interface ProjectGitBranchInfo {
  name: string;
  current: boolean;
}

export interface ProjectGitStatus {
  projectId: string;
  branch: string;
  branches: ProjectGitBranchInfo[];
  modified: string[];
  staged: string[];
  untracked: string[];
  isGitRepo: boolean;
  error?: string;
}

export interface ProjectCommandResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface ProjectCommitActivityDay {
  date: string;
  count: number;
  level: number;
}

export interface ProjectCommitActivity {
  projectId: string;
  totalCommits: number;
  activeDays: number;
  maxCommitsPerDay: number;
  days: ProjectCommitActivityDay[];
  recentCommits: { hash: string; message: string; author: string; date: string }[];
  isGitRepo: boolean;
  error?: string;
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

export interface LocalHostProfile {
  id: string;
  userId: string;
  organizationId?: string;
  deviceId: string;
  name: string;
  platform?: string;
  appVersion?: string;
  status: "online" | "offline";
  runtimes: DetectedRuntime[];
  metadata: Record<string, string>;
  registeredAt: string;
  lastSeenAt: string;
}

export interface LocalHostPairingToken {
  pairingToken: string;
  expiresAt: string;
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
  events: { total: number };
  runtime: { avgLatencyMs: number; totalCostUsd: number };
}

export interface TimeSeriesPoint {
  time: number;
  label: string;
  operations: number;
  successes: number;
}

export type ControlSettings = ControlSettingsType;

export interface Event {
  id: string;
  type: string;
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
  suggestedGoal?: string;
  status: ProblemStatus;
  actions: string[];
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}


export interface Conversation {
  id: string;
  title?: string;
  projectId?: string;
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
  problemId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
}

export interface BookmarkCategory {
  id: string;
  name: string;
  bookmarks: BookmarkItem[];
}

// API functions
export const api = {

  // Runtimes
  listRuntimes: async (): Promise<RuntimeProfile[]> => {
    const response = await fetch(resolveApiUrl("/api/runtimes"), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as RuntimeProfile[];
  },
  detectRuntimes: async (): Promise<DetectRuntimesResponse> => {
    const response = await fetch(resolveApiUrl("/api/runtimes/detect"), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as DetectRuntimesResponse;
  },
  listLocalHosts: async (): Promise<LocalHostProfile[]> => {
    const response = await fetch(resolveApiUrl("/api/local-hosts"), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as LocalHostProfile[];
  },
  createLocalHostPairingToken: async (): Promise<LocalHostPairingToken> => {
    const response = await fetch(resolveApiUrl("/api/local-hosts/pairing-tokens"), {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as LocalHostPairingToken;
  },
  
  // Integrations
  listIntegrations: async (): Promise<Integration[]> => {
    const response = await fetch(resolveApiUrl("/api/integrations"), {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as Integration[]) : [];
  },
  connectIntegration: async (
    id: "github" | "gitlab",
    data: { accessToken: string; apiUrl?: string },
  ): Promise<Integration> => {
    const response = await fetch(resolveApiUrl(`/api/integrations/${id}/connect`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return (await response.json()) as Integration;
  },
  connectGoogleIntegration: async (
    id: "google-calendar" | "gmail",
    data: { clientId: string; clientSecret: string; refreshToken: string; label?: string },
  ): Promise<Integration> => {
    const response = await fetch(resolveApiUrl(`/api/integrations/google/${id}/accounts`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return (await response.json()) as Integration;
  },
  createSmtpImapAccount: async (data: {
    email: string;
    displayName?: string;
    username: string;
    password: string;
    smtp: { host: string; port: number; secure: boolean };
    imap: { host: string; port: number; secure: boolean };
  }): Promise<Integration> => {
    const response = await fetch(resolveApiUrl("/api/integrations/smtp-imap/accounts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return (await response.json()) as Integration;
  },
  deleteIntegrationAccount: async (id: string, accountId: string): Promise<Integration> => {
    const response = await fetch(resolveApiUrl(`/api/integrations/${id}/accounts/${accountId}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return (await response.json()) as Integration;
  },
  disconnectIntegration: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(resolveApiUrl(`/api/integrations/${id}/disconnect`), {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return (await response.json()) as { success: boolean };
  },
  registerDetectedRuntimes: (data: {
    runtimeIds?: string[];
    registerAll?: boolean;
  }): Promise<RegisterRuntimesResponse> => {
    return fetch(resolveApiUrl("/api/runtimes/detect/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return (await response.json()) as RegisterRuntimesResponse;
    });
  },
  updateRuntime: (
    id: string,
    data: {
      enabled?: boolean;
      status?: RuntimeProfile["status"];
      transport?: RuntimeProfile["transport"];
    },
  ): Promise<RuntimeProfile> => {
    return fetch(resolveApiUrl(`/api/runtimes/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return (await response.json()) as RuntimeProfile;
    });
  },
  healthCheckRuntime: async (runtimeId: string, level?: "basic" | "ping" | "full") => {
    const url = new URL(resolveApiUrl(`/api/runtimes/${runtimeId}/health`));
    if (level) url.searchParams.set("level", level);
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as {
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
    const response = await fetch(resolveApiUrl(`/api/runtimes/${runtimeId}/model`), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as RuntimeModelsResponse;
  },

  // Runtime Chat
  chatWithRuntime: (runtimeId: string, prompt: string) => {
    return fetch(resolveApiUrl(`/api/runtimes/${runtimeId}/chat`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ prompt }),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return (await response.json()) as {
        success: boolean;
        output: string;
        error?: string;
        agentName: string;
        responseTime: number;
      };
    });
  },

  // Projects
  listProjects: async (): Promise<Project[]> => {
    const response = await fetch(resolveApiUrl("/api/projects"), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as Project[];
  },
  getProject: async (id: string): Promise<Project> => {
    const response = await fetch(resolveApiUrl(`/api/projects/${id}`), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as Project;
  },
  createProject: (data: { name: string; path: string; repositoryUrl?: string }): Promise<Project> =>
    fetch(resolveApiUrl("/api/projects"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return (await response.json()) as Project;
    }),
  updateProject: (
    id: string,
    data: Partial<Pick<Project, "name" | "path" | "repositoryUrl">>,
  ): Promise<Project> => {
    return fetch(resolveApiUrl(`/api/projects/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return (await response.json()) as Project;
    });
  },
  deleteProject: async (id: string): Promise<void> => {
    const response = await fetch(resolveApiUrl(`/api/projects/${id}`), { method: "DELETE", credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
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
  getProjectGitStatus: async (id: string): Promise<ProjectGitStatus> => {
    const client = createEdenClient();
    const result = await client.api.projects({ id }).git.get();
    return assertData(result);
  },
  switchProjectBranch: async (id: string, branch: string): Promise<ProjectCommandResult> => {
    const client = createEdenClient();
    const result = await client.api.projects({ id }).git.checkout.post({ branch });
    return assertData(result);
  },
  installProjectDependencies: async (id: string): Promise<ProjectCommandResult> => {
    const client = createEdenClient();
    const result = await client.api.projects({ id }).install.post(undefined);
    return assertData(result);
  },
  getProjectCommitActivity: async (id: string, days = 84): Promise<ProjectCommitActivity> => {
    const client = createEdenClient();
    const result = await client.api.projects({ id }).commits.get({
      query: { days },
    });
    return assertData(result);
  },

  // Filesystem
  browseDirectory: async (path?: string) => {
    const url = new URL(resolveApiUrl("/api/filesystem/browse"));
    if (path) {
      url.searchParams.set("path", path);
    }
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return (await response.json()) as {
      currentPath: string;
      parentPath?: string;
      directories: { name: string; path: string }[];
    };
  },
  readWorkspaceFile: async (path: string) => {
    const url = new URL(resolveApiUrl("/api/filesystem/file"));
    url.searchParams.set("path", path);
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return (await response.json()) as {
      path: string;
      content: string | null;
    };
  },
  writeWorkspaceFile: async (path: string, content: string) => {
    const response = await fetch(resolveApiUrl("/api/filesystem/file"), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ path, content }),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return (await response.json()) as {
      path: string;
      content: string;
    };
  },

  // Settings
  getSettings: async (): Promise<ControlSettings> => {
    const response = await fetch(resolveApiUrl("/api/settings"), {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return (await response.json()) as ControlSettings;
  },
  updateSettings: async (data: Partial<ControlSettings>): Promise<ControlSettings> => {
    const response = await fetch(resolveApiUrl("/api/settings"), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return (await response.json()) as ControlSettings;
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
    const response = await fetch(resolveApiUrl("/api/organizations"), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as Organization[];
  },
  createOrganization: (data: { name: string }): Promise<Organization> => {
    return fetch(resolveApiUrl("/api/organizations"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return (await response.json()) as Organization;
    });
  },
  updateOrganization: (id: string, data: { name?: string }): Promise<Organization> => {
    return fetch(resolveApiUrl(`/api/organizations/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return (await response.json()) as Organization;
    });
  },
  deleteOrganization: async (id: string): Promise<void> => {
    const response = await fetch(resolveApiUrl(`/api/organizations/${id}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
  },

  // Problems
  listProblems: async (filters?: {
    status?: ProblemStatus;
    priority?: ProblemPriority;
  }): Promise<Problem[]> => {
    const url = new URL(resolveApiUrl("/api/problems"));
    if (filters?.status) url.searchParams.set("status", filters.status);
    if (filters?.priority) url.searchParams.set("priority", filters.priority);
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as Problem[];
  },
  getProblemCounts: async (): Promise<Record<ProblemStatus, number>> => {
    const response = await fetch(resolveApiUrl("/api/problems/counts"), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as Record<ProblemStatus, number>;
  },
  getProblemSummary: async (): Promise<ProblemSummary> => {
    const response = await fetch(resolveApiUrl("/api/problems/summary"), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as ProblemSummary;
  },
  createProblem: (data: {
    title: string;
    priority?: ProblemPriority;
    source?: string;
    context?: string;
    goalId?: string;
    actions?: string[];
  }): Promise<Problem> => {
    return fetch(resolveApiUrl("/api/problems"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return (await response.json()) as Problem;
    });
  },
  updateProblem: (
    id: string,
    data: Partial<Pick<Problem, "title" | "priority" | "status" | "source" | "context">>,
  ): Promise<Problem> => {
    return fetch(resolveApiUrl(`/api/problems/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return (await response.json()) as Problem;
    });
  },
  deleteProblem: async (id: string): Promise<void> => {
    const response = await fetch(resolveApiUrl(`/api/problems/${id}`), { method: "DELETE", credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
  },
  bulkUpdateProblems: async (
    ids: string[],
    status: ProblemStatus,
  ): Promise<{ updated: number }> => {
    const response = await fetch(resolveApiUrl("/api/problems/bulk"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids, status }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as { updated: number };
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
    return (assertData(result) as unknown[]).map(normalizeInboxThread);
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

  // Bookmarks
  listBookmarks: async (): Promise<BookmarkCategory[]> => {
    const response = await fetch(resolveApiUrl("/api/bookmarks"), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as BookmarkCategory[];
  },
  replaceBookmarks: async (categories: BookmarkCategory[]): Promise<BookmarkCategory[]> => {
    const response = await fetch(resolveApiUrl("/api/bookmarks"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ categories }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as BookmarkCategory[];
  },
  createBookmarkCategory: async (name: string): Promise<BookmarkCategory[]> => {
    const response = await fetch(resolveApiUrl("/api/bookmarks"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kind: "category", name }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as BookmarkCategory[];
  },
  createBookmarkItem: async (
    categoryId: string,
    data: { title: string; url: string },
  ): Promise<BookmarkCategory[]> => {
    const response = await fetch(resolveApiUrl("/api/bookmarks"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kind: "bookmark", categoryId, title: data.title, url: data.url }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as BookmarkCategory[];
  },
  updateBookmarkCategory: async (id: string, name: string): Promise<BookmarkCategory[]> => {
    const response = await fetch(resolveApiUrl(`/api/bookmarks/categories/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as BookmarkCategory[];
  },
  deleteBookmarkCategory: async (id: string): Promise<BookmarkCategory[]> => {
    const response = await fetch(resolveApiUrl(`/api/bookmarks/categories/${id}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as BookmarkCategory[];
  },
  updateBookmarkItem: async (
    categoryId: string,
    itemId: string,
    data: { title: string; url: string },
  ): Promise<BookmarkCategory[]> => {
    const response = await fetch(resolveApiUrl(`/api/bookmarks/categories/${categoryId}/items/${itemId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as BookmarkCategory[];
  },
  deleteBookmarkItem: async (categoryId: string, itemId: string): Promise<BookmarkCategory[]> => {
    const response = await fetch(resolveApiUrl(`/api/bookmarks/categories/${categoryId}/items/${itemId}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as BookmarkCategory[];
  },
  moveBookmarkItem: async (
    bookmarkId: string,
    sourceCategoryId: string,
    targetCategoryId: string,
  ): Promise<BookmarkCategory[]> => {
    const response = await fetch(resolveApiUrl("/api/bookmarks/move"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ bookmarkId, sourceCategoryId, targetCategoryId }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as BookmarkCategory[];
  },

  // Conversations
  listConversations: async (): Promise<Conversation[]> => {
    const response = await fetch(resolveApiUrl("/api/conversations"), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as Conversation[];
  },
  getConversation: async (id: string): Promise<Conversation> => {
    const response = await fetch(resolveApiUrl(`/api/conversations/${id}`), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as Conversation;
  },
  createConversation: (data: {
    title?: string;
    projectId?: string;
    agentId?: string;
    runtimeId?: string;
    deleted?: boolean;
  }): Promise<Conversation> =>
    fetch(resolveApiUrl("/api/conversations"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return (await response.json()) as Conversation;
    }),
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
    return fetch(resolveApiUrl(`/api/conversations/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return (await response.json()) as Conversation;
    });
  },
  deleteConversation: async (id: string, options?: { permanent?: boolean }): Promise<void> => {
    const url = new URL(resolveApiUrl(`/api/conversations/${id}`));
    if (options?.permanent) {
      url.searchParams.set("permanent", "true");
    }
    const response = await fetch(url, { method: "DELETE", credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
  },
  clearDeletedConversations: async (): Promise<{ count: number }> => {
    const response = await fetch(resolveApiUrl("/api/conversations/deleted"), {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as { count: number };
  },
  getConversationMessages: async (id: string): Promise<ConversationMessage[]> => {
    const response = await fetch(resolveApiUrl(`/api/conversations/${id}/messages`), { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return ((await response.json()) as unknown[]).map(normalizeConversationMessage);
  },
  sendConversationMessage: async (id: string, content: string): Promise<ConversationMessage> => {
    const response = await fetch(resolveApiUrl(`/api/conversations/${id}/messages`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return normalizeConversationMessage(await response.json());
  },

  getObservabilityThroughput: async (_timeRange: string): Promise<TimeSeriesPoint[]> => {
    const url = new URL(resolveApiUrl("/api/observability/throughput"));
    url.searchParams.set("range", _timeRange);
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as TimeSeriesPoint[];
  },

  getObservabilityMetrics: async (timeRange: string): Promise<ObservabilityMetrics> => {
    const url = new URL(resolveApiUrl("/api/observability/metrics"));
    url.searchParams.set("range", timeRange);
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return (await response.json()) as ObservabilityMetrics;
  },
};
