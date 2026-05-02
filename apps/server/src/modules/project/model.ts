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
  gitBranchInfo: t.Object({
    name: t.String(),
    current: t.Boolean(),
  }),
  gitStatusResponse: t.Object({
    projectId: t.String(),
    branch: t.String(),
    branches: t.Array(
      t.Object({
        name: t.String(),
        current: t.Boolean(),
      }),
    ),
    modified: t.Array(t.String()),
    staged: t.Array(t.String()),
    untracked: t.Array(t.String()),
    isGitRepo: t.Boolean(),
    error: t.Optional(t.String()),
  }),
  switchBranchBody: t.Object({
    branch: t.String(),
  }),
  commandResultResponse: t.Object({
    success: t.Boolean(),
    output: t.String(),
    error: t.Optional(t.String()),
  }),
  commitActivityDay: t.Object({
    date: t.String(),
    count: t.Number(),
    level: t.Number(),
  }),
  commitActivityResponse: t.Object({
    projectId: t.String(),
    totalCommits: t.Number(),
    activeDays: t.Number(),
    maxCommitsPerDay: t.Number(),
    days: t.Array(
      t.Object({
        date: t.String(),
        count: t.Number(),
        level: t.Number(),
      }),
    ),
    recentCommits: t.Array(
      t.Object({
        hash: t.String(),
        message: t.String(),
        author: t.String(),
        date: t.String(),
      }),
    ),
    isGitRepo: t.Boolean(),
    error: t.Optional(t.String()),
  }),
} as const;

export type ProjectModel = {
  [k in keyof typeof ProjectModel]: UnwrapSchema<(typeof ProjectModel)[k]>;
};
