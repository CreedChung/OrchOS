import { Elysia, t } from "elysia";
import { status } from "elysia";
import { StateService } from "./service";
import { StateModel } from "./model";
import type { AppDb } from "../../db/types";
import { createEventBus } from "../event/event-bus";

export function createStateController(db: AppDb) {
  return new Elysia({ prefix: "/api/goals/:goalId" })
    .get("/states", ({ params: { goalId } }) => StateService.getStatesByGoal(db, goalId), {
      response: t.Array(StateModel.stateResponse),
    })
    .post(
      "/states",
      ({ params: { goalId }, body }) =>
        StateService.createState(db, goalId, body.label, body.status as any, body.actions),
      {
        body: StateModel.createBody,
        response: StateModel.stateResponse,
      },
    )
    .get("/artifacts", ({ params: { goalId } }) => StateService.getArtifactsByGoal(db, goalId), {
      response: t.Array(StateModel.artifactResponse),
    })
    .post(
      "/artifacts",
      ({ params: { goalId }, body }) =>
        StateService.createArtifact(
          db,
          goalId,
          body.name,
          body.type as any,
          body.status as any,
          body.detail,
        ),
      {
        body: StateModel.artifactCreateBody,
        response: StateModel.artifactResponse,
      },
    );
}

export function createStateItemController(db: AppDb) {
  return new Elysia({ prefix: "/api/states" })
    .patch(
      "/:id",
      async ({ params: { id }, body }) => {
        const eventBus = createEventBus(db);
        const state = await StateService.updateState(db, eventBus, id, body.status as any);
        if (!state) throw status(404, "not found");
        return state;
      },
      {
        body: StateModel.updateBody,
        response: {
          200: StateModel.stateResponse,
          404: StateModel.errorNotFound,
        },
      },
    )
    .delete(
      "/:id",
      async ({ params: { id } }) => {
        const deleted = await StateService.deleteState(db, id);
        if (!deleted) throw status(404, "not found");
        return { success: true };
      },
      {
        response: {
          200: StateModel.successDeleted,
          404: StateModel.errorNotFound,
        },
      },
    );
}

export function createArtifactItemController(db: AppDb) {
  return new Elysia({ prefix: "/api/artifacts" }).patch(
    "/:id",
    async ({ params: { id }, body }) => {
      const artifact = await StateService.updateArtifact(db, id, body);
      if (!artifact) throw status(404, "not found");
      return artifact;
    },
    {
      body: StateModel.artifactUpdateBody,
      response: {
        200: StateModel.artifactResponse,
        404: StateModel.errorNotFound,
      },
    },
  );
}
