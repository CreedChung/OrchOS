import { createFileRoute } from "@tanstack/react-router";
import { SettingsService } from "@/server/modules/settings/service";
import { getLocalDb } from "@/server/runtime/local-db";

let settingsServicePromise: Promise<SettingsService> | null = null;

function getSettingsService() {
  if (!settingsServicePromise) {
    settingsServicePromise = getLocalDb().then((db) => SettingsService.create(db));
  }

  return settingsServicePromise;
}

export const Route = createFileRoute("/api/settings")({
  server: {
    handlers: {
      GET: async () => {
        const service = await getSettingsService();
        return Response.json(service.get());
      },
      PATCH: async ({ request }) => {
        const patch = (await request.json()) as {
          autoCommit?: boolean;
          autoFix?: boolean;
          modelStrategy?: "local-first" | "cloud-first" | "adaptive";
        };
        const service = await getSettingsService();
        const updated = await service.update(patch);
        return Response.json(updated);
      },
    },
  },
});
