import { os } from "@/server/orpc/base";
import { ProblemService } from "@/server/modules/problem/service";
import { getLocalDb } from "@/server/runtime/local-db";

export const problemsRouter = {
  list: os.problems.list.handler(async ({ input }) => {
    return ProblemService.list(await getLocalDb(), input);
  }),
  get: os.problems.get.handler(async ({ input }) => {
    return ProblemService.get(await getLocalDb(), input.id);
  }),
  counts: os.problems.counts.handler(async () => {
    return ProblemService.countByStatus(await getLocalDb());
  }),
  summary: os.problems.summary.handler(async () => {
    return ProblemService.summarize(await getLocalDb());
  }),
  create: os.problems.create.handler(async ({ input }) => {
    return ProblemService.create(await getLocalDb(), input);
  }),
  update: os.problems.update.handler(async ({ input }) => {
    const problem = await ProblemService.update(await getLocalDb(), input.id, {
      title: input.title,
      priority: input.priority,
      status: input.status,
      source: input.source,
      context: input.context,
    });

    return problem ?? null;
  }),
  delete: os.problems.delete.handler(async ({ input }) => {
    return { success: await ProblemService.delete(await getLocalDb(), input.id) };
  }),
  bulkUpdate: os.problems.bulkUpdate.handler(async ({ input }) => {
    const updated = await ProblemService.bulkUpdate(await getLocalDb(), input.ids, {
      status: input.status,
    });

    return { updated };
  }),
};
