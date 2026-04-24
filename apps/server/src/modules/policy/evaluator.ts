import type { Action } from "@/types";
import { PolicyParser } from "@/modules/policy/parser";
import { RuleService } from "@/modules/rule/service";

export type EvaluatedPolicyDecision = {
  decision: "allow" | "deny" | "rewrite" | "fallback" | "require_human_approval";
  reason: string;
  rewrite?: Record<string, unknown>;
};

export class PolicyEvaluator {
  static evaluatePlan(data: {
    actions: Action[];
    agentsFilePath?: string;
    projectId?: string;
    projectPath?: string;
  }): EvaluatedPolicyDecision {
    const parsed = PolicyParser.parseAgentsFile(data.agentsFilePath);

    if (parsed.forbidCommit && data.actions.includes("commit")) {
      return {
        decision: "rewrite",
        reason: "Project policy forbids commit, so commit was removed from the execution plan.",
        rewrite: {
          actions: data.actions.filter((action) => action !== "commit"),
        },
      };
    }

    const blockingRules = RuleService.matchInstructions({
      projectId: data.projectId,
      projectPath: data.projectPath,
      taskType: "plan",
    }).filter(
      (rule) =>
        rule.enabled &&
        rule.action.toLowerCase().includes("deny") &&
        rule.instruction.trim().length > 0,
    );

    if (blockingRules.length > 0) {
      return {
        decision: "require_human_approval",
        reason: `Matched ${blockingRules.length} blocking planning rule(s).`,
      };
    }

    return {
      decision: "allow",
      reason: "Plan allowed by default policy.",
    };
  }

  static evaluateNode(data: {
    action?: Action;
    projectId?: string;
    projectPath?: string;
    agentsFilePath?: string;
  }): EvaluatedPolicyDecision {
    const parsed = PolicyParser.parseAgentsFile(data.agentsFilePath);

    if (data.action === "commit" && parsed.forbidCommit) {
      return {
        decision: "rewrite",
        reason: "Project policy forbids commit, rewriting node execution to review.",
        rewrite: {
          action: "review",
        },
      };
    }

    return {
      decision: "allow",
      reason: `Action '${data.action || "unknown"}' allowed by default policy.`,
    };
  }

  static evaluateFileWrite(data: {
    path: string;
    projectPath?: string;
    agentsFilePath?: string;
  }): EvaluatedPolicyDecision {
    const parsed = PolicyParser.parseAgentsFile(data.agentsFilePath);
    const normalizedPath = data.path.replace(/\\/g, "/");
    const normalizedProjectPath = data.projectPath?.replace(/\\/g, "/");

    if (normalizedPath.endsWith(".env") || normalizedPath.includes("/secrets/") || normalizedPath.includes("credentials")) {
      return {
        decision: "deny",
        reason: `Policy denied write to sensitive path '${data.path}'.`,
      };
    }

    if (normalizedProjectPath && !normalizedPath.startsWith(normalizedProjectPath)) {
      return {
        decision: "deny",
        reason: `Policy denied write outside project path '${data.projectPath}'.`,
      };
    }

    if (parsed.requiresSandbox && normalizedPath.includes("/tmp/")) {
      return {
        decision: "require_human_approval",
        reason: "Sandbox-required project attempted write in temporary path.",
      };
    }

    return {
      decision: "allow",
      reason: `File write allowed for '${data.path}'.`,
    };
  }

  static evaluateToolCall(data: {
    toolName: string;
    projectPath?: string;
    agentsFilePath?: string;
  }): EvaluatedPolicyDecision {
    const parsed = PolicyParser.parseAgentsFile(data.agentsFilePath);

    if (parsed.requiresSandbox && data.toolName === "local-filesystem-write") {
      return {
        decision: "fallback",
        reason: "Project requires sandbox, falling back from local filesystem write.",
        rewrite: { toolName: "sandbox-filesystem-write" },
      };
    }

    if (["rm", "git-reset-hard", "dangerous-delete"].includes(data.toolName)) {
      return {
        decision: "deny",
        reason: `Policy denied dangerous tool '${data.toolName}'.`,
      };
    }

    return {
      decision: "allow",
      reason: `Tool '${data.toolName}' allowed by default policy.`,
    };
  }
}
