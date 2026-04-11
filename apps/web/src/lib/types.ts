export type Status = "success" | "failed" | "error" | "pending" | "running" | "warning"

export interface Goal {
  id: string
  title: string
  description?: string
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
  status: "idle" | "active" | "error"
}

export interface StateItem {
  id: string
  label: string
  status: Status
  actions?: string[]
}

export interface Artifact {
  id: string
  name: string
  type: "file" | "pr" | "test" | "log"
  status: Status
  detail?: string
}

export interface ActivityEntry {
  id: string
  timestamp: string
  agent: string
  action: string
  detail?: string
  reasoning?: string
}
