import { oc } from "@orpc/contract";
import { z } from "zod";

export const runtimeTransportSchema = z.enum(["stdio", "tcp"]);
export const runtimeStatusSchema = z.enum(["idle", "active", "error"]);

export const runtimeSchema = z.object({
  id: z.string(),
  name: z.string(),
  command: z.string(),
  version: z.string().optional(),
  path: z.string().optional(),
  role: z.string(),
  capabilities: z.array(z.string()),
  model: z.string(),
  transport: runtimeTransportSchema,
  enabled: z.boolean(),
  currentModel: z.string().optional(),
  status: runtimeStatusSchema,
  registryId: z.string().optional(),
});

export const detectedRuntimeSchema = z.object({
  id: z.string(),
  name: z.string(),
  command: z.string(),
  version: z.string().optional(),
  path: z.string().optional(),
  role: z.string(),
  capabilities: z.array(z.string()),
  model: z.string(),
  transport: runtimeTransportSchema,
  error: z.string().optional(),
});

export const runtimeHealthResultSchema = z.object({
  healthy: z.boolean(),
  level: z.string(),
  output: z.string(),
  error: z.string().optional(),
  responseTime: z.number(),
  agentName: z.string(),
  agentCommand: z.string(),
  authRequired: z.boolean().optional(),
});

export const runtimeChatResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
  error: z.string().optional(),
  agentName: z.string(),
  responseTime: z.number(),
});

export const runtimeModelResultSchema = z.object({
  model: z.string().optional(),
  source: z.enum(["cli", "registry"]),
  rawOutput: z.string().optional(),
});

export const runtimesContract = {
  list: oc.input(z.object({}).optional()).output(z.array(runtimeSchema)),
  detect: oc
    .input(z.object({}).optional())
    .output(
      z.object({
        available: z.array(detectedRuntimeSchema),
        unavailable: z.array(detectedRuntimeSchema),
      }),
    ),
  registerDetected: oc
    .input(
      z.object({
        runtimeIds: z.array(z.string()).optional(),
        registerAll: z.boolean().optional(),
      }),
    )
    .output(
      z.object({
        registered: z.array(runtimeSchema),
        skipped: z.array(detectedRuntimeSchema),
      }),
    ),
  update: oc
    .input(
      z.object({
        id: z.string(),
        enabled: z.boolean().optional(),
        status: runtimeStatusSchema.optional(),
        transport: runtimeTransportSchema.optional(),
      }),
    )
    .output(runtimeSchema.nullable()),
  health: oc
    .input(
      z.object({
        runtimeId: z.string(),
        level: z.enum(["basic", "ping", "full"]).optional(),
        prompt: z.string().optional(),
      }),
    )
    .output(runtimeHealthResultSchema),
  models: oc.input(z.object({ runtimeId: z.string() })).output(runtimeModelResultSchema),
  chat: oc
    .input(
      z.object({
        runtimeId: z.string(),
        prompt: z.string(),
      }),
    )
    .output(runtimeChatResultSchema),
};
