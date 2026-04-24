import { Elysia, t } from "elysia";

import { authPlugin, requireAuth } from "@/modules/auth";
import { ReflectionModel } from "@/modules/reflection/model";
import { ReflectionService } from "@/modules/reflection/service";

export const reflectionController = new Elysia({ prefix: "/api/reflections" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get("/", () => ReflectionService.list(), {
    response: t.Array(ReflectionModel.response),
  })
  .get("/patterns", () => ReflectionService.listFailurePatterns(), {
    response: t.Array(ReflectionModel.patternResponse),
  })
  .get("/strategy-updates", () => ReflectionService.listStrategyUpdates(), {
    response: t.Array(ReflectionModel.strategyUpdateResponse),
  });
