import { db } from "../../db"
import { rules } from "../../db/schema"
import { eq } from "drizzle-orm"
import { generateId } from "../../utils"

export interface Rule {
  id: string
  name: string
  condition: string
  action: string
  enabled: boolean
  createdAt: string
}

interface CreateRuleData {
  name: string
  condition: string
  action: string
  enabled?: boolean
}

export const RuleService = {
  list(): Rule[] {
    return db.select().from(rules).all().map(row => ({
      ...row,
      enabled: row.enabled === "true",
    }))
  },

  get(id: string): Rule | null {
    const row = db.select().from(rules).where(eq(rules.id, id)).get()
    if (!row) return null
    return { ...row, enabled: row.enabled === "true" }
  },

  create(data: CreateRuleData): Rule {
    const id = generateId()
    const now = new Date().toISOString()
    const rule = {
      id,
      name: data.name,
      condition: data.condition,
      action: data.action,
      enabled: data.enabled !== false ? "true" : "false",
      createdAt: now,
    }
    db.insert(rules).values(rule).run()
    return { ...rule, enabled: data.enabled !== false }
  },

  update(id: string, data: Partial<Pick<Rule, "name" | "condition" | "action" | "enabled">>): Rule | null {
    const updates: Record<string, unknown> = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.condition !== undefined) updates.condition = data.condition
    if (data.action !== undefined) updates.action = data.action
    if (data.enabled !== undefined) updates.enabled = data.enabled ? "true" : "false"
    db.update(rules).set(updates).where(eq(rules.id, id)).run()
    return RuleService.get(id)
  },

  delete(id: string): boolean {
    const result = db.delete(rules).where(eq(rules.id, id)).run()
    return result.rowsAffected > 0
  },
}
