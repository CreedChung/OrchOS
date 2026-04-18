import type { AppDb } from "../../db/types";
import { runtimes } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../../utils";
import { getRowsAffected } from "../../db/utils";
import { getAcpAgentConfig, getAcpCurrentModel, probeAcpAgent, promptManagedAcpAgent } from "./acp";

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
}

export abstract class RuntimeService {
  static async register(
    db: AppDb,
    definition: {
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
    },
  ): Promise<RuntimeProfile> {
    const id = generateId("runtime");

    await db
      .insert(runtimes)
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

    const row = (await db.select().from(runtimes).where(eq(runtimes.id, id)).get())!;
    return RuntimeService.mapRow(row);
  }

  static async get(db: AppDb, id: string): Promise<RuntimeProfile | undefined> {
    const row = await db.select().from(runtimes).where(eq(runtimes.id, id)).get();
    if (!row) return undefined;
    return RuntimeService.mapRow(row);
  }

  static async getByName(db: AppDb, name: string): Promise<RuntimeProfile | undefined> {
    const row = await db.select().from(runtimes).where(eq(runtimes.name, name)).get();
    if (!row) return undefined;
    return RuntimeService.mapRow(row);
  }

  static async getByRegistryId(db: AppDb, registryId: string): Promise<RuntimeProfile | undefined> {
    const row = await db.select().from(runtimes).where(eq(runtimes.registryId, registryId)).get();
    if (!row) return undefined;
    return RuntimeService.mapRow(row);
  }

  static async list(db: AppDb): Promise<RuntimeProfile[]> {
    const rows = await db.select().from(runtimes).all();
    return rows.map(RuntimeService.mapRow);
  }

  static async updateEnabled(
    db: AppDb,
    id: string,
    enabled: boolean,
  ): Promise<RuntimeProfile | undefined> {
    const result = await db
      .update(runtimes)
      .set({ enabled: String(enabled) })
      .where(eq(runtimes.id, id))
      .run();
    if (getRowsAffected(result) === 0) return undefined;
    return RuntimeService.get(db, id);
  }

  static async updateStatus(
    db: AppDb,
    id: string,
    status: RuntimeProfile["status"],
  ): Promise<RuntimeProfile | undefined> {
    const result = await db.update(runtimes).set({ status }).where(eq(runtimes.id, id)).run();
    if (getRowsAffected(result) === 0) return undefined;
    return RuntimeService.get(db, id);
  }

  static async updateConfig(
    db: AppDb,
    id: string,
    data: {
      protocol?: RuntimeProfile["protocol"];
      transport?: RuntimeProfile["transport"];
      acpCommand?: string;
      acpArgs?: string[];
      acpEnv?: Record<string, string>;
      communicationMode?: RuntimeProfile["communicationMode"];
    },
  ): Promise<RuntimeProfile | undefined> {
    const result = await db
      .update(runtimes)
      .set({
        ...(data.protocol !== undefined ? { protocol: data.protocol } : {}),
        ...(data.transport !== undefined ? { transport: data.transport } : {}),
        ...(data.acpCommand !== undefined ? { acpCommand: data.acpCommand || null } : {}),
        ...(data.acpArgs !== undefined ? { acpArgs: JSON.stringify(data.acpArgs) } : {}),
        ...(data.acpEnv !== undefined ? { acpEnv: JSON.stringify(data.acpEnv) } : {}),
        ...(data.communicationMode !== undefined ? { communicationMode: data.communicationMode } : {}),
      })
      .where(eq(runtimes.id, id))
      .run();
    if (getRowsAffected(result) === 0) return undefined;
    return RuntimeService.get(db, id);
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
      error?: string;
    }[];
  }> {
    try {
      const { executor } = await import("../execution/executor");
      if (!executor) {
        return { available: [], unavailable: [] };
      }

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
    } catch {
      return { available: [], unavailable: [] };
    }
  }

  static async registerFromDetection(
    db: AppDb,
    definition: {
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
    },
  ): Promise<RuntimeProfile | undefined> {
    const existing = await RuntimeService.getByName(db, definition.name);
    if (existing) {
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
        await db.update(runtimes).set(updates).where(eq(runtimes.id, existing.id)).run();
      }
      return RuntimeService.get(db, existing.id);
    }

    return RuntimeService.register(db, {
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
    try {
      const { executor } = await import("../execution/executor");
      if (!executor) {
        return {
          healthy: false,
          level: "basic" as const,
          output: "",
          error: "Not available in Worker environment",
          responseTime: 0,
          agentName: runtimeId,
          agentCommand: runtimeId,
        };
      }
      return await executor.testAgentCLI(runtimeId, options);
    } catch {
      return {
        healthy: false,
        level: "basic" as const,
        output: "",
        error: "Not available in Worker environment",
        responseTime: 0,
        agentName: runtimeId,
        agentCommand: runtimeId,
      };
    }
  }

  static async getCurrentModel(
    db: AppDb,
    runtimeId: string,
  ): Promise<{ model?: string; source: "acp" | "cli" | "config" | "registry"; rawOutput?: string }> {
    const runtime =
      (await RuntimeService.getByRegistryId(db, runtimeId)) ||
      (await RuntimeService.get(db, runtimeId));

    if (runtime) {
      const acpConfig = getAcpAgentConfig(runtime);
      if (acpConfig) {
        try {
          const result = await getAcpCurrentModel(acpConfig);
          if (result.model) {
            await db
              .update(runtimes)
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

    try {
      const { executor } = await import("../execution/executor");
      if (!executor) {
        return { model: undefined, source: "registry" as const };
      }
      const result = await executor.getAgentCurrentModel(runtimeId);
      if (runtime && result.model && result.source === "cli") {
        await db
          .update(runtimes)
          .set({ currentModel: result.model })
          .where(eq(runtimes.id, runtime.id))
          .run();
      }
      return result;
    } catch {
      return { model: undefined, source: "registry" as const };
    }
  }

  static async chat(
    db: AppDb,
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
    const runtime = await RuntimeService.get(db, runtimeId);
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
        const result = await promptManagedAcpAgent(acpConfig, prompt, undefined, options?.conversationId);
        const responseTime = Date.now() - startTime;

        return {
          success: result.output.trim().length > 0,
          output: result.output.trim(),
          error: result.output.trim().length > 0 ? undefined : result.rawOutput || "ACP agent returned no output",
          agentName: runtime.name,
          responseTime,
        };
      } catch {
        // Fall back to legacy CLI invocation for agents without a working ACP adapter.
      }
    }

    try {
      const { executor } = await import("../execution/executor");
      if (!executor) {
        return {
          success: false,
          output: "",
          error: "Not available in Worker environment",
          agentName: runtime.name,
          responseTime: 0,
        };
      }

      const startTime = Date.now();
      const result = await executor.run(
        `${runtime.command} -p '${prompt.replace(/'/g, "'\\''")}' 2>&1`,
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
    } catch {
      return {
        success: false,
        output: "",
        error: "Not available in Worker environment",
        agentName: runtime.name,
        responseTime: 0,
      };
    }
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
