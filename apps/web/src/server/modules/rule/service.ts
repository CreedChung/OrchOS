import type { AppDb } from "../../db/types";
import { rules } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../../utils";
import { getRowsAffected } from "../../db/utils";

export interface Rule {
  id: string;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
  createdAt: string;
}

interface CreateRuleData {
  name: string;
  condition: string;
  action: string;
  enabled?: boolean;
}

export const RuleService = {
  async list(db: AppDb): Promise<Rule[]> {
    const rows = await db.select().from(rules).all();
    return rows.map((row) => ({
      ...row,
      enabled: row.enabled === "true",
    }));
  },

  async get(db: AppDb, id: string): Promise<Rule | null> {
    const row = await db.select().from(rules).where(eq(rules.id, id)).get();
    if (!row) return null;
    return { ...row, enabled: row.enabled === "true" };
  },

  async create(db: AppDb, data: CreateRuleData): Promise<Rule> {
    const id = generateId();
    const now = new Date().toISOString();
    const rule = {
      id,
      name: data.name,
      condition: data.condition,
      action: data.action,
      enabled: data.enabled !== false ? "true" : "false",
      createdAt: now,
    };
    await db.insert(rules).values(rule).run();
    return { ...rule, enabled: data.enabled !== false };
  },

  async update(
    db: AppDb,
    id: string,
    data: Partial<Pick<Rule, "name" | "condition" | "action" | "enabled">>,
  ): Promise<Rule | null> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.condition !== undefined) updates.condition = data.condition;
    if (data.action !== undefined) updates.action = data.action;
    if (data.enabled !== undefined) updates.enabled = data.enabled ? "true" : "false";
    await db.update(rules).set(updates).where(eq(rules.id, id)).run();
    return RuleService.get(db, id);
  },

  async delete(db: AppDb, id: string): Promise<boolean> {
    const result = await db.delete(rules).where(eq(rules.id, id)).run();
    return getRowsAffected(result) > 0;
  },
};
