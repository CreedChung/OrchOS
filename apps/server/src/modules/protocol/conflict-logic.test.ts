import { describe, expect, it } from "vitest";

function detectFileOverlap(sideEffects: Array<{ type: string; target: string }>) {
  const seen = new Set<string>();
  for (const effect of sideEffects) {
    if (effect.type !== "file_write") continue;
    if (seen.has(effect.target)) return effect.target;
    seen.add(effect.target);
  }
  return undefined;
}

describe("conflict overlap logic", () => {
  it("detects overlapping file mutation targets", () => {
    expect(
      detectFileOverlap([
        { type: "file_write", target: "/tmp/a.ts" },
        { type: "file_write", target: "/tmp/a.ts" },
      ]),
    ).toBe("/tmp/a.ts");
  });

  it("ignores non-overlapping targets", () => {
    expect(
      detectFileOverlap([
        { type: "file_write", target: "/tmp/a.ts" },
        { type: "tool_call", target: "git-status" },
      ]),
    ).toBeUndefined();
  });
});
