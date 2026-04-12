import { GoalService } from "../modules/goal/service"
import { ProjectService } from "../modules/project/service"
import { AgentService } from "../modules/agent/service"
import { StateService } from "../modules/state/service"
import { ActivityService } from "../modules/activity/service"
import { OrganizationService } from "../modules/organization"
import { ProblemService } from "../modules/problem/service"
import { RuleService } from "../modules/rule/service"
import { CommandService } from "../modules/command/service"
import { db } from "./index"
import { goals, organizations, problems, rules } from "./schema"
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

  // Create a command first, then link goal to it
  const cmd1 = CommandService.create({
    instruction: "Implement login system with session management",
    agentNames: ["Codex", "Reviewer"],
    projectIds: [proj1.id],
  })

  const g1 = GoalService.create({
    title: "Implement login system",
    description: "Full auth flow with session management",
    successCriteria: ["tests pass", "code reviewed", "no lint errors"],
    constraints: ["use typescript"],
    projectId: proj1.id,
    commandId: cmd1.id,
    watchers: ["Codex", "Reviewer"],
  })

  // Link command back to goal
  CommandService.update(cmd1.id, { goalId: g1.id, status: "executing" })

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
  ActivityService.add(g1.id, "coder", "Modified auth.ts", "Added session validation", undefined, "+ added session validation\n- removed deprecated handler")
  ActivityService.add(g1.id, "reviewer", "Reviewing PR #23", "Changes requested: missing error handling")
  ActivityService.add(g1.id, "coder", "Created session.ts", "New file with session management", undefined, "+ created session.ts\n+ added SessionManager class\n+ added validate() method")
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

  // Seed problems (Inbox items)
  const existingProblems = db.select({ count: sql<number>`count(*)` }).from(problems).get()
  if (existingProblems?.count === 0) {
    ProblemService.create({
      title: "Tests failed",
      priority: "critical",
      source: "Tester",
      context: "repo: auth-service | login.test.ts",
      goalId: g1.id,
      actions: ["Fix", "Ignore", "Assign"],
    })
    ProblemService.create({
      title: "PR rejected",
      priority: "warning",
      source: "Reviewer",
      context: "PR #23 | auth.ts",
      goalId: g1.id,
      actions: ["Apply fix", "Override"],
    })
    ProblemService.create({
      title: "Lint error",
      priority: "warning",
      source: "Tester",
      context: "repo: auth-service | auth.ts:42",
      goalId: g1.id,
      actions: ["Fix", "Ignore"],
    })
    ProblemService.create({
      title: "Build success",
      priority: "info",
      source: "System",
      context: "repo: auth-service",
      goalId: g1.id,
      actions: ["Archive"],
    })
    ProblemService.create({
      title: "Deploy pipeline running",
      priority: "info",
      source: "System",
      context: "repo: my-app | .github/workflows/ci.yml",
      goalId: g3.id,
      actions: ["Archive"],
    })
    ProblemService.create({
      title: "Payment integration pending review",
      priority: "warning",
      source: "System",
      context: "repo: OrchOS | payment.ts",
      goalId: g2.id,
      actions: ["Assign", "Ignore"],
    })
  }

  // Seed rules
  const existingRules = db.select({ count: sql<number>`count(*)` }).from(rules).get()
  if (existingRules?.count === 0) {
    RuleService.create({ name: "Auto-fix test failures", condition: "test_failed", action: "auto_fix" })
    RuleService.create({ name: "Ignore lint warnings", condition: "lint_warning", action: "ignore" })
    RuleService.create({ name: "Auto-assign reviews", condition: "review_rejected", action: "assign_reviewer" })
  }
}
