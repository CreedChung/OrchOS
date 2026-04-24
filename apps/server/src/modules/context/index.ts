import { Elysia, t } from "elysia";

import { authPlugin, requireAuth } from "@/modules/auth";
import { ContextModel } from "@/modules/context/model";
import { ContextService } from "@/modules/context/service";

export const contextController = new Elysia({ prefix: "/api/context" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .post(
    "/snapshots",
    ({ body }) => {
      return ContextService.createSnapshot(body);
    },
    {
      body: ContextModel.createBody,
      response: ContextModel.snapshotResponse,
    },
  )
  .post(
    "/snapshots/derive",
    ({ body }) => {
      return ContextService.deriveSnapshot(body) || null;
    },
    {
      body: ContextModel.deriveBody,
      response: t.Nullable(ContextModel.snapshotResponse),
    },
  )
  .get(
    "/snapshots/:id",
    ({ params }) => {
      return ContextService.getSnapshot(params.id) || null;
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Nullable(ContextModel.snapshotResponse),
    },
  )
  .get(
    "/goals/:goalId/snapshots",
    ({ params }) => {
      return ContextService.listSnapshotsByGoal(params.goalId);
    },
    {
      params: t.Object({ goalId: t.String() }),
      response: t.Array(ContextModel.snapshotResponse),
    },
  )
  .get(
    "/diff",
    ({ query }) => {
      return ContextService.diffSnapshots(query.fromSnapshotId, query.toSnapshotId) || null;
    },
    {
      query: ContextModel.diffQuery,
      response: t.Nullable(ContextModel.diffResponse),
    },
  )
  .post(
    "/rollback",
    ({ body }) => {
      return ContextService.rollbackTo(body.snapshotId) || null;
    },
    {
      body: ContextModel.rollbackBody,
      response: t.Nullable(ContextModel.snapshotResponse),
    },
  )
  .get(
    "/memory/:scope/:scopeId",
    ({ params }) => {
      return ContextService.listMemory(params.scope, params.scopeId);
    },
    {
      params: t.Object({ scope: t.String(), scopeId: t.String() }),
      response: t.Array(ContextModel.memoryResponse),
    },
  );
