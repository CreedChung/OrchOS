import { os } from "@/server/orpc/base";
import { OrganizationService } from "@/server/modules/organization/service";
import { getLocalDb } from "@/server/runtime/local-db";

export const organizationsRouter = {
  list: os.organizations.list.handler(async () => {
    return OrganizationService.list(await getLocalDb());
  }),
  get: os.organizations.get.handler(async ({ input }) => {
    const organization = await OrganizationService.get(await getLocalDb(), input.id);
    return organization ?? null;
  }),
  create: os.organizations.create.handler(async ({ input }) => {
    return OrganizationService.create(await getLocalDb(), input.name);
  }),
  update: os.organizations.update.handler(async ({ input }) => {
    const organization = await OrganizationService.update(await getLocalDb(), input.id, {
      name: input.name,
    });

    return organization ?? null;
  }),
  delete: os.organizations.delete.handler(async ({ input }) => {
    return { success: await OrganizationService.delete(await getLocalDb(), input.id) };
  }),
};
