import { goalManager } from "./goal-manager"
import { stateEngine } from "./state-engine"
import { activityLog } from "./activity-log"
import { agentController } from "./agent-controller"
import { projectManager } from "./project-manager"
import { getDb } from "./db"

export function seedData() {
  const db = getDb()

  // Check if already seeded
  const existingGoals = db.query("SELECT COUNT(*) as count FROM goals").get() as { count: number }
  if (existingGoals.count > 0) return

  // Seed projects
  const proj1 = projectManager.create("OrchOS", "/Users/a1111/Project/OrchOS")
  const proj2 = projectManager.create("my-app", "/Users/a1111/Projects/my-app")

  // Seed agents
  agentController.register({ name: "coder", role: "Code generation & editing", capabilities: ["write_code", "fix_bug"], status: "active", model: "local/coder" })
  agentController.register({ name: "tester", role: "Test execution & analysis", capabilities: ["run_tests"], status: "idle", model: "local/tester" })
  agentController.register({ name: "fixer", role: "Bug detection & repair", capabilities: ["fix_bug", "run_tests"], status: "idle", model: "local/fixer" })
  agentController.register({ name: "reviewer", role: "Code review & suggestions", capabilities: ["review"], status: "active", model: "cloud/reviewer" })

  // Seed goals
  const g1 = goalManager.create({
    title: "Implement login system",
    description: "Full auth flow with session management",
    successCriteria: ["tests pass", "code reviewed", "no lint errors"],
    constraints: ["use typescript"]
  })

  const g2 = goalManager.create({
    title: "Add payment integration",
    description: "Stripe checkout and webhook handling",
    successCriteria: ["payment flow works", "webhook verified"],
    constraints: []
  })

  const g3 = goalManager.create({
    title: "Setup CI/CD pipeline",
    description: "GitHub Actions with staging deploy",
    successCriteria: ["pipeline runs", "staging auto-deploys"],
    constraints: []
  })

  // Seed states for first goal
  stateEngine.createState(g1.id, "Tests", "failed", ["Fix", "Ignore"])
  stateEngine.createState(g1.id, "Build", "success")
  stateEngine.createState(g1.id, "Lint", "error", ["Fix", "Dismiss"])
  stateEngine.createState(g1.id, "Review", "failed", ["Apply suggestion", "Dismiss"])
  stateEngine.createState(g1.id, "Deploy", "pending")
  stateEngine.createState(g1.id, "Type Check", "success")

  // Seed artifacts for first goal
  stateEngine.createArtifact(g1.id, "auth.ts", "file", "warning", "modified")
  stateEngine.createArtifact(g1.id, "login.test.ts", "test", "failed", "2 failing")
  stateEngine.createArtifact(g1.id, "PR #23", "pr", "failed", "changes requested")
  stateEngine.createArtifact(g1.id, "session.ts", "file", "success", "created")
  stateEngine.createArtifact(g1.id, "build.log", "log", "success")

  // Seed activities
  activityLog.add(g1.id, "fixer", "Attempting fix on auth.ts", undefined, "Tests failed → suspected null pointer in session handler → applying fix")
  activityLog.add(g1.id, "tester", "Running tests", "2 failed, 14 passed")
  activityLog.add(g1.id, "coder", "Modified auth.ts", "Added session validation")
  activityLog.add(g1.id, "reviewer", "Reviewing PR #23", "Changes requested: missing error handling")
  activityLog.add(g1.id, "coder", "Created session.ts", "New file with session management")
  activityLog.add(g1.id, "tester", "Running lint", "1 error, 3 warnings")

  // Seed states for second goal
  stateEngine.createState(g2.id, "Tests", "pending")
  stateEngine.createState(g2.id, "Build", "pending")
  stateEngine.createState(g2.id, "Review", "pending")

  stateEngine.createArtifact(g2.id, "payment.ts", "file", "pending")
  stateEngine.createArtifact(g2.id, "stripe.test.ts", "test", "pending")

  // Seed states for third goal
  stateEngine.createState(g3.id, "Pipeline", "success")
  stateEngine.createState(g3.id, "Deploy", "running")
  stateEngine.createState(g3.id, "Tests", "success")

  stateEngine.createArtifact(g3.id, ".github/workflows/ci.yml", "file", "success", "created")
}
