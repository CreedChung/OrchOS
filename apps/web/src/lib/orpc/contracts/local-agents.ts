import { oc } from "@orpc/contract";
import { z } from "zod";

import { detectedRuntimeSchema } from "./runtimes";

export const localAgentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string().optional(),
  deviceId: z.string(),
  name: z.string(),
  platform: z.string().optional(),
  appVersion: z.string().optional(),
  status: z.enum(["online", "offline"]),
  runtimes: z.array(detectedRuntimeSchema),
  metadata: z.record(z.string(), z.string()),
  registeredAt: z.string(),
  lastSeenAt: z.string(),
});

const localAgentHeartbeatInputSchema = z.object({
  deviceId: z.string(),
  name: z.string(),
  platform: z.string().optional(),
  appVersion: z.string().optional(),
  runtimes: z.array(detectedRuntimeSchema),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const localAgentsContract = {
  list: oc.input(z.object({}).optional()).output(z.array(localAgentSchema)),
  createPairingToken: oc
    .input(z.object({}).optional())
    .output(
      z.object({
        pairingToken: z.string(),
        expiresAt: z.string(),
      }),
    ),
  pair: oc
    .input(
      z.object({
        pairingToken: z.string(),
        deviceId: z.string(),
        name: z.string(),
        platform: z.string().optional(),
        appVersion: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
      }),
    )
    .output(
      z.object({
        hostToken: z.string(),
        host: localAgentSchema,
      }),
    ),
  heartbeat: oc.input(localAgentHeartbeatInputSchema).output(localAgentSchema),
};
