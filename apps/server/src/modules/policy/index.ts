import { Elysia, t } from "elysia";

import { authPlugin, requireAuth } from "@/modules/auth";
import { PolicyService } from "@/modules/policy/service";

const policyDecisionResponse = t.Object({
  id: t.String(),
  subjectType: t.String(),
  subjectId: t.String(),
  policySource: t.String(),
  decision: t.String(),
  reason: t.Optional(t.String()),
  rewrite: t.Optional(t.Record(t.String(), t.Unknown())),
  createdAt: t.String(),
});

const policyViolationResponse = t.Object({
  id: t.String(),
  subjectType: t.String(),
  subjectId: t.String(),
  policySource: t.String(),
  reason: t.String(),
  metadata: t.Optional(t.Record(t.String(), t.Unknown())),
  createdAt: t.String(),
});

export const policyController = new Elysia({ prefix: "/api/policy" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get(
    "/decisions",
    ({ query }) => {
      return PolicyService.listDecisions(query.subjectType as string | undefined, query.subjectId as string | undefined);
    },
    {
      query: t.Object({
        subjectType: t.Optional(t.String()),
        subjectId: t.Optional(t.String()),
      }),
      response: t.Array(policyDecisionResponse),
    },
  )
  .get(
    "/violations",
    ({ query }) => {
      return PolicyService.listViolations(query.subjectType as string | undefined, query.subjectId as string | undefined);
    },
    {
      query: t.Object({
        subjectType: t.Optional(t.String()),
        subjectId: t.Optional(t.String()),
      }),
      response: t.Array(policyViolationResponse),
    },
  );
