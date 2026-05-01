export type Status = "success" | "failed" | "error" | "pending" | "running" | "warning";

export type Action = "write_code" | "run_tests" | "fix_bug" | "commit" | "review";

export type ProblemPriority = "critical" | "warning" | "info";
export type ProblemStatus = "open" | "fixed" | "ignored" | "assigned";
export type CommandStatus = "sent" | "executing" | "completed" | "failed";

export type InboxSource = "github_pr" | "github_issue" | "mention" | "agent_request";
export type SystemProblemSource =
  | "test_failed"
  | "build_error"
  | "lint_error"
  | "lint_warning"
  | "review_rejected";

export const INBOX_SOURCES: InboxSource[] = [
  "github_pr",
  "github_issue",
  "mention",
  "agent_request",
];
export const SYSTEM_SOURCES: SystemProblemSource[] = [
  "test_failed",
  "build_error",
  "lint_error",
  "lint_warning",
  "review_rejected",
];

export const inboxSourceLabels: Record<InboxSource, string> = {
  github_pr: "Pull Request",
  github_issue: "Issue",
  mention: "Mention",
  agent_request: "Agent Request",
};

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
  createdAt?: string;
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
  rules?: AgentRule[];
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
  supportsMultimodal?: boolean;
}

export interface RuntimeModelsResponse {
  models: string[];
  currentModel?: string;
  source: "config";
}

export interface StateItem {
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

export type NotificationEvent =
  | "goal_completed"
  | "goal_failed"
  | "agent_action"
  | "inbox_item"
  | "build_failed"
  | "review_rejected"
  | "mention";

export const NOTIFICATION_EVENTS: { id: NotificationEvent; labelKey: string }[] = [
  { id: "goal_completed", labelKey: "event_goal_completed" },
  { id: "goal_failed", labelKey: "event_goal_failed" },
  { id: "agent_action", labelKey: "event_agent_action" },
  { id: "inbox_item", labelKey: "event_inbox_item" },
  { id: "build_failed", labelKey: "event_build_failed" },
  { id: "review_rejected", labelKey: "event_review_rejected" },
  { id: "mention", labelKey: "event_mention" },
];

export const AVAILABLE_SOUNDS = [
  { id: "bell", name: "Bell 1", file: "/sounds/bell.mp3" },
  { id: "bell2", name: "Bell 2", file: "/sounds/bell2.mp3" },
  { id: "bell3", name: "Bell 3", file: "/sounds/bell3.mp3" },
  { id: "error", name: "Error", file: "/sounds/error.mp3" },
  { id: "pong", name: "Pong", file: "/sounds/pong.mp3" },
  { id: "ring", name: "Ring 1", file: "/sounds/ring.mp3" },
  { id: "ring2", name: "Ring 2", file: "/sounds/ring2.mp3" },
] as const;

export type SoundId = (typeof AVAILABLE_SOUNDS)[number]["id"];

export interface ControlSettings {
  autoCommit: boolean;
  autoFix: boolean;
  modelStrategy: "local-first" | "cloud-first" | "adaptive";
  locale: string;
  timezone: string;
  defaultAgentId?: string;
  defaultRuntimeId?: string;
  projectChatsRequireSandbox: boolean;
  notifications: {
    system: boolean;
    sound: boolean;
    eventSounds: Partial<Record<NotificationEvent, boolean>>;
    eventSoundFiles: Partial<Record<NotificationEvent, SoundId>>;
  };
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
  suggestedGoal?: string;
  createdAt: string;
  updatedAt: string;
}

export function isInboxItem(problem: Problem): problem is Problem & { source: InboxSource } {
  return INBOX_SOURCES.includes(problem.source as InboxSource);
}

export function isSystemProblem(
  problem: Problem,
): problem is Problem & { source: SystemProblemSource } {
  return SYSTEM_SOURCES.includes(problem.source as SystemProblemSource);
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

export type SidebarView =
  | "inbox"
  | "creation"
  | "agents"
  | "rules"
  | "mcp-servers"
  | "skills"
  | "projects"
  | "observability";

export interface AgentRule {
  id: string;
  when: string;
  action: string;
  enabled: boolean;
}
