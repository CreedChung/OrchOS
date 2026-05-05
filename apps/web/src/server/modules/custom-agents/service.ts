import { eq } from "drizzle-orm";
import type { AppDb } from "@/server/db/types";
import { settings } from "@/server/db/schema";

export interface CustomAgentRecord {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  model: string;
  createdAt: string;
}

const AGENTS_KEY = "custom_agents";

export class CustomAgentService {
  constructor(private db: AppDb) {}

  async list(): Promise<CustomAgentRecord[]> {
    const row = (await this.db.select().from(settings).where(eq(settings.key, AGENTS_KEY)).get()) as
      | { key: string; value: string }
      | undefined;
    if (!row) return [];
    try {
      return JSON.parse(row.value) as CustomAgentRecord[];
    } catch {
      return [];
    }
  }

  async create(data: Omit<CustomAgentRecord, "id" | "createdAt">): Promise<CustomAgentRecord[]> {
    const agents = await this.list();
    const agent: CustomAgentRecord = {
      id: `agent_${crypto.randomUUID()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    agents.push(agent);
    await this.save(agents);
    return agents;
  }

  async update(id: string, data: Partial<Omit<CustomAgentRecord, "id" | "createdAt">>): Promise<CustomAgentRecord[]> {
    const agents = await this.list();
    const index = agents.findIndex((a) => a.id === id);
    if (index < 0) throw new Error("Custom agent not found");
    agents[index] = { ...agents[index], ...data };
    await this.save(agents);
    return agents;
  }

  async remove(id: string): Promise<CustomAgentRecord[]> {
    const agents = await this.list();
    const filtered = agents.filter((a) => a.id !== id);
    await this.save(filtered);
    return filtered;
  }

  private async save(agents: CustomAgentRecord[]) {
    const existing = (await this.db.select().from(settings).where(eq(settings.key, AGENTS_KEY)).get()) as
      | { key: string; value: string }
      | undefined;
    const value = JSON.stringify(agents);
    if (existing) {
      this.db.update(settings).set({ value }).where(eq(settings.key, AGENTS_KEY)).run();
    } else {
      this.db.insert(settings).values({ key: AGENTS_KEY, value }).run();
    }
  }
}
