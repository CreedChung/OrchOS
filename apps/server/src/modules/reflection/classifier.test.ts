import { describe, expect, it } from "vitest";

import { ReflectionClassifier } from "./classifier";

describe("ReflectionClassifier", () => {
  it("classifies failed execution as failed_node", () => {
    expect(ReflectionClassifier.classify({ success: false, message: "failed" })).toBe("failed_node");
  });

  it("classifies rewritten success as rewrite_heavy", () => {
    expect(
      ReflectionClassifier.classify({ success: true, message: "ok", policyRewritten: true }),
    ).toBe("rewrite_heavy");
  });

  it("builds stable signatures", () => {
    expect(
      ReflectionClassifier.signature({ kind: "failed_node", nodeLabel: "node_1", message: "boom" }),
    ).toContain("failed_node::node_1::boom");
  });
});
