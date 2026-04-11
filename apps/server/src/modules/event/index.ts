import { Elysia, t } from "elysia"
import { eventBus } from "./event-bus"
import { EventModel } from "./model"

export const eventController = new Elysia({ prefix: "/api" })
  .get("/events", ({ query }) => {
    const limit = query.limit ? parseInt(query.limit as string) : 50
    return eventBus.getHistory(query.goalId as string | undefined, limit)
  }, {
    response: t.Array(EventModel.response),
  })
  .get("/history", ({ query }) => {
    const goalId = query.goalId as string | undefined
    const limit = query.limit ? parseInt(query.limit as string) : 50
    const events = eventBus.getHistory(goalId, limit)
    return events.map(e => ({
      id: e.id,
      type: e.type,
      goalId: e.goalId,
      detail: e.payload,
      timestamp: e.timestamp,
    }))
  }, {
    response: t.Array(EventModel.historyResponse),
  })
