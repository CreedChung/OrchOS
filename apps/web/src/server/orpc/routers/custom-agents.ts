import { os } from "@/server/orpc/base";
import { CustomAgentService } from "@/server/modules/custom-agents/service";
import { getLocalDb } from "@/server/runtime/local-db";

export const customAgentsRouter = {
  list: os.customAgents.list.handler(async () => {
    const service = new CustomAgentService(await getLocalDb());
    return service.list();
  }),
  create: os.customAgents.create.handler(async ({ input }) => {
    const service = new CustomAgentService(await getLocalDb());
    return service.create(input);
  }),
  update: os.customAgents.update.handler(async ({ input }) => {
    const service = new CustomAgentService(await getLocalDb());
    return service.update(input.id, {
      name: input.name,
      url: input.url,
      apiKey: input.apiKey,
      model: input.model,
    });
  }),
  delete: os.customAgents.delete.handler(async ({ input }) => {
    const service = new CustomAgentService(await getLocalDb());
    return service.remove(input.id);
  }),
};
