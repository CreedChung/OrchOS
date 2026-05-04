import { createFileRoute } from "@tanstack/react-router";
import { createEventBus } from "@/server/modules/event/event-bus";
import { ExecutionService } from "@/server/modules/execution/service";
import { getLocalDb } from "@/server/runtime/local-db";

let settingsServicePromise: Promise<ExecutionService> | null = null;

function getSettingsService() {
  if (!settingsServicePromise) {
    const db = getLocalDb();
    settingsServicePromise = ExecutionService.create(db, createEventBus(db));
  }

  return settingsServicePromise;
}

export const Route = createFileRoute("/api/settings")({
  server: {
    handlers: {
      GET: async () => {
        const service = await getSettingsService();
        return Response.json(service.getSettings());
      },
      PATCH: async ({ request }) => {
        const patch = (await request.json()) as {
          autoCommit?: boolean;
          autoFix?: boolean;
          modelStrategy?: "local-first" | "cloud-first" | "adaptive";
        };
        const service = await getSettingsService();
        const updated = await service.updateSettings(patch);
        return Response.json(updated);
      },
    },
  },
});
