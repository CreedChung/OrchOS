import { Elysia, t } from "elysia"
import { status } from "elysia"
import { ProjectService } from "./service"
import { ProjectModel } from "./model"

export const projectController = new Elysia({ prefix: "/api/projects" })
  .get("/", () => ProjectService.list(), {
    response: t.Array(ProjectModel.response),
  })
  .post("/", ({ body }) => {
    return ProjectService.create(body.name, body.path, body.repositoryUrl)
  }, {
    body: ProjectModel.createBody,
    response: ProjectModel.response,
  })
  .get("/:id", ({ params: { id } }) => {
    const project = ProjectService.get(id)
    if (!project) throw status(404, "Project not found")
    return project
  }, {
    response: {
      200: ProjectModel.response,
      404: ProjectModel.errorNotFound,
    },
  })
  .patch("/:id", ({ params: { id }, body }) => {
    const project = ProjectService.update(id, body)
    if (!project) throw status(404, "Project not found")
    return project
  }, {
    body: ProjectModel.updateBody,
    response: {
      200: ProjectModel.response,
      404: ProjectModel.errorNotFound,
    },
  })
  .delete("/:id", ({ params: { id } }) => {
    const deleted = ProjectService.delete(id)
    if (!deleted) throw status(404, "Project not found")
    return { success: true }
  }, {
    response: {
      200: ProjectModel.successDeleted,
      404: ProjectModel.errorNotFound,
    },
  })
