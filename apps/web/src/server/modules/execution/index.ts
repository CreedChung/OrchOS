import { Elysia } from "elysia";
import type { AppDb } from "../../db/types";
import { createEventBus } from "../event/event-bus";
import { ExecutionService } from "./service";
import { ExecutionModel } from "./model";
import type { ObjectStorageAdapter } from "../../cloudflare/object-storage";

export function createExecutionController(db: AppDb, artifactStorage?: ObjectStorageAdapter) {
  const enginePromise = ExecutionService.create(db, createEventBus(db), artifactStorage);

  return new Elysia({ prefix: "/api/goals/:goalId" })
    .post(
      "/actions",
      async ({ params: { goalId }, body }) => {
        const engine = await enginePromise;
        return engine.executeAction(goalId, body.action, body.stateId, body.agentId);
      },
      {
        body: ExecutionModel.actionBody,
        response: ExecutionModel.actionResponse,
      },
    )
    .post(
      "/loop",
      async ({ params: { goalId } }) => {
        const engine = await enginePromise;
        await engine.runGoalLoop(goalId);
        return { success: true };
      },
      {
        response: ExecutionModel.loopResponse,
      },
    );
}

export function createSettingsController(db: AppDb) {
  const enginePromise = ExecutionService.create(db, createEventBus(db));

  return new Elysia({ prefix: "/api/settings" })
    .get(
      "/",
      async () => {
        const engine = await enginePromise;
        return engine.getSettings();
      },
      {
        response: ExecutionModel.settingsResponse,
      },
    )
    .patch(
      "/",
      async ({ body }) => {
        const engine = await enginePromise;
        return engine.updateSettings(body);
      },
      {
        body: ExecutionModel.settingsUpdateBody,
        response: ExecutionModel.settingsResponse,
      },
    );
}
