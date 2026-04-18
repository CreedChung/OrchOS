import { Elysia, t } from "elysia";
import { status } from "elysia";
import type { AppDb } from "../../db/types";
import { createEventBus } from "../event/event-bus";
import { GoalService } from "./service";
import { GoalModel } from "./model";
import { StateService } from "../state/service";

export function createGoalController(db: AppDb) {
  return new Elysia({ prefix: "/api/goals" })
    .get("/", async () => GoalService.list(db), {
      response: t.Array(GoalModel.response),
    })
    .post(
      "/",
      async ({ body }) => {
        const eventBus = createEventBus(db);
        const goal = await GoalService.create(db, eventBus, body);
        const defaultLabels = ["Tests", "Build", "Lint", "Review", "Deploy"];
        for (const label of defaultLabels) {
          StateService.createState(
            db,
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
      async ({ params: { goalId } }) => {
        const goal = await GoalService.get(db, goalId);
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
      async ({ params: { goalId }, body }) => {
        const eventBus = createEventBus(db);
        const goal = await GoalService.update(db, eventBus, goalId, body);
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
      async ({ params: { goalId } }) => {
        const eventBus = createEventBus(db);
        const deleted = await GoalService.delete(db, eventBus, goalId);
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
}
