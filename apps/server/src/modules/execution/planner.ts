import { RuntimeService } from "@/modules/runtime/service";
import { AgentService } from "@/modules/agent/service";
import type { Action } from "@/types";

export interface PlannedGoal {
  title: string;
  description: string;
  successCriteria: string[];
  actions: Action[];
  assignedAgentName?: string;
}

const PLANNING_PROMPT = `You are a project planner for an AI agent orchestration system. Break down the following task into specific, actionable goals.

For each goal, provide:
- title: A concise description of what needs to be done
- description: A more detailed explanation
- successCriteria: List of verifiable conditions for completion
- actions: List of actions needed from: write_code, run_tests, fix_bug, commit, review

IMPORTANT: Respond ONLY with a JSON array. No markdown, no explanation, just the raw JSON.

Example format:
[
  {
    "title": "Implement user authentication module",
    "description": "Create login/signup endpoints with JWT token management",
    "successCriteria": ["Auth endpoints respond correctly", "JWT tokens are generated and validated"],
    "actions": ["write_code", "run_tests"]
  }
]

Task to decompose:`;

export abstract class PlanningService {
  static async plan(
    instruction: string,
    runtimeId: string,
    agentNames?: string[],
  ): Promise<PlannedGoal[]> {
    const runtime = RuntimeService.get(runtimeId);
    if (!runtime) {
      return PlanningService.fallbackPlan(instruction, agentNames);
    }

    const availableAgents = AgentService.list().filter(
      (a) => a.enabled && a.status !== "error",
    );

    const agentInfo = availableAgents
      .map((a) => `- ${a.name}: ${a.role} (capabilities: ${a.capabilities.join(", ")})`)
      .join("\n");

    const prompt = `${PLANNING_PROMPT}\n\n${instruction}\n\nAvailable agents:\n${agentInfo || "No specific agents - use any available runtime"}`;

    try {
      const result = await RuntimeService.chat(runtimeId, prompt, {});

      if (!result.success || !result.output) {
        return PlanningService.fallbackPlan(instruction, agentNames);
      }

      const parsed = PlanningService.parsePlan(result.output);
      if (parsed.length === 0) {
        return PlanningService.fallbackPlan(instruction, agentNames);
      }

      return PlanningService.assignAgents(parsed, availableAgents);
    } catch {
      return PlanningService.fallbackPlan(instruction, agentNames);
    }
  }

  private static parsePlan(raw: string): PlannedGoal[] {
    let text = raw.trim();

    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      text = jsonBlockMatch[1].trim();
    }

    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return [];

    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (item: unknown) =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as Record<string, unknown>).title === "string",
        )
        .map((item: Record<string, unknown>) => ({
          title: String(item.title),
          description: String(item.description || item.title),
          successCriteria: Array.isArray(item.successCriteria)
            ? item.successCriteria.map(String)
            : ["completed"],
          actions: Array.isArray(item.actions)
            ? (item.actions as string[]).filter((a: string) =>
                ["write_code", "run_tests", "fix_bug", "commit", "review"].includes(a),
              )
            : ["write_code"],
          assignedAgentName: undefined,
        }));
    } catch {
      return [];
    }
  }

  private static assignAgents(
    goals: PlannedGoal[],
    agents: ReturnType<typeof AgentService.list>[],
  ): PlannedGoal[] {
    if (agents.length === 0) return goals;

    return goals.map((goal) => {
      const requiredActions = goal.actions as Action[];
      const bestAgent = agents
        .filter((a) => requiredActions.some((action) => a.capabilities.includes(action)))
        .sort((a, b) => {
          if (a.status === "idle" && b.status !== "idle") return -1;
          if (a.status !== "idle" && b.status === "idle") return 1;
          return 0;
        })[0];

      return {
        ...goal,
        assignedAgentName: bestAgent?.name,
      };
    });
  }

  private static fallbackPlan(instruction: string, agentNames?: string[]): PlannedGoal[] {
    const agents = agentNames || [];
    return [
      {
        title:
          instruction.length > 80
            ? instruction.slice(0, 77) + "..."
            : instruction,
        description: instruction,
        successCriteria: ["Code implements the instruction", "Tests pass", "Build succeeds"],
        actions: ["write_code", "run_tests"],
        assignedAgentName: agents[0],
      },
    ];
  }
}
