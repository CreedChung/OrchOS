import { Elysia } from "elysia"
import { ExecutionService } from "./service"
import { ExecutionModel } from "./model"

const engine = new ExecutionService()

export const executionController = new Elysia({ prefix: "/api/goals/:goalId" })
  .post("/actions", async ({ params: { goalId }, body }) => {
    return engine.executeAction(goalId, body.action, body.stateId, body.agentId)
  }, {
    body: ExecutionModel.actionBody,
    response: ExecutionModel.actionResponse,
  })
  .post("/loop", async ({ params: { goalId } }) => {
    await engine.runGoalLoop(goalId)
    return { success: true }
  }, {
    response: ExecutionModel.loopResponse,
  })

export const settingsController = new Elysia({ prefix: "/api/settings" })
  .get("/", () => engine.getSettings(), {
    response: ExecutionModel.settingsResponse,
  })
  .patch("/", ({ body }) => {
    return engine.updateSettings(body)
  }, {
    body: ExecutionModel.settingsUpdateBody,
    response: ExecutionModel.settingsResponse,
  })

export { engine as executionService }
