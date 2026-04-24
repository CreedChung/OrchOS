import { describe, expect, it } from "vitest";

import { ContextDiffUtil } from "./diff";

describe("ContextDiffUtil", () => {
  it("applies nested patches without dropping untouched keys", () => {
    const result = ContextDiffUtil.applyPatch(
      {
        goal: { id: "goal_1", status: "active" },
        states: [{ id: "state_1", status: "pending" }],
      },
      {
        goal: { status: "completed" },
      },
    );

    expect(result).toEqual({
      goal: { id: "goal_1", status: "completed" },
      states: [{ id: "state_1", status: "pending" }],
    });
  });

  it("computes reversible object diffs", () => {
    const from = {
      goal: { id: "goal_1", status: "active" },
      nodeResult: { success: false },
    };
    const to = {
      goal: { id: "goal_1", status: "completed" },
    };

    expect(ContextDiffUtil.diff(from, to)).toEqual({
      goal: { status: "completed" },
      nodeResult: null,
    });
  });
});
