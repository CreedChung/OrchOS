import { Elysia, t } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { ActivityService } from "@/modules/activity/service";
import { ActivityModel } from "@/modules/activity/model";

export const activityController = new Elysia({ prefix: "/api" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get(
    "/activities",
    ({ query }) => {
      const limit = query.limit ? parseInt(query.limit as string) : 50;
      return ActivityService.getAll(limit);
    },
    {
      response: t.Array(ActivityModel.response),
    },
  )
  .get(
    "/goals/:goalId/activities",
    ({ params: { goalId } }) => {
      return ActivityService.getByGoal(goalId);
    },
    {
      params: t.Object({ goalId: t.String() }),
      response: t.Array(ActivityModel.response),
    },
  );
