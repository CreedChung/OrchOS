import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { RuntimeService } from "@/server/modules/runtime/service";

export const Route = createFileRoute("/api/runtimes/detect/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { runtimeIds?: string[]; registerAll?: boolean };
        const db = getLocalDb();
        const detected = await RuntimeService.detect();
        const registered = [];
        const skipped = [];

        for (const runtime of detected.available) {
          if ((body.runtimeIds && body.runtimeIds.includes(runtime.id)) || body.registerAll) {
            const existing = await RuntimeService.getByName(db, runtime.name);
            if (existing) {
              skipped.push(runtime);
            } else {
              const profile = await RuntimeService.registerFromDetection(db, runtime);
              if (profile) registered.push(profile);
            }
          }
        }

        return Response.json({ registered, skipped });
      },
    },
  },
});
