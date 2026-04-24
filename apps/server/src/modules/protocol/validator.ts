import type { AgentTaskInput, AgentTaskOutput } from "@/types";

export abstract class ProtocolValidator {
  static validateInput(input: AgentTaskInput) {
    return Boolean(input.taskId && input.goalId && input.title && input.instruction);
  }

  static validateOutput(output: AgentTaskOutput) {
    return Boolean(output.taskId && output.summary);
  }
}
