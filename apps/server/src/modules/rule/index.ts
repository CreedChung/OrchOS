import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin } from "../auth";
import { RuleService } from "./service";

const RuleResponse = t.Object({
  id: t.String(),
  name: t.String(),
  condition: t.String(),
  action: t.String(),
  enabled: t.Boolean(),
  createdAt: t.String(),
});

export const ruleController = new Elysia({ prefix: "/api/rules" })
  .use(authPlugin)
  .requireAuth(true)
  .get("/", () => RuleService.list(), {
    response: t.Array(RuleResponse),
  })
  .post(
    "/",
    ({ body }) => {
      return RuleService.create(body);
    },
    {
      body: t.Object({
        name: t.String(),
        condition: t.String(),
        action: t.String(),
        enabled: t.Optional(t.Boolean()),
      }),
      response: RuleResponse,
    },
  )
  .patch(
    "/:id",
    ({ params: { id }, body }) => {
      const rule = RuleService.update(id, body);
      if (!rule) throw status(404, "Rule not found");
      return rule;
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        condition: t.Optional(t.String()),
        action: t.Optional(t.String()),
        enabled: t.Optional(t.Boolean()),
      }),
      response: {
        200: RuleResponse,
        404: t.String(),
      },
    },
  )
  .delete(
    "/:id",
    ({ params: { id } }) => {
      const deleted = RuleService.delete(id);
      if (!deleted) throw status(404, "Rule not found");
      return { success: true };
    },
    {
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: t.String(),
      },
    },
  );
