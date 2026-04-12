const API_BASE = "http://localhost:5173"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

// Types aligned with server
export type Status = "success" | "failed" | "error" | "pending" | "running" | "warning"
export type Action = "write_code" | "run_tests" | "fix_bug" | "commit" | "review"
export type ProblemPriority = "critical" | "warning" | "info"
export type ProblemStatus = "open" | "fixed" | "ignored" | "assigned"
export type CommandStatus = "sent" | "executing" | "completed" | "failed"

export interface Command {
  id: string
  instruction: string
  agentNames: string[]
  projectIds: string[]
  goalId?: string
  status: CommandStatus
  createdAt: string
}

export interface Goal {
  id: string
  title: string
  description?: string
  successCriteria: string[]
  constraints: string[]
  status: "active" | "completed" | "paused"
  projectId?: string
  commandId?: string
  watchers: string[]
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  path: string
  repositoryUrl?: string
  createdAt: string
}

export interface HistoryEntry {
  id: string
  type: string
  goalId?: string
  detail: Record<string, unknown>
  timestamp: string
}

export interface AgentProfile {
  id: string
  name: string
  role: string
  capabilities: Action[]
  status: "idle" | "active" | "error"
  model: string
  enabled: boolean
  cliCommand?: string
  currentModel?: string
  runtimeId?: string
}

export interface DetectedAgent {
  id: string
  name: string
  command: string
  version?: string
  path?: string
  role: string
  capabilities: string[]
  model: string
}

export interface DetectResponse {
  available: DetectedAgent[]
  unavailable: DetectedAgent[]
}

export interface RegisterResponse {
  registered: AgentProfile[]
  skipped: DetectedAgent[]
}

export interface StateEntry {
  id: string
  goalId: string
  label: string
  status: Status
  actions?: string[]
  updatedAt: string
}

export interface Artifact {
  id: string
  goalId: string
  name: string
  type: "file" | "pr" | "test" | "log"
  status: Status
  detail?: string
  updatedAt: string
}

export interface ActivityEntry {
  id: string
  goalId: string
  timestamp: string
  agent: string
  action: string
  detail?: string
  reasoning?: string
  diff?: string
}

export interface ControlSettings {
  autoCommit: boolean
  autoFix: boolean
  modelStrategy: "local-first" | "cloud-first" | "adaptive"
  locale: string
  timezone: string
  notifications: {
    system: boolean
    sound: boolean
    eventSounds: Partial<Record<string, boolean>>
  }
}

export interface Event {
  id: string
  type: string
  goalId?: string
  payload: Record<string, unknown>
  timestamp: string
}

export interface Organization {
  id: string
  name: string
}

export interface Problem {
  id: string
  title: string
  priority: ProblemPriority
  source?: string
  context?: string
  goalId?: string
  stateId?: string
  status: ProblemStatus
  actions: string[]
  createdAt: string
  updatedAt: string
}

export interface Rule {
  id: string
  name: string
  condition: string
  action: string
  enabled: boolean
  createdAt: string
}

export interface McpServerProfile {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
  scope: "global" | "project"
  projectId?: string
  organizationId?: string
  createdAt: string
  updatedAt: string
}

export interface SkillProfile {
  id: string
  name: string
  description?: string
  enabled: boolean
  scope: "global" | "project"
  projectId?: string
  organizationId?: string
  createdAt: string
  updatedAt: string
}

