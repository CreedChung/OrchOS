import type { AppDb } from "../../db/types";
import { runtimes } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../../utils";
import { getRowsAffected } from "../../db/utils";

export interface RuntimeProfile {
  id: string;
  name: string;
  command: string;
  version?: string;
  path?: string;
  role: string;
  capabilities: string[];
  model: string;
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
    }[];
    unavailable: {
      id: string;
      name: string;
      command: string;
      role: string;
      capabilities: string[];
      model: string;
    }[];
  }> {
    try {
      const { executor } = await import("../execution/executor");
      if (!executor) {
        return { available: [], unavailable: [] };
      }

      const detected = await executor.detectAgentCLIs();

      const available = detected
        .filter((d) => d.available)
        .map((d) => ({
          id: d.definition.id,
          name: d.definition.name,
          command: d.definition.command,
          version: d.version,
          path: d.path,
          role: d.definition.role,
          capabilities: d.definition.capabilities,
          model: d.definition.model,
        }));

      const unavailable = detected
        .filter((d) => !d.available)
        .map((d) => ({
          id: d.definition.id,
          name: d.definition.name,
          command: d.definition.command,
          role: d.definition.role,
          capabilities: d.definition.capabilities,
          model: d.definition.model,
        }));

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
    },
  ): Promise<RuntimeProfile | undefined> {
    const existing = await RuntimeService.getByName(db, definition.name);
    if (existing) {
      const updates: Record<string, string> = {};
      if (definition.version && existing.version !== definition.version)
        updates.version = definition.version;
      if (definition.path && existing.path !== definition.path) updates.path = definition.path;
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
  ): Promise<{ model?: string; source: "cli" | "config" | "registry" }> {
    try {
      const { executor } = await import("../execution/executor");
      if (!executor) {
        return { model: undefined, source: "registry" as const };
      }
      const result = await executor.getAgentCurrentModel(runtimeId);
      const runtime =
        (await RuntimeService.getByRegistryId(db, runtimeId)) ||
        (await RuntimeService.get(db, runtimeId));
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
      enabled: row.enabled === "true",
      currentModel: row.currentModel || undefined,
      status: row.status as RuntimeProfile["status"],
      registryId: row.registryId || undefined,
    };
  }
}
