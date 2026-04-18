import { Elysia, t } from "elysia";
import { status } from "elysia";
import type { AppDb } from "../../db/types";
import { RuleService } from "./service";

const RuleResponse = t.Object({
  id: t.String(),
  name: t.String(),
  condition: t.String(),
  action: t.String(),
  enabled: t.Boolean(),
  createdAt: t.String(),
});

export function createRuleController(db: AppDb) {
  return new Elysia({ prefix: "/api/rules" })
    .get(
      "/",
      async () => {
        return await RuleService.list(db);
      },
      {
        response: t.Array(RuleResponse),
      },
    )
    .post(
      "/",
      async ({ body }) => {
        return await RuleService.create(db, body);
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
      async ({ params: { id }, body }) => {
        const rule = await RuleService.update(db, id, body);
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
      async ({ params: { id } }) => {
        const deleted = await RuleService.delete(db, id);
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
}
