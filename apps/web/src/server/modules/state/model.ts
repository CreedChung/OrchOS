import { t, type UnwrapSchema } from "elysia";

export const StateModel = {
  createBody: t.Object({
    label: t.String(),
    status: t.String(),
    actions: t.Optional(t.Array(t.String())),
  }),
  updateBody: t.Object({
    status: t.String(),
  }),
  stateResponse: t.Object({
    id: t.String(),
    goalId: t.String(),
    label: t.String(),
    status: t.String(),
    actions: t.Optional(t.Array(t.String())),
    updatedAt: t.String(),
  }),
  artifactCreateBody: t.Object({
    name: t.String(),
    type: t.String(),
    status: t.String(),
    detail: t.Optional(t.String()),
  }),
  artifactUpdateBody: t.Partial(
    t.Object({
      status: t.String(),
      detail: t.String(),
    }),
  ),
  artifactResponse: t.Object({
    id: t.String(),
    goalId: t.String(),
    name: t.String(),
    type: t.String(),
    status: t.String(),
    detail: t.Optional(t.String()),
    updatedAt: t.String(),
    downloadUrl: t.Optional(t.String()),
  }),
  errorNotFound: t.Object({ error: t.Literal("not found") }),
  successDeleted: t.Object({ success: t.Literal(true) }),
} as const;

export type StateModel = {
  [k in keyof typeof StateModel]: UnwrapSchema<(typeof StateModel)[k]>;
};
