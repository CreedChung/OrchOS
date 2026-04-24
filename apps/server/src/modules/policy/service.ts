import { db } from "@/db";
import { policyDecisions, policyViolations } from "@/db/schema";
import type { Action } from "@/types";
import { generateId, timestamp } from "@/utils";
import { PolicyEvaluator } from "@/modules/policy/evaluator";

const ALLOWED_ACTIONS: Action[] = ["write_code", "run_tests", "fix_bug", "commit", "review"];

export abstract class PolicyService {
  static validatePlan(data: {
    subjectId: string;
    actions: Action[];
    agentsFilePath?: string;
    projectId?: string;
    projectPath?: string;
  }) {
    const evaluated = PolicyEvaluator.evaluatePlan(data);

    PolicyService.recordDecision({
      subjectType: "execution_plan",
      subjectId: data.subjectId,
      policySource: data.agentsFilePath ? "agents+rules" : "system-default",
      decision: evaluated.decision,
      reason: evaluated.reason,
      rewrite: evaluated.rewrite,
    });

    if (evaluated.decision === "deny" || evaluated.decision === "require_human_approval") {
      PolicyService.recordViolation({
        subjectType: "execution_plan",
        subjectId: data.subjectId,
        policySource: data.agentsFilePath ? "agents+rules" : "system-default",
        reason: evaluated.reason,
        metadata: { actions: data.actions },
      });
      return {
        allowed: false,
        reason: evaluated.reason,
        actions: data.actions,
      };
    }

    return {
      allowed: true,
      reason: evaluated.reason,
      actions: (evaluated.rewrite?.actions as Action[] | undefined) || data.actions,
      decision: evaluated.decision,
    };
  }

  static listDecisions(subjectType?: string, subjectId?: string) {
    return db
      .select()
      .from(policyDecisions)
      .all()
      .filter((row) => {
        if (subjectType && row.subjectType !== subjectType) return false;
        if (subjectId && row.subjectId !== subjectId) return false;
        return true;
      })
      .map((row) => ({
        id: row.id,
        subjectType: row.subjectType,
        subjectId: row.subjectId,
        policySource: row.policySource,
        decision: row.decision,
        reason: row.reason || undefined,
        rewrite: row.rewriteJson ? (JSON.parse(row.rewriteJson) as Record<string, unknown>) : undefined,
        createdAt: row.createdAt,
      }));
  }

  static listViolations(subjectType?: string, subjectId?: string) {
    return db
      .select()
      .from(policyViolations)
      .all()
      .filter((row) => {
        if (subjectType && row.subjectType !== subjectType) return false;
        if (subjectId && row.subjectId !== subjectId) return false;
        return true;
      })
      .map((row) => ({
        id: row.id,
        subjectType: row.subjectType,
        subjectId: row.subjectId,
        policySource: row.policySource,
        reason: row.reason,
        metadata: row.metadataJson
          ? (JSON.parse(row.metadataJson) as Record<string, unknown>)
          : undefined,
        createdAt: row.createdAt,
      }));
  }

  static validateNodeExecution(data: {
    nodeId: string;
    action?: Action;
    goalId: string;
    projectId?: string;
    projectPath?: string;
    agentsFilePath?: string;
  }) {
    if (!data.action || !ALLOWED_ACTIONS.includes(data.action)) {
      const reason = `Action '${data.action || "unknown"}' is not allowed by the default policy.`;
      PolicyService.recordViolation({
        subjectType: "execution_node",
        subjectId: data.nodeId,
        policySource: "system-default",
        reason,
        metadata: { goalId: data.goalId, action: data.action },
      });
      PolicyService.recordDecision({
        subjectType: "execution_node",
        subjectId: data.nodeId,
        policySource: "system-default",
        decision: "deny",
        reason,
      });
      return { allowed: false, reason };
    }

    const evaluated = PolicyEvaluator.evaluateNode({
      action: data.action,
      projectId: data.projectId,
      projectPath: data.projectPath,
      agentsFilePath: data.agentsFilePath,
    });

    if (evaluated.decision === "deny" || evaluated.decision === "require_human_approval") {
      PolicyService.recordViolation({
        subjectType: "execution_node",
        subjectId: data.nodeId,
        policySource: data.agentsFilePath ? "agents+rules" : "system-default",
        reason: evaluated.reason,
        metadata: { goalId: data.goalId, action: data.action },
      });
      PolicyService.recordDecision({
        subjectType: "execution_node",
        subjectId: data.nodeId,
        policySource: data.agentsFilePath ? "agents+rules" : "system-default",
        decision: evaluated.decision,
        reason: evaluated.reason,
      });
      return { allowed: false, reason: evaluated.reason, decision: evaluated.decision };
    }

    if (evaluated.decision === "fallback") {
      return {
        allowed: false,
        reason: evaluated.reason,
        decision: evaluated.decision,
        fallback: evaluated.rewrite,
      };
    }

    if (evaluated.decision === "rewrite") {
      return {
        allowed: true,
        decision: evaluated.decision,
        reason: evaluated.reason,
        rewrite: evaluated.rewrite,
      };
    }

    PolicyService.recordDecision({
      subjectType: "execution_node",
      subjectId: data.nodeId,
      policySource: data.agentsFilePath ? "agents+rules" : "system-default",
      decision: evaluated.decision,
      reason: evaluated.reason,
      rewrite: evaluated.rewrite,
    });
    return { allowed: true, decision: evaluated.decision, reason: evaluated.reason };
  }

