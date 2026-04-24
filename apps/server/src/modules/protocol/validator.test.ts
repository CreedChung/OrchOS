import { describe, expect, it } from "vitest";

import { ProtocolValidator } from "./validator";

describe("ProtocolValidator", () => {
  it("validates minimal agent task input", () => {
    expect(
      ProtocolValidator.validateInput({
        taskId: "task_1",
        goalId: "goal_1",
        title: "Implement feature",
        instruction: "Do the work",
      }),
    ).toBe(true);
  });

  it("rejects incomplete agent task input", () => {
    expect(
      ProtocolValidator.validateInput({
        taskId: "",
        goalId: "goal_1",
        title: "",
        instruction: "",
      }),
    ).toBe(false);
  });

  it("validates minimal agent task output", () => {
    expect(
      ProtocolValidator.validateOutput({
        taskId: "task_1",
        success: true,
        summary: "Done",
      }),
    ).toBe(true);
  });
});
