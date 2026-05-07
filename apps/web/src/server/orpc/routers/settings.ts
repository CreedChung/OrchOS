import { os } from "@/server/orpc/base";
import { SettingsService } from "@/server/modules/settings/service";
import { getLocalDb } from "@/server/runtime/local-db";

let settingsServicePromise: Promise<SettingsService> | null = null;

function getSettingsService() {
  if (!settingsServicePromise) {
    settingsServicePromise = getLocalDb().then((db) => SettingsService.create(db));
  }

  return settingsServicePromise;
}

export const settingsRouter = {
  get: os.settings.get.handler(async () => {
    const service = await getSettingsService();
    return service.get();
  }),
  update: os.settings.update.handler(async ({ input }) => {
    const service = await getSettingsService();
    return service.update(input);
  }),
};
