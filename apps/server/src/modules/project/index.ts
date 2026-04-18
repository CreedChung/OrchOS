import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { ProjectService } from "@/modules/project/service";
import { ProjectModel } from "@/modules/project/model";

export const projectController = new Elysia({ prefix: "/api/projects" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get("/", () => ProjectService.list(), {
    response: t.Array(ProjectModel.response),
  })
  .post(
    "/",
    ({ body }) => {
      return ProjectService.create(body.name, body.path, body.repositoryUrl);
    },
    {
      body: ProjectModel.createBody,
      response: ProjectModel.response,
    },
  )
  .get(
    "/:id",
    ({ params: { id } }) => {
      const project = ProjectService.get(id);
      if (!project) throw status(404, "Project not found");
      return project;
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: ProjectModel.response,
        404: ProjectModel.errorNotFound,
      },
    },
  )
  .patch(
    "/:id",
    ({ params: { id }, body }) => {
      const project = ProjectService.update(id, body);
      if (!project) throw status(404, "Project not found");
      return project;
    },
    {
      params: t.Object({ id: t.String() }),
      body: ProjectModel.updateBody,
      response: {
        200: ProjectModel.response,
        404: ProjectModel.errorNotFound,
      },
    },
  )
  .delete(
    "/:id",
    ({ params: { id } }) => {
      const deleted = ProjectService.delete(id);
      if (!deleted) throw status(404, "Project not found");
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: ProjectModel.successDeleted,
        404: ProjectModel.errorNotFound,
      },
    },
  )
  .post(
    "/:id/clone",
    async ({ params: { id }, body }) => {
      const result = await ProjectService.clone(id, { force: body?.force });
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Optional(ProjectModel.cloneBody),
      response: ProjectModel.cloneResponse,
    },
  );
