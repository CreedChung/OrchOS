import { os } from "@/server/orpc/base";
import { ProjectService } from "@/server/modules/project/service";
import { getLocalDb } from "@/server/runtime/local-db";

export const projectsRouter = {
  list: os.projects.list.handler(async () => {
    return ProjectService.list(await getLocalDb());
  }),
  get: os.projects.get.handler(async ({ input }) => {
    const project = await ProjectService.get(await getLocalDb(), input.id);
    return project ?? null;
  }),
  create: os.projects.create.handler(async ({ input }) => {
    return ProjectService.create(await getLocalDb(), input.name, input.path, input.repositoryUrl);
  }),
  update: os.projects.update.handler(async ({ input }) => {
    const project = await ProjectService.update(await getLocalDb(), input.id, {
      name: input.name,
      path: input.path,
      repositoryUrl: input.repositoryUrl,
    });

    return project ?? null;
  }),
  delete: os.projects.delete.handler(async ({ input }) => {
    return { success: await ProjectService.delete(await getLocalDb(), input.id) };
  }),
};
