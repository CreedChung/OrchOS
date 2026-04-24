import { db } from "@/db";
import { rules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/utils";

export interface Rule {
  id: string;
  name: string;
  condition: string;
  action: string;
  scope: "global" | "project";
  projectId?: string;
  targetAgentIds: string[];
  pathPatterns: string[];
  taskTypes: string[];
  instruction: string;
  priority: "low" | "normal" | "high";
  enabled: boolean;
  createdAt: string;
}

interface CreateRuleData {
  name: string;
  condition: string;
  action: string;
  scope?: Rule["scope"];
  projectId?: string;
  targetAgentIds?: string[];
  pathPatterns?: string[];
  taskTypes?: string[];
  instruction?: string;
  priority?: Rule["priority"];
  enabled?: boolean;
}

interface RuleMatchContext {
  projectId?: string;
  projectPath?: string;
  agentId?: string;
  taskType: string;
}

export interface MatchedRuleSummary {
  id: string;
  name: string;
  priority: Rule["priority"];
  scope: Rule["scope"];
  taskTypes: string[];
  pathPatterns: string[];
}

export interface RuleEvaluationSummary extends MatchedRuleSummary {
  matched: boolean;
  reasons: string[];
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function mapRuleRow(row: typeof rules.$inferSelect): Rule {
  return {
    ...row,
    scope: row.scope === "project" ? "project" : "global",
    projectId: row.projectId || undefined,
    targetAgentIds: parseJsonArray(row.targetAgentIds),
    pathPatterns: parseJsonArray(row.pathPatterns),
    taskTypes: parseJsonArray(row.taskTypes),
    instruction: row.instruction || "",
    priority: row.priority === "high" || row.priority === "low" ? row.priority : "normal",
    enabled: row.enabled === "true",
  };
}

function globToRegExp(pattern: string) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "::DOUBLE_STAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DOUBLE_STAR::/g, ".*");

  return new RegExp(`^${escaped}$`);
}

function normalizeRulePathInput(value?: string) {
  return (value || "").replace(/\\/g, "/");
}

function getRulePriorityScore(priority: Rule["priority"]) {
  if (priority === "high") return 2;
  if (priority === "low") return 0;
  return 1;
}

function evaluateRule(rule: Rule, context: RuleMatchContext): RuleEvaluationSummary {
  const reasons: string[] = [];

  if (!rule.enabled) reasons.push("rule disabled");
  if (!rule.instruction.trim()) reasons.push("instruction missing");
  if (rule.scope === "project" && rule.projectId && rule.projectId !== context.projectId) reasons.push("projectId mismatch");
  if (rule.targetAgentIds.length > 0 && (!context.agentId || !rule.targetAgentIds.includes(context.agentId))) reasons.push("targetAgentIds mismatch");
  if (rule.taskTypes.length > 0 && !rule.taskTypes.includes(context.taskType)) reasons.push("taskType mismatch");

  if (rule.pathPatterns.length > 0) {
    const projectPath = normalizeRulePathInput(context.projectPath);
    if (!projectPath) {
      reasons.push("pathPatterns mismatch");
    } else {
      const matchesPath = rule.pathPatterns.some((pattern) => {
        const normalizedPattern = normalizeRulePathInput(pattern);
        if (!normalizedPattern) return false;

        try {
          return globToRegExp(normalizedPattern).test(projectPath);
        } catch {
          return projectPath.includes(normalizedPattern.replace(/\*/g, ""));
        }
      });

      if (!matchesPath) reasons.push("pathPatterns mismatch");
    }
  }

  return {
    id: rule.id,
    name: rule.name,
    priority: rule.priority,
    scope: rule.scope,
    taskTypes: rule.taskTypes,
    pathPatterns: rule.pathPatterns,
    matched: reasons.length === 0,
    reasons,
  };
}

export const RuleService = {
  list(): Rule[] {
    return db.select().from(rules).all().map(mapRuleRow);
  },

  get(id: string): Rule | null {
    const row = db.select().from(rules).where(eq(rules.id, id)).get();
    if (!row) return null;
    return mapRuleRow(row);
  },

  create(data: CreateRuleData): Rule {
    const id = generateId();
    const now = new Date().toISOString();
    const rule = {
      id,
      name: data.name,
      condition: data.condition,
      action: data.action,
      scope: data.scope || "global",
      projectId: data.scope === "project" ? (data.projectId ?? null) : null,
      targetAgentIds: JSON.stringify(data.targetAgentIds ?? []),
      pathPatterns: JSON.stringify(data.pathPatterns ?? []),
      taskTypes: JSON.stringify(data.taskTypes ?? []),
      instruction: data.instruction ?? "",
      priority: data.priority ?? "normal",
      enabled: data.enabled !== false ? "true" : "false",
      createdAt: now,
    };
    db.insert(rules).values(rule).run();
    return mapRuleRow(rule);
  },

  update(
    id: string,
    data: Partial<Pick<Rule, "name" | "condition" | "action" | "scope" | "projectId" | "targetAgentIds" | "pathPatterns" | "taskTypes" | "instruction" | "priority" | "enabled">>,
  ): Rule | null {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.condition !== undefined) updates.condition = data.condition;
    if (data.action !== undefined) updates.action = data.action;
    if (data.scope !== undefined) updates.scope = data.scope;
    if (data.projectId !== undefined) updates.projectId = data.projectId || null;
    if (data.targetAgentIds !== undefined) updates.targetAgentIds = JSON.stringify(data.targetAgentIds);
    if (data.pathPatterns !== undefined) updates.pathPatterns = JSON.stringify(data.pathPatterns);
    if (data.taskTypes !== undefined) updates.taskTypes = JSON.stringify(data.taskTypes);
    if (data.instruction !== undefined) updates.instruction = data.instruction;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.enabled !== undefined) updates.enabled = data.enabled ? "true" : "false";
    db.update(rules).set(updates).where(eq(rules.id, id)).run();
    return RuleService.get(id);
  },

  delete(id: string): boolean {
    const existing = RuleService.get(id);
    if (!existing) return false;
    db.delete(rules).where(eq(rules.id, id)).run();
    return true;
  },

  matchInstructions(context: RuleMatchContext): Rule[] {
    return RuleService.list()
      .filter((rule) => evaluateRule(rule, context).matched)
      .sort((a, b) => getRulePriorityScore(b.priority) - getRulePriorityScore(a.priority));
  },

  evaluateInstructions(context: RuleMatchContext): RuleEvaluationSummary[] {
    return RuleService.list()
      .map((rule) => evaluateRule(rule, context))
      .sort((a, b) => Number(b.matched) - Number(a.matched) || getRulePriorityScore(b.priority) - getRulePriorityScore(a.priority));
  },

  summarizeMatchedRules(rules: Rule[]): MatchedRuleSummary[] {
    return rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      priority: rule.priority,
      scope: rule.scope,
      taskTypes: rule.taskTypes,
      pathPatterns: rule.pathPatterns,
    }));
  },
};
