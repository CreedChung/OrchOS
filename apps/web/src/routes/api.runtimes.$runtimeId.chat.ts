import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { RuntimeService } from "@/server/modules/runtime/service";

export const Route = createFileRoute("/api/runtimes/$runtimeId/chat")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const body = (await request.json()) as { prompt: string };
        const result = await RuntimeService.chat(getLocalDb(), params.runtimeId, body.prompt);
        return Response.json(result, { status: !result.success && result.error?.includes("not found") ? 404 : 200 });
      },
    },
  },
});
