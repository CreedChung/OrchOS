import { Elysia, t } from "elysia";
import { status } from "elysia";
import { StateService } from "./service";
import { StateModel } from "./model";

export const stateController = new Elysia({ prefix: "/api/goals/:goalId" })
  .requireAuth(true)
  .get("/states", ({ params: { goalId } }) => StateService.getStatesByGoal(goalId), {
    response: t.Array(StateModel.stateResponse),
  })
  .post(
    "/states",
    ({ params: { goalId }, body }) => {
      return StateService.createState(goalId, body.label, body.status as any, body.actions);
    },
    {
      body: StateModel.createBody,
      response: StateModel.stateResponse,
    },
  )
  .get("/artifacts", ({ params: { goalId } }) => StateService.getArtifactsByGoal(goalId), {
    response: t.Array(StateModel.artifactResponse),
  })
  .post(
    "/artifacts",
    ({ params: { goalId }, body }) => {
      return StateService.createArtifact(
        goalId,
        body.name,
        body.type as any,
        body.status as any,
        body.detail,
      );
    },
    {
      body: StateModel.artifactCreateBody,
      response: StateModel.artifactResponse,
    },
  );

export const stateItemController = new Elysia({ prefix: "/api/states" })
  .requireAuth(true)
  .patch(
    "/:id",
    ({ params: { id }, body }) => {
      const state = StateService.updateState(id, body.status as any);
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
    ({ params: { id } }) => {
      const deleted = StateService.deleteState(id);
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

export const artifactItemController = new Elysia({ prefix: "/api/artifacts" })
  .requireAuth(true)
  .patch(
  "/:id",
  ({ params: { id }, body }) => {
    const artifact = StateService.updateArtifact(id, body);
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
