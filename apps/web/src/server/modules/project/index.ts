import { Elysia, t } from "elysia";
import { status } from "elysia";
import type { AppDb } from "../../db/types";
import { ProjectService } from "./service";
import { ProjectModel } from "./model";

export function createProjectController(db: AppDb) {
  return new Elysia({ prefix: "/api/projects" })
    .get("/", async () => await ProjectService.list(db), {
      response: t.Array(ProjectModel.response),
    })
    .post(
      "/",
      async ({ body }) => {
        return await ProjectService.create(db, body.name, body.path, body.repositoryUrl);
      },
      {
        body: ProjectModel.createBody,
        response: ProjectModel.response,
      },
    )
    .get(
      "/:id",
      async ({ params: { id } }) => {
        const project = await ProjectService.get(db, id);
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
      async ({ params: { id }, body }) => {
        const project = await ProjectService.update(db, id, body);
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
      async ({ params: { id } }) => {
        const deleted = await ProjectService.delete(db, id);
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
        const result = await ProjectService.clone(db, id, { force: body?.force });
        return result;
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Optional(ProjectModel.cloneBody),
        response: ProjectModel.cloneResponse,
      },
    );
}
