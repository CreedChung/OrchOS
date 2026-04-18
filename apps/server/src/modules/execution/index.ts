import { Elysia, t } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { ExecutionService } from "@/modules/execution/service";
import { ExecutionModel } from "@/modules/execution/model";

const engine = new ExecutionService();

export const executionController = new Elysia({ prefix: "/api/goals/:goalId" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .post(
    "/actions",
    async ({ params: { goalId }, body }) => {
      return engine.executeAction(goalId, body.action, body.stateId, body.agentId);
    },
    {
      params: t.Object({ goalId: t.String() }),
      body: ExecutionModel.actionBody,
      response: ExecutionModel.actionResponse,
    },
  )
  .post(
    "/loop",
    async ({ params: { goalId } }) => {
      await engine.runGoalLoop(goalId);
      return { success: true };
    },
    {
      params: t.Object({ goalId: t.String() }),
      response: ExecutionModel.loopResponse,
    },
  );

export const settingsController = new Elysia({ prefix: "/api/settings" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get("/", () => engine.getSettings(), {
    response: ExecutionModel.settingsResponse,
  })
  .patch(
    "/",
    ({ body }) => {
      return engine.updateSettings(body);
    },
    {
      body: ExecutionModel.settingsUpdateBody,
      response: ExecutionModel.settingsResponse,
    },
  );

export { engine as executionService };
