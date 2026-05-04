import { createFileRoute } from "@tanstack/react-router";
import { RuntimeService } from "@/server/modules/runtime/service";

export const Route = createFileRoute("/api/runtimes/$runtimeId/health")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const level = (url.searchParams.get("level") as "basic" | "ping" | "full" | null) || "basic";
        const prompt = url.searchParams.get("prompt") || undefined;
        const result = await RuntimeService.healthCheck(params.runtimeId, { level, prompt });
        return Response.json(result, { status: !result.healthy && result.error?.includes("not found in PATH") ? 404 : 200 });
      },
    },
  },
});
