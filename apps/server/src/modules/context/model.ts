import { t } from "elysia";

export const ContextModel = {
  snapshotResponse: t.Object({
    id: t.String(),
    parentSnapshotId: t.Optional(t.String()),
    goalId: t.Optional(t.String()),
    graphId: t.Optional(t.String()),
    attemptId: t.Optional(t.String()),
    kind: t.String(),
    payload: t.Record(t.String(), t.Unknown()),
    createdAt: t.String(),
  }),
  diffResponse: t.Object({
    id: t.String(),
    fromSnapshotId: t.String(),
    toSnapshotId: t.String(),
    patch: t.Record(t.String(), t.Unknown()),
    createdAt: t.String(),
  }),
  memoryResponse: t.Object({
    id: t.String(),
    scope: t.String(),
    scopeId: t.String(),
    key: t.String(),
    value: t.Record(t.String(), t.Unknown()),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
  createBody: t.Object({
    goalId: t.Optional(t.String()),
    graphId: t.Optional(t.String()),
    attemptId: t.Optional(t.String()),
    kind: t.Optional(t.String()),
    payload: t.Record(t.String(), t.Unknown()),
  }),
  deriveBody: t.Object({
    parentSnapshotId: t.String(),
    goalId: t.Optional(t.String()),
    graphId: t.Optional(t.String()),
    attemptId: t.Optional(t.String()),
    kind: t.Optional(t.String()),
    patch: t.Record(t.String(), t.Unknown()),
  }),
  diffQuery: t.Object({
    fromSnapshotId: t.String(),
    toSnapshotId: t.String(),
  }),
  rollbackBody: t.Object({
    snapshotId: t.String(),
  }),
};
