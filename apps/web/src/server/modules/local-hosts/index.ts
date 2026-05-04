import { Elysia, status, t } from "elysia";
import type { AppDb } from "../../db/types";
import { LocalHostModel } from "./model";
import { LocalHostService } from "./service";
import type { AuthContext } from "../auth";

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("Authorization")?.trim();
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

function requireUser(auth: AuthContext) {
  if (!auth.userId) {
    throw status(401, "Unauthorized");
  }

  return auth.userId;
}

export function createLocalHostController(db: AppDb) {
  return new Elysia({ prefix: "/api/local-hosts" })
    .get(
      "/",
      async ({ auth }) => {
        const userId = requireUser(auth);
        return LocalHostService.listForUser(db, userId, auth.orgId);
      },
      {
        response: t.Array(LocalHostModel.response),
      },
    )
    .post(
      "/pairing-tokens",
      async ({ auth }) => {
        const userId = requireUser(auth);
        return LocalHostService.createPairingToken(db, userId, auth.orgId);
      },
      {
        response: LocalHostModel.pairingResponse,
      },
    )
    .post(
      "/pair",
      async ({ body }) => {
        try {
          return await LocalHostService.pairHost(db, body);
        } catch (error) {
          throw status(400, error instanceof Error ? error.message : String(error));
        }
      },
      {
        body: LocalHostModel.pairBody,
        response: LocalHostModel.pairResponse,
      },
    )
    .post(
      "/heartbeat",
      async ({ auth, body, request }) => {
        const hostToken = extractBearerToken(request);
        if (hostToken?.startsWith("orchos_host_")) {
          try {
            return await LocalHostService.heartbeatForHostToken(db, hostToken, body);
          } catch (error) {
            throw status(401, error instanceof Error ? error.message : String(error));
          }
        }

        const userId = requireUser(auth);
        return LocalHostService.heartbeat(db, userId, auth.orgId, body);
      },
      {
        body: LocalHostModel.heartbeatBody,
        response: LocalHostModel.response,
      },
    );
}
