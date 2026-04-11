export type Status = "success" | "failed" | "error" | "pending" | "running" | "warning"

export type Action = "write_code" | "run_tests" | "fix_bug" | "commit" | "review"

export type EventType = "test_failed" | "review_rejected" | "build_success" | "state_changed" | "goal_created" | "goal_completed" | "agent_action"

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

export interface Event {
  id: string
  type: EventType
  goalId?: string
  payload: Record<string, unknown>
  timestamp: string
}

export interface ControlSettings {
  autoCommit: boolean
  autoFix: boolean
  modelStrategy: "local-first" | "cloud-first" | "adaptive"
}

export interface CreateGoalRequest {
  title: string
  description?: string
  successCriteria: string[]
  constraints?: string[]
}

export interface TriggerActionRequest {
  action: Action
  stateId?: string
  agentId?: string
}
