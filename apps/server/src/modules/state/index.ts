import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { StateService } from "@/modules/state/service";
import { StateModel } from "@/modules/state/model";

export const stateController = new Elysia({ prefix: "/api/goals/:goalId" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get("/states", ({ params: { goalId } }) => StateService.getStatesByGoal(goalId), {
    params: t.Object({ goalId: t.String() }),
    response: t.Array(StateModel.stateResponse),
  })
  .post(
    "/states",
    ({ params: { goalId }, body }) => {
      return StateService.createState(goalId, body.label, body.status as any, body.actions);
    },
    {
      params: t.Object({ goalId: t.String() }),
      body: StateModel.createBody,
      response: StateModel.stateResponse,
    },
  )
  .get("/artifacts", ({ params: { goalId } }) => StateService.getArtifactsByGoal(goalId), {
    params: t.Object({ goalId: t.String() }),
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
      params: t.Object({ goalId: t.String() }),
      body: StateModel.artifactCreateBody,
      response: StateModel.artifactResponse,
    },
  );

export const stateItemController = new Elysia({ prefix: "/api/states" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .patch(
    "/:id",
    ({ params: { id }, body }) => {
      const state = StateService.updateState(id, body.status as any);
      if (!state) throw status(404, "not found");
      return state;
    },
    {
      params: t.Object({ id: t.String() }),
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
      params: t.Object({ id: t.String() }),
      response: {
        200: StateModel.successDeleted,
        404: StateModel.errorNotFound,
      },
    },
  );

export const artifactItemController = new Elysia({ prefix: "/api/artifacts" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .patch(
  "/:id",
  ({ params: { id }, body }) => {
    const artifact = StateService.updateArtifact(id, body);
    if (!artifact) throw status(404, "not found");
    return artifact;
  },
  {
    params: t.Object({ id: t.String() }),
    body: StateModel.artifactUpdateBody,
    response: {
      200: StateModel.artifactResponse,
      404: StateModel.errorNotFound,
    },
  },
);
