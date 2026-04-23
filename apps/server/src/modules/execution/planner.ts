import { RuntimeService } from "@/modules/runtime/service";
import { AgentService } from "@/modules/agent/service";
import type { AcpTraceEvent } from "@/modules/runtime/acp";
import type { Action } from "@/types";

export interface PlannedGoal {
  title: string;
  description: string;
  successCriteria: string[];
  actions: Action[];
  assignedAgentName?: string;
}

function inferActionsForGoal(goal: Pick<PlannedGoal, "title" | "description">): Action[] {
  const text = `${goal.title} ${goal.description}`.toLowerCase();
  const isAnalysisTask = /\banaly[sz]e\b|analysis|architecture|overview|investigate|audit|document|report|summary|summarize|explain|了解|分析|架构|文档|报告|总结|说明/.test(text);
  const isImplementationTask = /implement|build|create|add|fix|refactor|update|write code|develop|修改|修复|实现|开发|重构/.test(text);

  if (isAnalysisTask && !isImplementationTask) {
    return [];
  }

  return ["write_code", "run_tests"];
}

export interface PlanningResult {
  needsClarification: boolean;
  questions: string[];
  goals: PlannedGoal[];
  trace?: AcpTraceEvent[];
}

const PLANNING_PROMPT = `You are a project planner for an AI agent orchestration system.

First, decide whether the request is specific enough to split into execution goals.
- If critical details are missing, respond with needsClarification=true and 1-3 concrete clarification questions.
- If the request is clear enough, respond with needsClarification=false and provide goals.
- The clarification questions are for internal planning only. Do not ask the user directly.

For each goal, provide:
- title: A concise description of what needs to be done
- description: A more detailed explanation
- successCriteria: List of verifiable conditions for completion
- actions: List of actions needed from: write_code, run_tests, fix_bug, commit, review

IMPORTANT: Respond ONLY with a JSON object. No markdown, no explanation, just the raw JSON.

Example format:
{
  "needsClarification": false,
  "questions": [],
  "goals": [
    {
      "title": "Implement user authentication module",
      "description": "Create login/signup endpoints with JWT token management",
      "successCriteria": ["Auth endpoints respond correctly", "JWT tokens are generated and validated"],
      "actions": ["write_code", "run_tests"]
    }
  ]
}

Task to decompose:`;

const INTERNAL_CLARIFICATION_PROMPT = `You are a project planner for an AI agent orchestration system.

The original request had ambiguities. Resolve them yourself using the most reasonable assumptions from the request and conversation context.
- Do not ask the user follow-up questions.
- Treat the clarification questions as internal planning checkpoints.
- Make explicit, conservative assumptions and continue.
- Always respond with needsClarification=false and an empty questions array.

For each goal, provide:
- title: A concise description of what needs to be done
- description: A more detailed explanation
- successCriteria: List of verifiable conditions for completion
- actions: List of actions needed from: write_code, run_tests, fix_bug, commit, review

IMPORTANT: Respond ONLY with a JSON object. No markdown, no explanation, just the raw JSON.

Example format:
{
  "needsClarification": false,
  "questions": [],
  "goals": [
    {
      "title": "Implement user authentication module",
      "description": "Create login/signup endpoints with JWT token management",
      "successCriteria": ["Auth endpoints respond correctly", "JWT tokens are generated and validated"],
      "actions": ["write_code", "run_tests"]
    }
  ]
}

Task to decompose:`;

export abstract class PlanningService {
  static async plan(
    instruction: string,
    runtimeId: string,
    agentNames?: string[],
  ): Promise<PlanningResult> {
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
      if (!parsed.needsClarification && parsed.goals.length === 0) {
        return PlanningService.fallbackPlan(instruction, agentNames);
      }

      return {
        ...parsed,
        goals: parsed.needsClarification ? [] : PlanningService.assignAgents(parsed.goals, availableAgents),
        trace: result.trace,
      };
    } catch {
      return PlanningService.fallbackPlan(instruction, agentNames);
    }
  }

  static async clarifyAndPlan(
    instruction: string,
    questions: string[],
    runtimeId: string,
    agentNames?: string[],
  ): Promise<PlanningResult> {
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

    const prompt = `${INTERNAL_CLARIFICATION_PROMPT}\n\nOriginal request:\n${instruction}\n\nInternal clarification points:\n${questions
      .map((question, index) => `${index + 1}. ${question}`)
      .join("\n")}\n\nAvailable agents:\n${agentInfo || "No specific agents - use any available runtime"}`;

    try {
      const result = await RuntimeService.chat(runtimeId, prompt, {});

      if (!result.success || !result.output) {
        return PlanningService.fallbackPlan(instruction, agentNames);
      }

      const parsed = PlanningService.parsePlan(result.output);
      if (parsed.goals.length === 0) {
        return PlanningService.fallbackPlan(instruction, agentNames);
      }

      return {
        needsClarification: false,
        questions: [],
        goals: PlanningService.assignAgents(parsed.goals, availableAgents),
        trace: result.trace,
      };
    } catch {
      return PlanningService.fallbackPlan(instruction, agentNames);
    }
  }

  private static parsePlan(raw: string): PlanningResult {
    let text = raw.trim();

    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      text = jsonBlockMatch[1].trim();
    }

    const objectMatch = text.match(/\{[\s\S]*\}/);
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (!objectMatch && !arrayMatch) {
      return { needsClarification: false, questions: [], goals: [] };
    }

    try {
      const parsed = JSON.parse(objectMatch?.[0] ?? arrayMatch?.[0] ?? "null");
      if (Array.isArray(parsed)) {
        return {
          needsClarification: false,
          questions: [],
          goals: PlanningService.parseGoals(parsed),
        };
      }

      if (!parsed || typeof parsed !== "object") {
        return { needsClarification: false, questions: [], goals: [] };
      }

      const record = parsed as Record<string, unknown>;
      const needsClarification = record.needsClarification === true;
      const questions = Array.isArray(record.questions) ? record.questions.map(String).filter(Boolean) : [];

      return {
        needsClarification,
        questions: needsClarification ? questions.slice(0, 3) : [],
        goals: needsClarification ? [] : PlanningService.parseGoals(record.goals),
      };
    } catch {
      return { needsClarification: false, questions: [], goals: [] };
    }
  }

  private static parseGoals(raw: unknown): PlannedGoal[] {
    if (!Array.isArray(raw)) return [];

    return raw
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
          : inferActionsForGoal({
              title: String(item.title),
              description: String(item.description || item.title),
            }),
        assignedAgentName: undefined,
      }));
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

  private static fallbackPlan(instruction: string, agentNames?: string[]): PlanningResult {
    const agents = agentNames || [];
    return {
      needsClarification: false,
      questions: [],
      goals: [
        {
          title:
            instruction.length > 80
              ? instruction.slice(0, 77) + "..."
              : instruction,
          description: instruction,
          successCriteria: ["Code implements the instruction", "Tests pass", "Build succeeds"],
          actions: inferActionsForGoal({
            title:
              instruction.length > 80
                ? instruction.slice(0, 77) + "..."
                : instruction,
            description: instruction,
          }),
          assignedAgentName: agents[0],
        },
      ],
    };
  }
}
