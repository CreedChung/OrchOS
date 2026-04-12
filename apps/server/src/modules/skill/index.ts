import { Elysia, t } from "elysia"
import { status } from "elysia"
import { SkillService } from "./service"
import { SkillModel } from "./model"

export const skillController = new Elysia({ prefix: "/api/skills" })
  .get("/", ({ query }) => {
    return SkillService.list({
      projectId: query.projectId,
      organizationId: query.organizationId,
      scope: query.scope as "global" | "project" | undefined,
    })
  }, {
    query: SkillModel.listQuery,
    response: t.Array(SkillModel.response),
  })
  .get("/:id", ({ params: { id } }) => {
    const skill = SkillService.get(id)
    if (!skill) throw status(404, "Skill not found")
    return skill
  }, {
    params: t.Object({ id: t.String() }),
    response: {
      200: SkillModel.response,
      404: t.Object({ error: t.String() }),
    },
  })
  .post("/", ({ body }) => {
    return SkillService.create({
      name: body.name,
      description: body.description,
      scope: body.scope,
      projectId: body.projectId,
      organizationId: body.organizationId,
    })
  }, {
    body: SkillModel.createBody,
    response: SkillModel.response,
  })
  .patch("/:id", ({ params: { id }, body }) => {
    const skill = SkillService.update(id, {
      name: body.name,
      description: body.description,
      enabled: body.enabled,
      scope: body.scope,
    })
    if (!skill) throw status(404, "Skill not found")
    return skill
  }, {
    params: t.Object({ id: t.String() }),
    body: SkillModel.updateBody,
    response: {
      200: SkillModel.response,
      404: t.Object({ error: t.String() }),
    },
  })
  .delete("/:id", ({ params: { id } }) => {
    const deleted = SkillService.delete(id)
    if (!deleted) throw status(404, "Skill not found")
    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    response: {
      200: t.Object({ success: t.Boolean() }),
      404: t.Object({ error: t.String() }),
    },
  })
  .post("/:id/toggle", ({ params: { id }, body }) => {
    const skill = SkillService.toggleEnabled(id, body.enabled)
    if (!skill) throw status(404, "Skill not found")
    return skill
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ enabled: t.Boolean() }),
    response: {
      200: SkillModel.response,
      404: t.Object({ error: t.String() }),
    },
  })
