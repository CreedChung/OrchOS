export type Status = "success" | "failed" | "error" | "pending" | "running" | "warning"

export type Action = "write_code" | "run_tests" | "fix_bug" | "commit" | "review"

export type ProblemPriority = "critical" | "warning" | "info"
export type ProblemStatus = "open" | "fixed" | "ignored" | "assigned"

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
  createdAt?: string
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
}

export interface StateItem {
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

export type SidebarView = "inbox" | "goals" | "agents" | "rules" | "history"
