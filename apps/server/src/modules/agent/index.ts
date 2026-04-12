import { Elysia, t } from "elysia"
import { status } from "elysia"
import { AgentService } from "./service"
import { AgentModel } from "./model"

export const agentController = new Elysia({ prefix: "/api/agents" })
  .get("/", () => AgentService.list(), {
    response: t.Array(AgentModel.response),
  })
  .get("/detect", async () => {
    return AgentService.detect()
  }, {
    response: AgentModel.detectResponse,
  })
  .post("/detect/register", async ({ body }) => {
    const detected = await AgentService.detect()
    const registered: typeof AgentModel.response.$inferInput[] = []

    for (const agent of detected.available) {
      if ((body.agentIds && body.agentIds.includes(agent.id)) || body.registerAll) {
        const profile = AgentService.registerFromCLI(agent)
        if (profile) registered.push(profile)
      }
    }

    return { registered, skipped: detected.available.filter((a) => !registered.find((r) => r.id === a.id)) }
  }, {
    body: t.Object({
      agentIds: t.Optional(t.Array(t.String())),
      registerAll: t.Optional(t.Boolean()),
    }),
    response: t.Object({
      registered: t.Array(AgentModel.response),
      skipped: t.Array(t.Object({
        id: t.String(),
        name: t.String(),
        command: t.String(),
        version: t.Optional(t.String()),
        path: t.Optional(t.String()),
        role: t.String(),
        capabilities: t.Array(t.String()),
        model: t.String(),
      })),
    }),
  })
  .patch("/:id", ({ params: { id }, body }) => {
    if (body.status !== undefined) {
      const agent = AgentService.updateStatus(id, body.status)
      if (!agent) throw status(404, "Agent not found")
      return agent
    }
    if (body.enabled !== undefined) {
      const agent = AgentService.updateEnabled(id, body.enabled)
      if (!agent) throw status(404, "Agent not found")
      return agent
    }
    throw status(400, "No valid fields to update")
  }, {
    body: AgentModel.updateBody,
    response: {
      200: AgentModel.response,
      404: AgentModel.errorNotFound,
    },
  })
  .get("/:agentId/health", async ({ params: { agentId }, query }) => {
    const result = await AgentService.healthCheck(agentId, {
      level: query.level as "basic" | "ping" | "full" || "basic",
      prompt: query.prompt,
    })
    if (!result.healthy && result.error?.includes("not found in PATH")) {
      throw status(404, `Agent CLI '${agentId}' not found`)
    }
    return result
  }, {
    query: t.Object({
      level: t.Optional(t.Union([t.Literal("basic"), t.Literal("ping"), t.Literal("full")])),
      prompt: t.Optional(t.String()),
    }),
    response: {
      200: AgentModel.healthResponse,
      404: t.Object({ error: t.String() }),
    },
  })
  .get("/:agentId/model", async ({ params: { agentId } }) => {
    return AgentService.getCurrentModel(agentId)
  }, {
    response: AgentModel.modelResponse,
  })
