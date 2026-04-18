import { Elysia, t } from "elysia";
import type { AppDb } from "../../db/types";
import { ActivityService } from "./service";
import { ActivityModel } from "./model";

export function createActivityController(db: AppDb) {
  return new Elysia({ prefix: "/api" })
    .get(
      "/activities",
      async ({ query }) => {
        const limit = query.limit ? parseInt(query.limit as string) : 50;
        return await ActivityService.getAll(db, limit);
      },
      {
        response: t.Array(ActivityModel.response),
      },
    )
    .get(
      "/goals/:goalId/activities",
      async ({ params: { goalId } }) => {
        return await ActivityService.getByGoal(db, goalId);
      },
      {
        params: t.Object({ goalId: t.String() }),
        response: t.Array(ActivityModel.response),
      },
    );
}
