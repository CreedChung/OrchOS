import { Elysia, t } from "elysia";
import { status } from "elysia";
import type { AppDb } from "../../db/types";
import { createEventBus } from "../event/event-bus";
import { CommandService } from "./service";
import { GoalService } from "../goal/service";
import { AgentService } from "../agent/service";
import { ActivityService } from "../activity/service";

const CommandResponse = t.Object({
  id: t.String(),
  instruction: t.String(),
  agentNames: t.Array(t.String()),
  projectIds: t.Array(t.String()),
  goalId: t.Nullable(t.String()),
  status: t.Union([
    t.Literal("sent"),
    t.Literal("executing"),
    t.Literal("completed"),
    t.Literal("failed"),
  ]),
  createdAt: t.String(),
});

export function createCommandController(db: AppDb) {
  return new Elysia({ prefix: "/api/commands" })
    .get(
      "/",
      async () => {
        return await CommandService.list(db);
      },
      {
        response: t.Array(CommandResponse),
      },
    )
    .post(
      "/",
      async ({ body }) => {
        const eventBus = createEventBus(db);
        void GoalService;
        void AgentService;
        void ActivityService;
        return await CommandService.create(db, eventBus, body);
      },
      {
        body: t.Object({
          instruction: t.String(),
          agentNames: t.Optional(t.Array(t.String())),
          projectIds: t.Optional(t.Array(t.String())),
        }),
        response: CommandResponse,
      },
    )
    .get(
      "/:id",
      async ({ params: { id } }) => {
        const command = await CommandService.get(db, id);
        if (!command) throw status(404, "Command not found");
        return command;
      },
      {
        params: t.Object({ id: t.String() }),
        response: {
          200: CommandResponse,
          404: t.String(),
        },
      },
    )
    .patch(
      "/:id",
      async ({ params: { id }, body }) => {
        const command = await CommandService.update(db, id, body);
        if (!command) throw status(404, "Command not found");
        return command;
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          status: t.Optional(
            t.Union([
              t.Literal("sent"),
              t.Literal("executing"),
              t.Literal("completed"),
              t.Literal("failed"),
            ]),
          ),
          goalId: t.Optional(t.String()),
        }),
        response: {
          200: CommandResponse,
          404: t.String(),
        },
      },
    )
    .delete(
      "/:id",
      async ({ params: { id } }) => {
        const deleted = await CommandService.delete(db, id);
        if (!deleted) throw status(404, "Command not found");
        return { success: true };
      },
      {
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ success: t.Boolean() }),
          404: t.String(),
        },
      },
    );
}
