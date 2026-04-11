import { Elysia, t } from "elysia"
import { ActivityService } from "./service"
import { ActivityModel } from "./model"
import type { ActivityEntry } from "../../types"

export const activityController = new Elysia({ prefix: "/api" })
  .get("/activities", ({ query }) => {
    const limit = query.limit ? parseInt(query.limit as string) : 50
    return ActivityService.getAll(limit)
  }, {
    response: t.Array(ActivityModel.response),
  })
  .get("/goals/:goalId/activities", ({ params: { goalId } }) => {
    return ActivityService.getByGoal(goalId)
  }, {
    response: t.Array(ActivityModel.response),
  })
