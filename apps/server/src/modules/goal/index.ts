import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { GoalService } from "@/modules/goal/service";
import { GoalModel } from "@/modules/goal/model";
import { StateService } from "@/modules/state/service";

export const goalController = new Elysia({ prefix: "/api/goals" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get("/", () => GoalService.list(), {
    response: t.Array(GoalModel.response),
  })
  .post(
    "/",
    ({ body }) => {
      const goal = GoalService.create(body);
      const defaultLabels = ["Tests", "Build", "Lint", "Review", "Deploy"];
      for (const label of defaultLabels) {
        StateService.createState(
          goal.id,
          label,
          "pending",
          label === "Tests" ? ["Fix", "Ignore"] : undefined,
        );
      }
      return goal;
    },
    {
      body: GoalModel.createBody,
      response: GoalModel.response,
    },
  )
  .get(
    "/:goalId",
    ({ params: { goalId } }) => {
      const goal = GoalService.get(goalId);
      if (!goal) throw status(404, "Goal not found");
      return goal;
    },
    {
      params: t.Object({ goalId: t.String() }),
      response: {
        200: GoalModel.response,
        404: GoalModel.errorNotFound,
      },
    },
  )
  .patch(
    "/:goalId",
    ({ params: { goalId }, body }) => {
      const goal = GoalService.update(goalId, body);
      if (!goal) throw status(404, "Goal not found");
      return goal;
    },
    {
      params: t.Object({ goalId: t.String() }),
      body: GoalModel.updateBody,
      response: {
        200: GoalModel.response,
        404: GoalModel.errorNotFound,
      },
    },
  )
  .delete(
    "/:goalId",
    ({ params: { goalId } }) => {
      const deleted = GoalService.delete(goalId);
      if (!deleted) throw status(404, "Goal not found");
      return { success: true };
    },
    {
      params: t.Object({ goalId: t.String() }),
      response: {
        200: GoalModel.successDeleted,
        404: GoalModel.errorNotFound,
      },
    },
  );
