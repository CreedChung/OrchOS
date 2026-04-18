import { db } from "../../db";
import { runtimes } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../../utils";
import { executor } from "../../modules/execution/executor";

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
  static register(definition: {
    name: string;
    command: string;
    version?: string;
    path?: string;
    role: string;
    capabilities: string[];
    model: string;
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
    const result = db
      .update(runtimes)
      .set({ enabled: String(enabled) })
      .where(eq(runtimes.id, id))
      .run();
    if (result.changes === 0) return undefined;
    return RuntimeService.get(id);
  }

  static updateStatus(id: string, status: RuntimeProfile["status"]): RuntimeProfile | undefined {
    const result = db.update(runtimes).set({ status }).where(eq(runtimes.id, id)).run();
    if (result.changes === 0) return undefined;
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
  }): RuntimeProfile | undefined {
    // Check by name first (existing registration)
    const existing = RuntimeService.getByName(definition.name);
    if (existing) {
      // Update version/path if provided
      const updates: Record<string, string> = {};
      if (definition.version && existing.version !== definition.version)
        updates.version = definition.version;
      if (definition.path && existing.path !== definition.path) updates.path = definition.path;
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
      registryId: definition.id,
    });
  }

  static async healthCheck(
    runtimeId: string,
    options?: { level?: "basic" | "ping" | "full"; prompt?: string },
  ) {
    return executor.testAgentCLI(runtimeId, options);
  }

  static async getCurrentModel(runtimeId: string) {
    const result = await executor.getAgentCurrentModel(runtimeId);
    const runtime = RuntimeService.getByRegistryId(runtimeId) || RuntimeService.get(runtimeId);
    if (runtime && result.model && result.source === "cli") {
      db.update(runtimes)
        .set({ currentModel: result.model })
        .where(eq(runtimes.id, runtime.id))
        .run();
    }
    return result;
  }

  static async chat(
    runtimeId: string,
    prompt: string,
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
    const result = await executor.invokeAgentCLI(runtime.registryId || runtime.name || runtime.command, prompt, {
      timeout: 120000,
    });
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
      enabled: row.enabled === "true",
      currentModel: row.currentModel || undefined,
      status: row.status as RuntimeProfile["status"],
      registryId: row.registryId || undefined,
    };
  }
}
