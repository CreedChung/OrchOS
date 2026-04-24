import { t } from "elysia";

export const ReflectionModel = {
  response: t.Object({
    id: t.String(),
    graphId: t.Optional(t.String()),
    nodeId: t.Optional(t.String()),
    attemptId: t.Optional(t.String()),
    kind: t.String(),
    summary: t.String(),
    details: t.Optional(t.Record(t.String(), t.Unknown())),
    createdAt: t.String(),
  }),
  patternResponse: t.Object({
    id: t.String(),
    signature: t.String(),
    firstSeenAt: t.String(),
    lastSeenAt: t.String(),
    occurrenceCount: t.Number(),
    exampleReflectionId: t.Optional(t.String()),
  }),
  strategyUpdateResponse: t.Object({
    id: t.String(),
    sourceReflectionId: t.Optional(t.String()),
    scope: t.String(),
    scopeId: t.Optional(t.String()),
    summary: t.String(),
    payload: t.Optional(t.Record(t.String(), t.Unknown())),
    createdAt: t.String(),
  }),
};
