import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/server/auth/request-auth";
import { LocalHostService } from "@/server/modules/local-hosts/service";
import { getLocalDb } from "@/server/runtime/local-db";

function getJwtKey() {
  return process.env.CLERK_JWT_KEY?.trim() ?? "";
}

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("Authorization")?.trim();
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

export const Route = createFileRoute("/api/local-hosts/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          deviceId: string;
          name: string;
          platform?: string;
          appVersion?: string;
          runtimes: Array<{
            id: string;
            name: string;
            command: string;
            version?: string;
            path?: string;
            role: string;
            capabilities: string[];
            model: string;
            transport: "stdio" | "tcp";
            error?: string;
          }>;
          metadata?: Record<string, string>;
        };

        const hostToken = extractBearerToken(request);
        if (hostToken?.startsWith("orchos_host_")) {
          try {
            return Response.json(
              await LocalHostService.heartbeatForHostToken(await getLocalDb(), hostToken, body),
            );
          } catch (error) {
            return Response.json(
              { error: error instanceof Error ? error.message : String(error) },
              { status: 401 },
            );
          }
        }

        const auth = await authenticateRequest(request, getJwtKey());
        if (!auth.userId) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        return Response.json(
          await LocalHostService.heartbeat(await getLocalDb(), auth.userId, auth.orgId, body),
        );
      },
    },
  },
});
