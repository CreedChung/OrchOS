import { Elysia, t } from "elysia"
import { status } from "elysia"
import { ProblemService } from "./service"

const ProblemResponse = t.Object({
  id: t.String(),
  title: t.String(),
  priority: t.Union([t.Literal("critical"), t.Literal("warning"), t.Literal("info")]),
  source: t.Nullable(t.String()),
  context: t.Nullable(t.String()),
  goalId: t.Nullable(t.String()),
  stateId: t.Nullable(t.String()),
  status: t.Union([t.Literal("open"), t.Literal("fixed"), t.Literal("ignored"), t.Literal("assigned")]),
  actions: t.Array(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
})

export const problemController = new Elysia({ prefix: "/api/problems" })
  .get("/", ({ query }) => {
    const filters: { status?: any; priority?: any } = {}
    if (query.status) filters.status = query.status as any
    if (query.priority) filters.priority = query.priority as any
    return ProblemService.list(Object.keys(filters).length > 0 ? filters : undefined)
  }, {
    response: t.Array(ProblemResponse),
  })
  .get("/counts", () => ProblemService.countByStatus(), {
    response: t.Object({
      open: t.Number(),
      fixed: t.Number(),
      ignored: t.Number(),
      assigned: t.Number(),
    }),
  })
  .post("/", ({ body }) => {
    return ProblemService.create(body)
  }, {
    body: t.Object({
      title: t.String(),
      priority: t.Optional(t.Union([t.Literal("critical"), t.Literal("warning"), t.Literal("info")])),
      source: t.Optional(t.String()),
      context: t.Optional(t.String()),
      goalId: t.Optional(t.String()),
      stateId: t.Optional(t.String()),
      actions: t.Optional(t.Array(t.String())),
    }),
    response: ProblemResponse,
  })
  .get("/:id", ({ params: { id } }) => {
    const problem = ProblemService.get(id)
    if (!problem) throw status(404, "Problem not found")
    return problem
  }, {
    response: {
      200: ProblemResponse,
      404: t.String(),
    },
  })
  .patch("/:id", ({ params: { id }, body }) => {
    const problem = ProblemService.update(id, body)
    if (!problem) throw status(404, "Problem not found")
    return problem
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      priority: t.Optional(t.Union([t.Literal("critical"), t.Literal("warning"), t.Literal("info")])),
      status: t.Optional(t.Union([t.Literal("open"), t.Literal("fixed"), t.Literal("ignored"), t.Literal("assigned")])),
      source: t.Optional(t.String()),
      context: t.Optional(t.String()),
    }),
    response: {
      200: ProblemResponse,
      404: t.String(),
    },
  })
  .delete("/:id", ({ params: { id } }) => {
    const deleted = ProblemService.delete(id)
    if (!deleted) throw status(404, "Problem not found")
    return { success: true }
  }, {
    response: {
      200: t.Object({ success: t.Boolean() }),
      404: t.String(),
    },
  })
  .post("/bulk", ({ body }) => {
    const count = ProblemService.bulkUpdate(body.ids, { status: body.status })
    return { updated: count }
  }, {
    body: t.Object({
      ids: t.Array(t.String()),
      status: t.Union([t.Literal("open"), t.Literal("fixed"), t.Literal("ignored"), t.Literal("assigned")]),
    }),
    response: t.Object({ updated: t.Number() }),
  })
