import { Elysia, t } from "elysia";
import { createEventBus } from "./event-bus";
import { EventModel } from "./model";
import type { AppDb } from "../../db/types";

export function createEventController(db: AppDb) {
  return new Elysia({ prefix: "/api" })
    .get(
      "/events",
      async ({ query }) => {
        const eventBus = createEventBus(db);
        const limit = query.limit ? parseInt(query.limit as string) : 50;
        return await eventBus.getHistory(query.goalId as string | undefined, limit);
      },
      {
        query: t.Object({
          goalId: t.Optional(t.String()),
          limit: t.Optional(t.String()),
        }),
        response: t.Array(EventModel.response),
      },
    )
    .get(
      "/history",
      async ({ query }) => {
        const goalId = query.goalId as string | undefined;
        const limit = query.limit ? parseInt(query.limit as string) : 50;
        const eventBus = createEventBus(db);
        const events = await eventBus.getHistory(goalId, limit);
        return events.map((e: any) => ({
          id: e.id,
          type: e.type,
          goalId: e.goalId,
          detail: e.payload,
          timestamp: e.timestamp,
        }));
      },
      {
        query: t.Object({
          goalId: t.Optional(t.String()),
          limit: t.Optional(t.String()),
        }),
        response: t.Array(EventModel.historyResponse),
      },
    );
}
