import { Elysia } from "elysia";
import { status } from "elysia";
import { verifyToken } from "@clerk/backend";

export interface AuthContext {
  userId: string | null;
  orgId: string | null;
  sessionId: string | null;
}

function extractSessionToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get("Cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === "__session") {
      return rest.join("=");
    }
  }

  return null;
}

async function authenticateRequest(request: Request, jwtKey: string): Promise<AuthContext> {
  if (!jwtKey) {
    return { userId: null, orgId: null, sessionId: null };
  }

  const token = extractSessionToken(request);
  if (!token) {
    return { userId: null, orgId: null, sessionId: null };
  }

  try {
    const claims = await verifyToken(token, { jwtKey });
    return {
      userId: claims.sub ?? null,
      orgId: (claims.org_id as string | undefined) ?? null,
      sessionId: (claims.sid as string | undefined) ?? null,
    };
  } catch {
    return { userId: null, orgId: null, sessionId: null };
  }
}

export function createAuthPlugin(jwtKey: string) {
  const isClerkConfigured = jwtKey.length > 0;

  return new Elysia({ name: "auth" })
    .derive({ as: "global" }, async ({ request }): Promise<{ auth: AuthContext }> => {
      const auth = await authenticateRequest(request, jwtKey);
      return { auth };
    })
    .macro(({ onBeforeHandle }) => ({
      requireAuth(enabled: boolean) {
        if (!enabled) return;
        onBeforeHandle(({ auth }: { auth: AuthContext }) => {
          if (!isClerkConfigured) return;
          if (!auth.userId) throw status(401, "Unauthorized");
        });
      },
    }));
}
