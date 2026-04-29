import { t, type UnwrapSchema } from "elysia";

export const ProjectModel = {
  createBody: t.Object({
    name: t.String(),
    path: t.String(),
    repositoryUrl: t.Optional(t.String()),
  }),
  updateBody: t.Partial(
    t.Object({
      name: t.String(),
      path: t.String(),
      repositoryUrl: t.Optional(t.String()),
    }),
  ),
  response: t.Object({
    id: t.String(),
    name: t.String(),
    path: t.String(),
    repositoryUrl: t.Optional(t.String()),
    createdAt: t.String(),
  }),
  errorNotFound: t.Object({ error: t.Literal("Project not found") }),
  successDeleted: t.Object({ success: t.Literal(true) }),
  cloneResponse: t.Object({
    success: t.Boolean(),
    output: t.String(),
    error: t.Optional(t.String()),
    path: t.String(),
  }),
  cloneBody: t.Object({
    force: t.Optional(t.Boolean()),
  }),
  previewStartResponse: t.Object({
    projectId: t.String(),
    running: t.Boolean(),
    command: t.Optional(t.String()),
    url: t.Optional(t.String()),
    port: t.Optional(t.Number()),
    pid: t.Optional(t.Number()),
    startedAt: t.Optional(t.String()),
    logs: t.Optional(t.String()),
    error: t.Optional(t.String()),
  }),
} as const;

export type ProjectModel = {
  [k in keyof typeof ProjectModel]: UnwrapSchema<(typeof ProjectModel)[k]>;
};
