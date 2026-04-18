import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { CommandService } from "@/modules/command/service";

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

export const commandController = new Elysia({ prefix: "/api/commands" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get("/", () => CommandService.list(), {
    response: t.Array(CommandResponse),
  })
  .post(
    "/",
    ({ body }) => {
      return CommandService.create(body);
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
    ({ params: { id } }) => {
      const command = CommandService.get(id);
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
    ({ params: { id }, body }) => {
      const command = CommandService.update(id, body);
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
    ({ params: { id } }) => {
      const deleted = CommandService.delete(id);
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