// API functions
export const api = {
  // Goals
  listGoals: () => request<Goal[]>("/api/goals"),
  getGoal: (id: string) => request<Goal>(`/api/goals/${id}`),
  createGoal: (data: { title: string; description?: string; successCriteria: string[]; constraints?: string[]; projectId?: string; commandId?: string; watchers?: string[] }) =>
    request<Goal>("/api/goals", { method: "POST", body: JSON.stringify(data) }),
  updateGoal: (id: string, data: Partial<Pick<Goal, "title" | "description" | "successCriteria" | "constraints" | "status" | "watchers"> & { projectId?: string; commandId?: string }>) =>
    request<Goal>(`/api/goals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteGoal: (id: string) => request<{ success: boolean }>(`/api/goals/${id}`, { method: "DELETE" }),

  // States
  getStates: (goalId: string) => request<StateEntry[]>(`/api/goals/${goalId}/states`),
  updateState: (id: string, status: Status) =>
    request<StateEntry>(`/api/states/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Artifacts
  getArtifacts: (goalId: string) => request<Artifact[]>(`/api/goals/${goalId}/artifacts`),

  // Activities
  getActivities: (goalId: string) => request<ActivityEntry[]>(`/api/goals/${goalId}/activities`),
  getAllActivities: () => request<ActivityEntry[]>("/api/activities"),

  // Agents
  listAgents: () => request<AgentProfile[]>("/api/agents"),
  createAgent: (data: { name: string; role: string; capabilities: string[]; model: string; cliCommand?: string; runtimeId?: string }) =>
    request<AgentProfile>("/api/agents", { method: "POST", body: JSON.stringify(data) }),
  detectAgents: () => request<DetectResponse>("/api/agents/detect"),
  registerDetectedAgents: (data: { agentIds?: string[]; registerAll?: boolean }) =>
    request<RegisterResponse>("/api/agents/detect/register", { method: "POST", body: JSON.stringify(data) }),
  updateAgent: (id: string, data: { enabled?: boolean; status?: AgentProfile["status"] }) =>
    request<AgentProfile>(`/api/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  healthCheckAgent: (agentId: string, level?: "basic" | "ping" | "full") =>
    request<{ healthy: boolean; level: string; output: string; error?: string; responseTime: number; agentName: string; agentCommand: string; authRequired?: boolean }>(`/api/agents/${agentId}/health${level ? `?level=${level}` : ""}`),

  // Projects
  listProjects: () => request<Project[]>("/api/projects"),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  createProject: (data: { name: string; path: string; repositoryUrl?: string }) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Pick<Project, "name" | "path" | "repositoryUrl">>) =>
    request<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProject: (id: string) => request<{ success: boolean }>(`/api/projects/${id}`, { method: "DELETE" }),

  // History
  getHistory: (goalId?: string, limit?: number) =>
    request<HistoryEntry[]>(`/api/history${goalId ? `?goalId=${goalId}` : ""}${limit ? `&limit=${limit}` : ""}`),

  // Execution
  triggerAction: (goalId: string, action: Action, stateId?: string, agentId?: string) =>
    request<{ success: boolean; message: string }>(`/api/goals/${goalId}/actions`, {
      method: "POST",
      body: JSON.stringify({ action, stateId, agentId }),
    }),
  runLoop: (goalId: string) =>
    request<{ success: boolean }>(`/api/goals/${goalId}/loop`, { method: "POST" }),

  // Settings
  getSettings: () => request<ControlSettings>("/api/settings"),
  updateSettings: (data: Partial<ControlSettings>) =>
    request<ControlSettings>("/api/settings", { method: "PATCH", body: JSON.stringify(data) }),

  // Events
  getEvents: (goalId?: string, limit?: number) =>
    request<Event[]>(`/api/events${goalId ? `?goalId=${goalId}` : ""}${limit ? `&limit=${limit}` : ""}`),

  // Organizations
  listOrganizations: () => request<Organization[]>("/api/organizations"),
  updateOrganization: (id: string, data: { name?: string }) =>
    request<Organization>(`/api/organizations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteOrganization: (id: string) =>
    request<{ success: boolean }>(`/api/organizations/${id}`, { method: "DELETE" }),

  // Problems
  listProblems: (filters?: { status?: ProblemStatus; priority?: ProblemPriority }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set("status", filters.status)
    if (filters?.priority) params.set("priority", filters.priority)
    const qs = params.toString()
    return request<Problem[]>(`/api/problems${qs ? `?${qs}` : ""}`)
  },
  getProblemCounts: () => request<Record<ProblemStatus, number>>("/api/problems/counts"),
  createProblem: (data: { title: string; priority?: ProblemPriority; source?: string; context?: string; goalId?: string; actions?: string[] }) =>
    request<Problem>("/api/problems", { method: "POST", body: JSON.stringify(data) }),
  updateProblem: (id: string, data: Partial<Pick<Problem, "title" | "priority" | "status" | "source" | "context">>) =>
    request<Problem>(`/api/problems/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProblem: (id: string) =>
    request<{ success: boolean }>(`/api/problems/${id}`, { method: "DELETE" }),
  bulkUpdateProblems: (ids: string[], status: ProblemStatus) =>
    request<{ updated: number }>("/api/problems/bulk", { method: "POST", body: JSON.stringify({ ids, status }) }),

  // Rules
  listRules: () => request<Rule[]>("/api/rules"),
  createRule: (data: { name: string; condition: string; action: string; enabled?: boolean }) =>
    request<Rule>("/api/rules", { method: "POST", body: JSON.stringify(data) }),
  updateRule: (id: string, data: Partial<Pick<Rule, "name" | "condition" | "action" | "enabled">>) =>
    request<Rule>(`/api/rules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRule: (id: string) =>
    request<{ success: boolean }>(`/api/rules/${id}`, { method: "DELETE" }),

  // Commands
  listCommands: () => request<Command[]>("/api/commands"),
  createCommand: (data: { instruction: string; agentNames?: string[]; projectIds?: string[] }) =>
    request<Command>("/api/commands", { method: "POST", body: JSON.stringify(data) }),
  getCommand: (id: string) => request<Command>(`/api/commands/${id}`),
  updateCommand: (id: string, data: { status?: CommandStatus; goalId?: string }) =>
    request<Command>(`/api/commands/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCommand: (id: string) =>
    request<{ success: boolean }>(`/api/commands/${id}`, { method: "DELETE" }),

  // MCP Servers
  listMcpServers: (options?: { projectId?: string; organizationId?: string; scope?: "global" | "project" }) => {
    const params = new URLSearchParams()
    if (options?.projectId) params.set("projectId", options.projectId)
    if (options?.organizationId) params.set("organizationId", options.organizationId)
    if (options?.scope) params.set("scope", options.scope)
    const qs = params.toString()
    return request<McpServerProfile[]>(`/api/mcp-servers${qs ? `?${qs}` : ""}`)
  },
  listMcpServersGlobal: () => request<McpServerProfile[]>("/api/mcp-servers/global"),
  listMcpServersByProject: (projectId: string) => request<McpServerProfile[]>(`/api/mcp-servers/project/${projectId}`),
  getMcpServer: (id: string) => request<McpServerProfile>(`/api/mcp-servers/${id}`),
  createMcpServer: (data: { name: string; command: string; args?: string[]; env?: Record<string, string>; scope?: "global" | "project"; projectId?: string; organizationId?: string }) =>
    request<McpServerProfile>("/api/mcp-servers", { method: "POST", body: JSON.stringify(data) }),
  updateMcpServer: (id: string, data: Partial<Pick<McpServerProfile, "name" | "command" | "args" | "env" | "enabled" | "scope">>) =>
    request<McpServerProfile>(`/api/mcp-servers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMcpServer: (id: string) =>
    request<{ success: boolean }>(`/api/mcp-servers/${id}`, { method: "DELETE" }),
  toggleMcpServer: (id: string, enabled: boolean) =>
    request<McpServerProfile>(`/api/mcp-servers/${id}/toggle`, { method: "POST", body: JSON.stringify({ enabled }) }),

  // Skills
  listSkills: (options?: { projectId?: string; organizationId?: string; scope?: "global" | "project" }) => {
    const params = new URLSearchParams()
    if (options?.projectId) params.set("projectId", options.projectId)
    if (options?.organizationId) params.set("organizationId", options.organizationId)
    if (options?.scope) params.set("scope", options.scope)
    const qs = params.toString()
    return request<SkillProfile[]>(`/api/skills${qs ? `?${qs}` : ""}`)
  },
  getSkill: (id: string) => request<SkillProfile>(`/api/skills/${id}`),
  createSkill: (data: { name: string; description?: string; scope?: "global" | "project"; projectId?: string; organizationId?: string }) =>
    request<SkillProfile>("/api/skills", { method: "POST", body: JSON.stringify(data) }),
  updateSkill: (id: string, data: Partial<Pick<SkillProfile, "name" | "description" | "enabled" | "scope">>) =>
    request<SkillProfile>(`/api/skills/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSkill: (id: string) =>
    request<{ success: boolean }>(`/api/skills/${id}`, { method: "DELETE" }),
  toggleSkill: (id: string, enabled: boolean) =>
    request<SkillProfile>(`/api/skills/${id}/toggle`, { method: "POST", body: JSON.stringify({ enabled }) }),
}
