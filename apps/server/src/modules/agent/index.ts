import { Elysia, t } from "elysia"
import { status } from "elysia"
import { AgentService } from "./service"
import { AgentModel } from "./model"

export const agentController = new Elysia({ prefix: "/api/agents" })
  .get("/", () => AgentService.list(), {
    response: t.Array(AgentModel.response),
  })
  .patch("/:id", ({ params: { id }, body }) => {
    const agent = AgentService.updateStatus(id, body.status)
    if (!agent) throw status(404, "Agent not found")
    return agent
  }, {
    body: AgentModel.updateBody,
    response: {
      200: AgentModel.response,
      404: AgentModel.errorNotFound,
    },
  })
