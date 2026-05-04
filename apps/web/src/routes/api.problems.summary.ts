import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { ProblemService } from "@/server/modules/problem/service";

export const Route = createFileRoute("/api/problems/summary")({
  server: {
    handlers: {
      GET: async () => Response.json(await ProblemService.summarize(await getLocalDb())),
    },
  },
});
