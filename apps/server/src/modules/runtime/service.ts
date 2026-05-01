import { db } from "@/db";
import { runtimes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/utils";
import { executor } from "@/modules/execution/executor";

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
  transport: "stdio" | "tcp";
  enabled: boolean;
  currentModel?: string;
  status: "idle" | "active" | "error";
  registryId?: string;
  supportsMultimodal?: boolean;
}

type DetectedRuntime = {
  id: string;
  name: string;
  command: string;
  version?: string;
  path?: string;
  role: string;
  capabilities: string[];
  model: string;
  transport: "stdio" | "tcp";
  supportsMultimodal?: boolean;
  error?: string;
};

export abstract class RuntimeService {
  static register(definition: {
    name: string;
    command: string;
    version?: string;
    path?: string;
    role: string;
    capabilities: string[];
    model: string;
    transport: "stdio" | "tcp";
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
        transport: definition.transport,
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
      transport?: RuntimeProfile["transport"];
    },
  ): RuntimeProfile | undefined {
    const updates: Record<string, RuntimeProfile["transport"]> = {};
    if (data.transport !== undefined) {
      updates.transport = data.transport;
    }

    db.update(runtimes)
      .set(updates)
      .where(eq(runtimes.id, id))
      .run();
    return RuntimeService.get(id);
  }

  static async detect(): Promise<{
    available: DetectedRuntime[];
    unavailable: DetectedRuntime[];
  }> {
    const detected = await executor.detectAgentCLIs();

    const available: DetectedRuntime[] = [];
    const unavailable: DetectedRuntime[] = [];

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
        transport: "stdio" as const,
        supportsMultimodal: checkMultimodalSupport(detectedRuntime.definition.model),
      };

      if (detectedRuntime.available) {
        available.push(base);
      } else {
        unavailable.push({
          ...base,
          error: `${detectedRuntime.definition.command} not found in PATH`,
        });
      }
    }

    return { available, unavailable };
  }

  static registerFromDetection(definition: DetectedRuntime): RuntimeProfile | undefined {
    const existing = RuntimeService.getByName(definition.name);
    if (existing) {
      const updates: Record<string, string> = {};
      if (definition.version && existing.version !== definition.version) {
        updates.version = definition.version;
      }
      if (definition.path && existing.path !== definition.path) {
        updates.path = definition.path;
      }
      updates.transport = definition.transport;
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
      transport: definition.transport,
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
    source: "cli" | "registry";
    rawOutput?: string;
  }> {
    const runtime = RuntimeService.getByRegistryId(runtimeId) || RuntimeService.get(runtimeId);

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
    source: "config";
  }> {
    const runtime = RuntimeService.getByRegistryId(runtimeId) || RuntimeService.get(runtimeId);

    if (!runtime) {
      return { models: [], currentModel: undefined, source: "config" };
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
    options?: { conversationId?: string; cwd?: string },
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

    const startTime = Date.now();
    const result = await executor.invokeAgentCLI(
      runtime.registryId || runtime.name || runtime.command,
      prompt,
      {
        cwd: options?.cwd,
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
      transport: (row.transport as RuntimeProfile["transport"]) || "stdio",
      enabled: row.enabled === "true",
      currentModel: row.currentModel || undefined,
      status: row.status as RuntimeProfile["status"],
      registryId: row.registryId || undefined,
      supportsMultimodal: checkMultimodalSupport(row.model),
    };
  }
}
