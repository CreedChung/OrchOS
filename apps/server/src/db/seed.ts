import { GoalService } from "../modules/goal/service"
import { ProjectService } from "../modules/project/service"
import { AgentService } from "../modules/agent/service"
import { StateService } from "../modules/state/service"
import { ActivityService } from "../modules/activity/service"
import { OrganizationService } from "../modules/organization"
import { db } from "./index"
import { goals, organizations } from "./schema"
import { sql } from "drizzle-orm"

export function seedData() {
  // Seed organizations independently (may already exist)
  const existingOrgs = db.select({ count: sql<number>`count(*)` }).from(organizations).get()
  if (existingOrgs?.count === 0) {
    OrganizationService.create("Acme Corp")
    OrganizationService.create("Personal")
    OrganizationService.create("Open Source")
  }

  const existingGoals = db.select({ count: sql<number>`count(*)` }).from(goals).get()
  if (existingGoals?.count > 0) return

  const proj1 = ProjectService.create("OrchOS", "/Users/a1111/Project/OrchOS")
  const proj2 = ProjectService.create("my-app", "/Users/a1111/Projects/my-app")

  AgentService.register({ name: "Codex", role: "Code generation & editing", capabilities: ["write_code", "fix_bug"], status: "active", model: "local/codex", enabled: true })
  AgentService.register({ name: "Claude", role: "Reasoning & analysis", capabilities: ["write_code", "fix_bug", "review"], status: "idle", model: "cloud/claude-sonnet-4", enabled: true })
  AgentService.register({ name: "Tester", role: "Test execution & analysis", capabilities: ["run_tests"], status: "idle", model: "local/tester", enabled: true })
  AgentService.register({ name: "Reviewer", role: "Code review & suggestions", capabilities: ["review"], status: "active", model: "cloud/reviewer", enabled: true })

  const g1 = GoalService.create({
    title: "Implement login system",
    description: "Full auth flow with session management",
    successCriteria: ["tests pass", "code reviewed", "no lint errors"],
    constraints: ["use typescript"],
    projectId: proj1.id,
  })

  const g2 = GoalService.create({
    title: "Add payment integration",
    description: "Stripe checkout and webhook handling",
    successCriteria: ["payment flow works", "webhook verified"],
    projectId: proj1.id,
  })

  const g3 = GoalService.create({
    title: "Setup CI/CD pipeline",
    description: "GitHub Actions with staging deploy",
    successCriteria: ["pipeline runs", "staging auto-deploys"],
    projectId: proj2.id,
  })

  StateService.createState(g1.id, "Tests", "failed", ["Fix", "Ignore"])
  StateService.createState(g1.id, "Build", "success")
  StateService.createState(g1.id, "Lint", "error", ["Fix", "Dismiss"])
  StateService.createState(g1.id, "Review", "failed", ["Apply suggestion", "Dismiss"])
  StateService.createState(g1.id, "Deploy", "pending")
  StateService.createState(g1.id, "Type Check", "success")

  StateService.createArtifact(g1.id, "auth.ts", "file", "warning", "modified")
  StateService.createArtifact(g1.id, "login.test.ts", "test", "failed", "2 failing")
  StateService.createArtifact(g1.id, "PR #23", "pr", "failed", "changes requested")
  StateService.createArtifact(g1.id, "session.ts", "file", "success", "created")
  StateService.createArtifact(g1.id, "build.log", "log", "success")

  ActivityService.add(g1.id, "fixer", "Attempting fix on auth.ts", undefined, "Tests failed -> suspected null pointer in session handler")
  ActivityService.add(g1.id, "tester", "Running tests", "2 failed, 14 passed")
  ActivityService.add(g1.id, "coder", "Modified auth.ts", "Added session validation")
  ActivityService.add(g1.id, "reviewer", "Reviewing PR #23", "Changes requested: missing error handling")
  ActivityService.add(g1.id, "coder", "Created session.ts", "New file with session management")
  ActivityService.add(g1.id, "tester", "Running lint", "1 error, 3 warnings")

  StateService.createState(g2.id, "Tests", "pending")
  StateService.createState(g2.id, "Build", "pending")
  StateService.createState(g2.id, "Review", "pending")
  StateService.createArtifact(g2.id, "payment.ts", "file", "pending")
  StateService.createArtifact(g2.id, "stripe.test.ts", "test", "pending")

  StateService.createState(g3.id, "Pipeline", "success")
  StateService.createState(g3.id, "Deploy", "running")
  StateService.createState(g3.id, "Tests", "success")
  StateService.createArtifact(g3.id, ".github/workflows/ci.yml", "file", "success", "created")
}
