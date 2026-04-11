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

export interface Goal {
  id: string
  title: string
  description?: string
  successCriteria: string[]
  constraints: string[]
  status: "active" | "completed" | "paused"
  projectId?: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  path: string
  createdAt: string
}

export interface HistoryEntry {
  id: string
  type: string
  goalId?: string
  detail: Record<string, unknown>
  timestamp: string
}

export interface Project {
  id: string
  name: string
  path: string
}

export interface AgentProfile {
  id: string
  name: string
  role: string
  capabilities: Action[]
  status: "idle" | "active" | "error"
  model: string
  enabled: boolean
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
}

export interface ControlSettings {
  autoCommit: boolean
  autoFix: boolean
  modelStrategy: "local-first" | "cloud-first" | "adaptive"
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

// API functions
export const api = {
  // Goals
  listGoals: () => request<Goal[]>("/api/goals"),
  getGoal: (id: string) => request<Goal>(`/api/goals/${id}`),
  createGoal: (data: { title: string; description?: string; successCriteria: string[]; constraints?: string[]; projectId?: string }) =>
    request<Goal>("/api/goals", { method: "POST", body: JSON.stringify(data) }),
  updateGoal: (id: string, data: Partial<Pick<Goal, "title" | "description" | "successCriteria" | "constraints" | "status">>) =>
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
  updateAgent: (id: string, data: { enabled?: boolean; status?: AgentProfile["status"] }) =>
    request<AgentProfile>(`/api/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Projects
  listProjects: () => request<Project[]>("/api/projects"),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  createProject: (data: { name: string; path: string }) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Pick<Project, "name" | "path">>) =>
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
}
