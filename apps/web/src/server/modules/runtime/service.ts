import type { AppDb } from "../../db/types";
import { runtimes } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../../utils";
import { getRowsAffected } from "../../db/utils";
import {
  chatWithRuntimeCommand,
  detectRuntimeCLIs,
  getRuntimeCurrentModel,
  runtimeHealthCheck,
} from "@/server/runtime/runtime-cli";

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
  error?: string;
};

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
      transport: "stdio" | "tcp";
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
        transport: definition.transport,
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
      transport?: RuntimeProfile["transport"];
    },
  ): Promise<RuntimeProfile | undefined> {
    const updates: Record<string, RuntimeProfile["transport"]> = {};
    if (data.transport !== undefined) {
      updates.transport = data.transport;
    }

    const result = await db
      .update(runtimes)
      .set(updates)
      .where(eq(runtimes.id, id))
      .run();
    if (getRowsAffected(result) === 0) return undefined;
    return RuntimeService.get(db, id);
  }

  static async detect(): Promise<{
    available: DetectedRuntime[];
    unavailable: DetectedRuntime[];
  }> {
    return detectRuntimeCLIs();
  }

  static async registerFromDetection(
    db: AppDb,
    definition: DetectedRuntime,
  ): Promise<RuntimeProfile | undefined> {
    const existing = await RuntimeService.getByName(db, definition.name);
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
      transport: definition.transport,
      registryId: definition.id,
    });
  }

  static async healthCheck(
    runtimeId: string,
    options?: { level?: "basic" | "ping" | "full"; prompt?: string },
  ) {
    return runtimeHealthCheck(runtimeId, options);
  }

  static async getCurrentModel(
    db: AppDb,
    runtimeId: string,
  ): Promise<{
    model?: string;
    source: "cli" | "registry";
    rawOutput?: string;
  }> {
    const runtime =
      (await RuntimeService.getByRegistryId(db, runtimeId)) ||
      (await RuntimeService.get(db, runtimeId));

    const result = await getRuntimeCurrentModel(runtimeId, runtime?.model);
    if (runtime && result.model && result.source === "cli") {
      await db
        .update(runtimes)
        .set({ currentModel: result.model })
        .where(eq(runtimes.id, runtime.id))
        .run();
    }
    return result;
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

    return chatWithRuntimeCommand(runtime.command, prompt, runtime.name);
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
    };
  }
}
