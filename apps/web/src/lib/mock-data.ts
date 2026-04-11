import type { Goal, Project, AgentProfile, ActivityEntry, StateItem, Artifact } from "#/lib/types"

export const mockGoals: Goal[] = [
  { id: "1", title: "Implement login system", description: "Full auth flow with session management" },
  { id: "2", title: "Add payment integration", description: "Stripe checkout and webhook handling" },
  { id: "3", title: "Setup CI/CD pipeline", description: "GitHub Actions with staging deploy" },
]

export const mockProjects: Project[] = [
  { id: "1", name: "OrchOS", path: "~/projects/orchos" },
  { id: "2", name: "API Server", path: "~/projects/api" },
]

export const mockAgents: AgentProfile[] = [
  { id: "1", name: "coder", role: "Code generation & editing", status: "active" },
  { id: "2", name: "tester", role: "Test execution & analysis", status: "idle" },
  { id: "3", name: "fixer", role: "Bug detection & repair", status: "idle" },
  { id: "4", name: "reviewer", role: "Code review & suggestions", status: "active" },
]

export const mockStates: StateItem[] = [
  { id: "s1", label: "Tests", status: "failed", actions: ["Fix", "Ignore"] },
  { id: "s2", label: "Build", status: "success" },
  { id: "s3", label: "Lint", status: "error", actions: ["Fix", "Dismiss"] },
  { id: "s4", label: "Review", status: "failed", actions: ["Apply suggestion", "Dismiss"] },
  { id: "s5", label: "Deploy", status: "pending" },
  { id: "s6", label: "Type Check", status: "success" },
]

export const mockArtifacts: Artifact[] = [
  { id: "a1", name: "auth.ts", type: "file", status: "warning", detail: "modified" },
  { id: "a2", name: "login.test.ts", type: "test", status: "failed", detail: "2 failing" },
  { id: "a3", name: "PR #23", type: "pr", status: "failed", detail: "changes requested" },
  { id: "a4", name: "session.ts", type: "file", status: "success", detail: "created" },
  { id: "a5", name: "build.log", type: "log", status: "success" },
]

export const mockActivities: ActivityEntry[] = [
  { id: "act1", timestamp: "10:03", agent: "fixer", action: "Attempting fix on auth.ts", reasoning: "Tests failed → suspected null pointer in session handler → applying fix" },
  { id: "act2", timestamp: "10:02", agent: "tester", action: "Running tests", detail: "2 failed, 14 passed" },
  { id: "act3", timestamp: "10:01", agent: "coder", action: "Modified auth.ts", detail: "Added session validation" },
  { id: "act4", timestamp: "09:58", agent: "reviewer", action: "Reviewing PR #23", detail: "Changes requested: missing error handling" },
  { id: "act5", timestamp: "09:55", agent: "coder", action: "Created session.ts", detail: "New file with session management" },
  { id: "act6", timestamp: "09:50", agent: "tester", action: "Running lint", detail: "1 error, 3 warnings" },
]
