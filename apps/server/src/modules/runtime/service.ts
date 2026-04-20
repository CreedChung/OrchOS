import { db } from "@/db";
import { runtimes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/utils";
import { executor } from "@/modules/execution/executor";
import {
  getAcpAgentConfig,
  getAcpAvailableModels,
  getAcpCurrentModel,
  probeAcpAgent,
  promptManagedAcpAgent,
} from "@/modules/runtime/acp";

const MULTIMODAL_MODEL_PATTERNS = [
  /claude-?3/i,
  /claude-?sonnet/i,
  /claude-?opus/i,
  /claude-?haiku/i,
  /gpt-4.*vision/i,
  /gpt-4.*turbo/i,
  /gpt-4o/i,
  /gpt-4-turbo/i,
  /gemini.*pro/i,
  /gemini.*flash/i,
  /qwen.*vl/i,
  /qwen.*vision/i,
  /llava/i,
];

function checkMultimodalSupport(model: string): boolean {
  const modelName = model.replace(/^(cloud|local)\//, "").toLowerCase();
  return MULTIMODAL_MODEL_PATTERNS.some((pattern) => pattern.test(modelName));
}

export interface RuntimeProfile {
  id: string;
  name: string;
  command: string;
  version?: string;
  path?: string;
  role: string;
  capabilities: string[];
  model: string;
  protocol: "acp" | "cli";
  transport: "stdio" | "tcp";
  acpCommand?: string;
  acpArgs: string[];
  acpEnv: Record<string, string>;
  communicationMode: "acp-native" | "acp-adapter" | "cli-fallback";
  enabled: boolean;
  currentModel?: string;
  status: "idle" | "active" | "error";
  registryId?: string;
  supportsMultimodal?: boolean;
}

export abstract class RuntimeService {
  static register(definition: {
    name: string;
    command: string;
    version?: string;
    path?: string;
    role: string;
    capabilities: string[];
    model: string;
    protocol: "acp" | "cli";
    transport: "stdio" | "tcp";
    acpCommand?: string;
    acpArgs?: string[];
    acpEnv?: Record<string, string>;
    communicationMode: "acp-native" | "acp-adapter" | "cli-fallback";
    registryId?: string;
  }): RuntimeProfile {
    const id = generateId("runtime");

    db.insert(runtimes)
      .values({
        id,
        name: definition.name,
        command: definition.command,
        version: definition.version || null,
        path: definition.path || null,
        role: definition.role,
        capabilities: JSON.stringify(definition.capabilities),
        model: definition.model,
        protocol: definition.protocol,
        transport: definition.transport,
        acpCommand: definition.acpCommand || null,
        acpArgs: JSON.stringify(definition.acpArgs || []),
        acpEnv: JSON.stringify(definition.acpEnv || {}),
        communicationMode: definition.communicationMode,
        enabled: "true",
        status: "idle",
        registryId: definition.registryId || null,
      })
      .run();

    return RuntimeService.mapRow(db.select().from(runtimes).where(eq(runtimes.id, id)).get()!);
  }

  static get(id: string): RuntimeProfile | undefined {
    const row = db.select().from(runtimes).where(eq(runtimes.id, id)).get();
    if (!row) return undefined;
    return RuntimeService.mapRow(row);
  }

  static getByName(name: string): RuntimeProfile | undefined {
    const row = db.select().from(runtimes).where(eq(runtimes.name, name)).get();
    if (!row) return undefined;
    return RuntimeService.mapRow(row);
  }

  static getByRegistryId(registryId: string): RuntimeProfile | undefined {
    const row = db.select().from(runtimes).where(eq(runtimes.registryId, registryId)).get();
    if (!row) return undefined;
    return RuntimeService.mapRow(row);
  }

  static list(): RuntimeProfile[] {
    return db.select().from(runtimes).all().map(RuntimeService.mapRow);
  }

  static updateEnabled(id: string, enabled: boolean): RuntimeProfile | undefined {
    db.update(runtimes)
      .set({ enabled: String(enabled) })
      .where(eq(runtimes.id, id))
      .run();
    return RuntimeService.get(id);
  }

  static updateStatus(id: string, status: RuntimeProfile["status"]): RuntimeProfile | undefined {
    db.update(runtimes).set({ status }).where(eq(runtimes.id, id)).run();
    return RuntimeService.get(id);
  }

  static updateConfig(
    id: string,
    data: {
      protocol?: RuntimeProfile["protocol"];
      transport?: RuntimeProfile["transport"];
      acpCommand?: string;
      acpArgs?: string[];
      acpEnv?: Record<string, string>;
      communicationMode?: RuntimeProfile["communicationMode"];
    },
  ): RuntimeProfile | undefined {
    db.update(runtimes)
      .set({
        ...(data.protocol !== undefined ? { protocol: data.protocol } : {}),
        ...(data.transport !== undefined ? { transport: data.transport } : {}),
        ...(data.acpCommand !== undefined ? { acpCommand: data.acpCommand || null } : {}),
        ...(data.acpArgs !== undefined ? { acpArgs: JSON.stringify(data.acpArgs) } : {}),
        ...(data.acpEnv !== undefined ? { acpEnv: JSON.stringify(data.acpEnv) } : {}),
        ...(data.communicationMode !== undefined
          ? { communicationMode: data.communicationMode }
          : {}),
      })
      .where(eq(runtimes.id, id))
      .run();
    return RuntimeService.get(id);
  }

  static async detect(): Promise<{
    available: {
      id: string;
      name: string;
      command: string;
      version?: string;
      path?: string;
      role: string;
      capabilities: string[];
      model: string;
      protocol: "acp" | "cli";
      transport: "stdio" | "tcp";
      acpCommand?: string;
      acpArgs: string[];
      acpEnv: Record<string, string>;
      communicationMode: "acp-native" | "acp-adapter" | "cli-fallback";
      supportsMultimodal?: boolean;
      error?: string;
    }[];
    unavailable: {
      id: string;
      name: string;
      command: string;
      version?: string;
      path?: string;
      role: string;
      capabilities: string[];
      model: string;
      protocol: "acp" | "cli";
      transport: "stdio" | "tcp";
      acpCommand?: string;
      acpArgs: string[];
      acpEnv: Record<string, string>;
      communicationMode: "acp-native" | "acp-adapter" | "cli-fallback";
      supportsMultimodal?: boolean;
      error?: string;
    }[];
  }> {
    const detected = await executor.detectAgentCLIs();

    const available: Awaited<ReturnType<typeof RuntimeService.detect>>["available"] = [];
    const unavailable: Awaited<ReturnType<typeof RuntimeService.detect>>["unavailable"] = [];

    for (const detectedRuntime of detected) {
      const base = {
        id: detectedRuntime.definition.id,
        name: detectedRuntime.definition.name,
        command: detectedRuntime.definition.command,
        version: detectedRuntime.version,
        path: detectedRuntime.path,
        role: detectedRuntime.definition.role,
        capabilities: detectedRuntime.definition.capabilities,
        model: detectedRuntime.definition.model,
        supportsMultimodal: checkMultimodalSupport(detectedRuntime.definition.model),
      };
      const acpConfig = getAcpAgentConfig(base);

      if (acpConfig) {
        try {
          await probeAcpAgent(acpConfig);
          available.push({
            ...base,
            protocol: "acp",
            transport: "stdio",
            acpCommand: acpConfig.command,
            acpArgs: acpConfig.args,
            acpEnv: acpConfig.env || {},
            communicationMode: acpConfig.communicationMode,
          });
          continue;
        } catch (error) {
          unavailable.push({
            ...base,
            protocol: "acp",
            transport: "stdio",
            acpCommand: acpConfig.command,
            acpArgs: acpConfig.args,
            acpEnv: acpConfig.env || {},
            communicationMode: acpConfig.communicationMode,
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
      }

      if (detectedRuntime.available) {
        available.push({
          ...base,
          protocol: "cli",
          transport: "stdio",
          acpCommand: undefined,
          acpArgs: [],
          acpEnv: {},
          communicationMode: "cli-fallback",
        });
      } else {
        unavailable.push({
          ...base,
          protocol: "cli",
          transport: "stdio",
          acpCommand: undefined,
          acpArgs: [],
          acpEnv: {},
          communicationMode: "cli-fallback",
          error: `${detectedRuntime.definition.command} not found in PATH`,
        });
      }
    }

    return { available, unavailable };
  }

  static registerFromDetection(definition: {
    id: string;
    name: string;
    command: string;
    version?: string;
    path?: string;
    role: string;
    capabilities: string[];
    model: string;
    protocol: "acp" | "cli";
    transport: "stdio" | "tcp";
    acpCommand?: string;
    acpArgs: string[];
    acpEnv: Record<string, string>;
    communicationMode: "acp-native" | "acp-adapter" | "cli-fallback";
  }): RuntimeProfile | undefined {
    // Check by name first (existing registration)
    const existing = RuntimeService.getByName(definition.name);
    if (existing) {
      // Update version/path if provided
      const updates: Record<string, string> = {};
      if (definition.version && existing.version !== definition.version)
        updates.version = definition.version;
      if (definition.path && existing.path !== definition.path) updates.path = definition.path;
      updates.protocol = definition.protocol;
      updates.transport = definition.transport;
      updates.acpCommand = definition.acpCommand || "";
      updates.acpArgs = JSON.stringify(definition.acpArgs || []);
      updates.acpEnv = JSON.stringify(definition.acpEnv || {});
      updates.communicationMode = definition.communicationMode;
      if (Object.keys(updates).length > 0) {
        db.update(runtimes).set(updates).where(eq(runtimes.id, existing.id)).run();
      }
      return RuntimeService.get(existing.id);
    }

    return RuntimeService.register({
      name: definition.name,
      command: definition.command,
      version: definition.version,
      path: definition.path,
      role: definition.role,
      capabilities: definition.capabilities,
      model: definition.model,
      protocol: definition.protocol,
      transport: definition.transport,
      acpCommand: definition.acpCommand,
      acpArgs: definition.acpArgs,
      acpEnv: definition.acpEnv,
      communicationMode: definition.communicationMode,
      registryId: definition.id,
    });
  }

  static async healthCheck(
    runtimeId: string,
    options?: { level?: "basic" | "ping" | "full"; prompt?: string },
  ) {
    return executor.testAgentCLI(runtimeId, options);
  }

  static async getCurrentModel(runtimeId: string): Promise<{
    model?: string;
    source: "acp" | "cli" | "config" | "registry";
    rawOutput?: string;
  }> {
    const runtime = RuntimeService.getByRegistryId(runtimeId) || RuntimeService.get(runtimeId);

    if (runtime) {
      const acpConfig = getAcpAgentConfig(runtime);
      if (acpConfig) {
        try {
          const result = await getAcpCurrentModel(acpConfig);
          if (result.model) {
            db.update(runtimes)
              .set({ currentModel: result.model })
              .where(eq(runtimes.id, runtime.id))
              .run();
          }
          return { model: result.model, source: "acp", rawOutput: result.rawOutput };
        } catch {
          // Fall back to legacy CLI probing when ACP is unavailable.
        }
      }
    }

    const result = await executor.getAgentCurrentModel(runtimeId);
    if (runtime && result.model && result.source === "cli") {
      db.update(runtimes)
        .set({ currentModel: result.model })
        .where(eq(runtimes.id, runtime.id))
        .run();
    }
    return result;
  }

  static async getAvailableModels(runtimeId: string): Promise<{
    models: string[];
    currentModel?: string;
    source: "acp" | "config";
    rawOutput?: string;
  }> {
    const runtime = RuntimeService.getByRegistryId(runtimeId) || RuntimeService.get(runtimeId);

    if (!runtime) {
      return { models: [], currentModel: undefined, source: "config" };
    }

    const acpConfig = getAcpAgentConfig(runtime);
    if (acpConfig) {
      try {
        const result = await getAcpAvailableModels(acpConfig);
        if (result.currentModel) {
          db.update(runtimes)
            .set({ currentModel: result.currentModel })
            .where(eq(runtimes.id, runtime.id))
            .run();
        }

        return {
          models: result.models,
          currentModel: result.currentModel,
          source: "acp",
          rawOutput: result.rawOutput,
        };
      } catch {
        // Fall back to configured model when ACP model discovery is unavailable.
      }
    }

    const configuredModels = Array.from(
      new Set([runtime.currentModel, runtime.model].filter(Boolean)),
    );
    return {
      models: configuredModels,
      currentModel: runtime.currentModel || runtime.model,
      source: "config",
    };
  }

  static async chat(
    runtimeId: string,
    prompt: string,
    options?: { conversationId?: string },
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
    agentName: string;
    responseTime: number;
  }> {
    const runtime = RuntimeService.get(runtimeId);
    if (!runtime) {
      return {
        success: false,
        output: "",
        error: "Runtime not found",
        agentName: runtimeId,
        responseTime: 0,
      };
    }

    const acpConfig = getAcpAgentConfig(runtime);
    if (acpConfig) {
      try {
        const startTime = Date.now();
        const result = await promptManagedAcpAgent(
          acpConfig,
          prompt,
          undefined,
          options?.conversationId,
        );
        const responseTime = Date.now() - startTime;

        return {
          success: result.output.trim().length > 0,
          output: result.output.trim(),
          error:
            result.output.trim().length > 0
              ? undefined
              : result.rawOutput || "ACP agent returned no output",
          agentName: runtime.name,
          responseTime,
        };
      } catch {
        // Fall back to legacy CLI invocation for agents without a working ACP adapter.
      }
    }

    const startTime = Date.now();
    const result = await executor.invokeAgentCLI(
      runtime.registryId || runtime.name || runtime.command,
      prompt,
      {
        timeout: 120000,
      },
    );
    const responseTime = Date.now() - startTime;

    return {
      success: result.success || result.output.trim().length > 0,
      output: result.output.trim(),
      error: result.success ? undefined : result.error,
      agentName: runtime.name,
      responseTime,
    };
  }

  static mapRow(row: typeof runtimes.$inferSelect): RuntimeProfile {
    return {
      id: row.id,
      name: row.name,
      command: row.command,
      version: row.version || undefined,
      path: row.path || undefined,
      role: row.role,
      capabilities: JSON.parse(row.capabilities),
      model: row.model,
      protocol: (row.protocol as RuntimeProfile["protocol"]) || "cli",
      transport: (row.transport as RuntimeProfile["transport"]) || "stdio",
      acpCommand: row.acpCommand || undefined,
      acpArgs: JSON.parse(row.acpArgs || "[]"),
      acpEnv: JSON.parse(row.acpEnv || "{}"),
      communicationMode:
        (row.communicationMode as RuntimeProfile["communicationMode"]) || "cli-fallback",
      enabled: row.enabled === "true",
      currentModel: row.currentModel || undefined,
      status: row.status as RuntimeProfile["status"],
      registryId: row.registryId || undefined,
    };
  }
}
