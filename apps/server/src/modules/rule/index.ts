import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { RuleService } from "@/modules/rule/service";

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
  .onBeforeHandle(requireAuth)
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
      params: t.Object({ id: t.String() }),
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
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: t.String(),
      },
    },
  );
