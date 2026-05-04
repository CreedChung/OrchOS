import { Elysia } from "elysia";
import { status } from "elysia";
import { authenticateRequest, type AuthContext } from "../../auth/request-auth";

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