  static validateFileWrite(data: {
    subjectId: string;
    path: string;
    projectPath?: string;
    agentsFilePath?: string;
  }) {
    const evaluated = PolicyEvaluator.evaluateFileWrite(data);

    PolicyService.recordDecision({
      subjectType: "file_write",
      subjectId: data.subjectId,
      policySource: data.agentsFilePath ? "agents+rules" : "system-default",
      decision: evaluated.decision,
      reason: evaluated.reason,
      rewrite: evaluated.rewrite,
    });

    if (evaluated.decision === "deny" || evaluated.decision === "require_human_approval") {
      PolicyService.recordViolation({
        subjectType: "file_write",
        subjectId: data.subjectId,
        policySource: data.agentsFilePath ? "agents+rules" : "system-default",
        reason: evaluated.reason,
        metadata: { path: data.path },
      });
      return { allowed: false, decision: evaluated.decision, reason: evaluated.reason };
    }

    return { allowed: true, decision: evaluated.decision, reason: evaluated.reason, rewrite: evaluated.rewrite };
  }

  static validateToolCall(data: {
    subjectId: string;
    toolName: string;
    projectPath?: string;
    agentsFilePath?: string;
  }) {
    const evaluated = PolicyEvaluator.evaluateToolCall(data);

    PolicyService.recordDecision({
      subjectType: "tool_call",
      subjectId: data.subjectId,
      policySource: data.agentsFilePath ? "agents+rules" : "system-default",
      decision: evaluated.decision,
      reason: evaluated.reason,
      rewrite: evaluated.rewrite,
    });

    if (evaluated.decision === "deny" || evaluated.decision === "require_human_approval") {
      PolicyService.recordViolation({
        subjectType: "tool_call",
        subjectId: data.subjectId,
        policySource: data.agentsFilePath ? "agents+rules" : "system-default",
        reason: evaluated.reason,
        metadata: { toolName: data.toolName },
      });
      return { allowed: false, decision: evaluated.decision, reason: evaluated.reason };
    }

    return { allowed: true, decision: evaluated.decision, reason: evaluated.reason, rewrite: evaluated.rewrite };
  }

  static listGraphPolicyOutcomes(nodeIds: string[]) {
    const nodeIdSet = new Set(nodeIds);

    return {
      decisions: PolicyService.listDecisions("execution_node").filter((item) =>
        nodeIdSet.has(item.subjectId),
      ),
      violations: PolicyService.listViolations("execution_node").filter((item) =>
        nodeIdSet.has(item.subjectId),
      ),
    };
  }

  private static recordDecision(data: {
    subjectType: string;
    subjectId: string;
    policySource: string;
    decision: "allow" | "deny" | "rewrite" | "fallback" | "require_human_approval";
    reason?: string;
    rewrite?: Record<string, unknown>;
  }) {
    db.insert(policyDecisions)
      .values({
        id: generateId("pdec"),
        subjectType: data.subjectType,
        subjectId: data.subjectId,
        policySource: data.policySource,
        decision: data.decision,
        reason: data.reason || null,
        rewriteJson: data.rewrite ? JSON.stringify(data.rewrite) : null,
        createdAt: timestamp(),
      })
      .run();
  }

  private static recordViolation(data: {
    subjectType: string;
    subjectId: string;
    policySource: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    db.insert(policyViolations)
      .values({
        id: generateId("pvio"),
        subjectType: data.subjectType,
        subjectId: data.subjectId,
        policySource: data.policySource,
        reason: data.reason,
        metadataJson: data.metadata ? JSON.stringify(data.metadata) : null,
        createdAt: timestamp(),
      })
      .run();
  }
}
