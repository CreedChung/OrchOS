import { beforeEach, describe, expect, it, vi } from "vitest";

type ParserState = {
  requiresSandbox: boolean;
  forbidCommit: boolean;
};

type RuleMatch = {
  enabled: boolean;
  action: string;
  instruction: string;
};

async function loadEvaluator(parserState: ParserState, ruleMatches: RuleMatch[]) {
  vi.resetModules();
  vi.doMock("@/modules/policy/parser", () => ({
    PolicyParser: {
      parseAgentsFile: vi.fn(() => ({ ...parserState })),
    },
  }));
  vi.doMock("@/modules/rule/service", () => ({
    RuleService: {
      matchInstructions: vi.fn(() => ruleMatches),
    },
  }));

  return import("./evaluator");
}

describe("PolicyEvaluator", () => {
  let parserState: ParserState;
  let ruleMatches: RuleMatch[];

  beforeEach(() => {
    parserState = {
      requiresSandbox: false,
      forbidCommit: false,
    };
    ruleMatches = [];
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("allows plans by default", async () => {
    const { PolicyEvaluator } = await loadEvaluator(parserState, ruleMatches);
    const result = PolicyEvaluator.evaluatePlan({
      actions: ["write_code", "run_tests"],
    });

    expect(result.decision).toBe("allow");
    expect(result.reason).toContain("default policy");
  });

  it("rewrites plan actions when commit is forbidden", async () => {
    parserState.forbidCommit = true;
    const { PolicyEvaluator } = await loadEvaluator(parserState, ruleMatches);
    const result = PolicyEvaluator.evaluatePlan({
      actions: ["write_code", "commit", "review"],
    });

    expect(result.decision).toBe("rewrite");
    expect(result.rewrite?.actions).toEqual(["write_code", "review"]);
  });

  it("requires human approval when blocking plan rules match", async () => {
    ruleMatches = [
      {
        enabled: true,
        action: "deny_plan",
        instruction: "Require a human to approve risky plans.",
      },
    ];
    const { PolicyEvaluator } = await loadEvaluator(parserState, ruleMatches);
    const result = PolicyEvaluator.evaluatePlan({
      actions: ["write_code"],
      projectId: "proj_1",
      projectPath: "/tmp/project",
    });

    expect(result.decision).toBe("require_human_approval");
  });

  it("rewrites commit nodes to review when commit is forbidden", async () => {
    parserState.forbidCommit = true;
    const { PolicyEvaluator } = await loadEvaluator(parserState, ruleMatches);
    const result = PolicyEvaluator.evaluateNode({
      action: "commit",
    });

    expect(result.decision).toBe("rewrite");
    expect(result.rewrite).toEqual({ action: "review" });
  });

  it("falls back tool calls when sandbox is required", async () => {
    parserState.requiresSandbox = true;
    const { PolicyEvaluator } = await loadEvaluator(parserState, ruleMatches);
    const result = PolicyEvaluator.evaluateToolCall({
      toolName: "local-filesystem-write",
    });

    expect(result.decision).toBe("fallback");
    expect(result.rewrite).toEqual({ toolName: "sandbox-filesystem-write" });
  });

  it("denies writes to sensitive paths", async () => {
    const { PolicyEvaluator } = await loadEvaluator(parserState, ruleMatches);
    const result = PolicyEvaluator.evaluateFileWrite({
      path: "/workspace/project/.env",
      projectPath: "/workspace/project",
    });

    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("sensitive path");
  });
});
