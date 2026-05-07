import { os } from "@/server/orpc/base";
import { LocalAgentService } from "@/server/modules/local-agents/service";
import {
  authenticateORPCRequest,
  extractBearerToken,
  isClerkConfigured,
} from "@/server/orpc/context";
import { getLocalDb } from "@/server/runtime/local-db";

function ensureAuthenticatedUser(userId: string | null) {
  if (!userId && isClerkConfigured()) {
    throw new Error("Unauthorized");
  }
}

export const localAgentsRouter = {
  list: os.localAgents.list.handler(async ({ context }) => {
    const auth = await authenticateORPCRequest(context.request);
    ensureAuthenticatedUser(auth.userId);
    return LocalAgentService.listForUser(await getLocalDb(), auth.userId ?? "", auth.orgId ?? undefined);
  }),
  createPairingToken: os.localAgents.createPairingToken.handler(async ({ context }) => {
    const auth = await authenticateORPCRequest(context.request);
    ensureAuthenticatedUser(auth.userId);
    return LocalAgentService.createPairingToken(await getLocalDb(), auth.userId ?? "", auth.orgId);
  }),
  pair: os.localAgents.pair.handler(async ({ input }) => {
    return LocalAgentService.pairAgent(await getLocalDb(), input);
  }),
  heartbeat: os.localAgents.heartbeat.handler(async ({ context, input }) => {
    const hostToken = extractBearerToken(context.request);
    if (hostToken?.startsWith("orchos_host_")) {
      return LocalAgentService.heartbeatForAgentToken(await getLocalDb(), hostToken, input);
    }

    const auth = await authenticateORPCRequest(context.request);
    ensureAuthenticatedUser(auth.userId);
    return LocalAgentService.heartbeat(await getLocalDb(), auth.userId ?? "", auth.orgId, input);
  }),
};
