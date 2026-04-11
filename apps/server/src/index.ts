import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { goalManager } from "./goal-manager"
import { stateEngine } from "./state-engine"
import { agentController } from "./agent-controller"
import { activityLog } from "./activity-log"
import { executionEngine } from "./execution-engine"
import { eventBus } from "./event-bus"
import { projectManager } from "./project-manager"
import { seedData } from "./seed"

seedData()

const app = new Elysia()
  .use(cors())

  // Projects (before goals to avoid conflicts)
  .get("/api/projects", () => projectManager.list())
  .post("/api/projects", ({ body }) => {
    const req = body as { name: string; path: string }
    if (!req.name || !req.path) {
      return { error: "name and path are required" }
    }
    return projectManager.create(req.name, req.path)
  })
  .get("/api/projects/:id", ({ params: { id } }) => {
    const project = projectManager.get(id)
    if (!project) return { error: "Project not found" }
    return project
  })
  .patch("/api/projects/:id", ({ params: { id }, body }) => {
    const patch = body as { name?: string; path?: string }
    return projectManager.update(id, patch) || { error: "Project not found" }
  })
  .delete("/api/projects/:id", ({ params: { id } }) => {
    return projectManager.delete(id) ? { success: true } : { error: "Project not found" }
  })

  // Goals - list and create (generic)
  .get("/api/goals", () => goalManager.list())
  .post("/api/goals", ({ body }) => {
    const req = body as { title: string; description?: string; successCriteria: string[]; constraints?: string[] }
    if (!req.title || !req.successCriteria?.length) {
      return { error: "title and successCriteria are required" }
    }
    const goal = goalManager.create(req)
    // Create default states for new goal
    const states = ["Tests", "Build", "Lint", "Review", "Deploy"]
    for (const label of states) {
      stateEngine.createState(goal.id, label, "pending", label === "Tests" ? ["Fix", "Ignore"] : undefined)
    }
    return goal
  })

  // Goal specific routes with goalId
  .get("/api/goals/:goalId", ({ params: { goalId } }) => {
    const goal = goalManager.get(goalId)
    if (!goal) return { error: "Goal not found" }
    return goal
  })
  .patch("/api/goals/:goalId", ({ params: { goalId }, body }) => {
    const patch = body as Partial<{ title: string; description: string; successCriteria: string[]; constraints: string[]; status: "active" | "completed" | "paused" }>
    return goalManager.update(goalId, patch) || { error: "Goal not found" }
  })
  .delete("/api/goals/:goalId", ({ params: { goalId } }) => {
    return goalManager.delete(goalId) ? { success: true } : { error: "Goal not found" }
  })

  // States for a goal
  .get("/api/goals/:goalId/states", ({ params: { goalId } }) => stateEngine.getStatesByGoal(goalId))
  .post("/api/goals/:goalId/states", ({ params: { goalId }, body }) => {
    const req = body as { label: string; status: string; actions?: string[] }
    return stateEngine.createState(goalId, req.label, req.status as any, req.actions)
  })

  // Artifacts for a goal
  .get("/api/goals/:goalId/artifacts", ({ params: { goalId } }) => stateEngine.getArtifactsByGoal(goalId))
  .post("/api/goals/:goalId/artifacts", ({ params: { goalId }, body }) => {
    const req = body as { name: string; type: string; status: string; detail?: string }
    return stateEngine.createArtifact(goalId, req.name, req.type as any, req.status as any, req.detail)
  })

  // Activities for a goal
  .get("/api/goals/:goalId/activities", ({ params: { goalId } }) => activityLog.getByGoal(goalId))

  // Actions for a goal
  .post("/api/goals/:goalId/actions", async ({ params: { goalId }, body }) => {
    const req = body as { action: string; stateId?: string; agentId?: string }
    return executionEngine.executeAction(goalId, req.action as any, req.stateId, req.agentId)
  })
  .post("/api/goals/:goalId/loop", async ({ params: { goalId } }) => {
    await executionEngine.runGoalLoop(goalId)
    return { success: true }
  })

  // States (by id)
  .patch("/api/states/:id", ({ params: { id }, body }) => {
    const req = body as { status: string }
    return stateEngine.updateState(id, req.status as any) || { error: "State not found" }
  })
  .delete("/api/states/:id", ({ params: { id } }) => {
    return stateEngine.deleteState(id) ? { success: true } : { error: "State not found" }
  })

  // Artifacts (by id)
  .patch("/api/artifacts/:id", ({ params: { id }, body }) => {
    const req = body as { status?: string; detail?: string }
    return stateEngine.updateArtifact(id, req) || { error: "Artifact not found" }
  })

  // Activities
  .get("/api/activities", ({ query }) => {
    const limit = query.limit ? parseInt(query.limit as string) : 50
    return activityLog.getAll(limit)
  })

  // Agents
  .get("/api/agents", () => agentController.list())
  .patch("/api/agents/:id", ({ params: { id }, body }) => {
    const req = body as { status: string }
    return agentController.updateStatus(id, req.status as any) || { error: "Agent not found" }
  })

  // Execution
  .post("/api/goals/:goalId/actions", async ({ params: { goalId }, body }) => {
    const req = body as { action: string; stateId?: string; agentId?: string }
    return executionEngine.executeAction(goalId, req.action as any, req.stateId, req.agentId)
  })
  .post("/api/goals/:goalId/loop", async ({ params: { goalId } }) => {
    await executionEngine.runGoalLoop(goalId)
    return { success: true }
  })

  // Control settings
  .get("/api/settings", () => executionEngine.getSettings())
  .patch("/api/settings", ({ body }) => {
    const patch = body as Partial<{ autoCommit: boolean; autoFix: boolean; modelStrategy: string }>
    return executionEngine.updateSettings(patch as any)
  })

  // Events
  .get("/api/events", ({ query }) => {
    const limit = query.limit ? parseInt(query.limit as string) : 50
    return eventBus.getHistory(query.goalId as string, limit)
  })

  // History (alias for events with goal filtering)
  .get("/api/history", ({ query }) => {
    const goalId = query.goalId as string | undefined
    const limit = query.limit ? parseInt(query.limit as string) : 50
    const events = eventBus.getHistory(goalId, limit)
    // Transform events to history format
    return events.map(e => ({
      id: e.id,
      type: e.type,
      goalId: e.goalId,
      detail: e.payload,
      timestamp: e.timestamp,
    }))
  })

  // WebSocket for real-time updates
  .ws("/ws", {
    open(ws) {
      const unsubscribe = eventBus.onAny((event) => {
        ws.send(JSON.stringify({ type: "event", data: event }))
      })
      ws.data = { unsubscribe }
      ws.send(JSON.stringify({ type: "connected" }))
    },
    close(ws) {
      const data = ws.data as { unsubscribe: () => void } | undefined
      data?.unsubscribe()
    },
    message(ws, message) {
      ws.send(JSON.stringify({ type: "pong", data: message }))
    },
  })

  .listen(3001)

console.log(
  `🦊 Elysia server running at ${app.server?.hostname}:${app.server?.port}`
)
