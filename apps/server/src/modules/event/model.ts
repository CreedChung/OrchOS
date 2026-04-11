import { t, type UnwrapSchema } from "elysia"

export const EventModel = {
  response: t.Object({
    id: t.String(),
    type: t.String(),
    goalId: t.Optional(t.String()),
    payload: t.Record(t.String(), t.Any()),
    timestamp: t.String(),
  }),
  historyResponse: t.Object({
    id: t.String(),
    type: t.String(),
    goalId: t.Optional(t.String()),
    detail: t.Record(t.String(), t.Any()),
    timestamp: t.String(),
  }),
} as const

export type EventModel = {
  [k in keyof typeof EventModel]: UnwrapSchema<typeof EventModel[k]>
}
