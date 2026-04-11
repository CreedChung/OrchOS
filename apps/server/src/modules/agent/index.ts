import { Elysia, t } from "elysia"
import { status } from "elysia"
import { AgentService } from "./service"
import { AgentModel } from "./model"

export const agentController = new Elysia({ prefix: "/api/agents" })
  .get("/", () => AgentService.list(), {
    response: t.Array(AgentModel.response),
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
