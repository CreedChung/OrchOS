import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { generateId } from "@/utils";
import { ProjectService } from "@/modules/project/service";
import { RuntimeService } from "@/modules/runtime/service";
import { SandboxService } from "@/modules/sandbox/service";
import { CommandService } from "@/modules/command/service";
import { RuleService } from "@/modules/rule/service";
import { FilesystemService } from "@/modules/filesystem/service";
import { ActivityService } from "@/modules/activity/service";

type MessageTraceEvent =
  | { kind: "message"; text: string }
  | { kind: "thought"; text: string }
  | {
      kind: "tool";
      toolName?: string;
      toolCallId?: string;
      state?: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
    };

export interface Conversation {
  id: string;
  title?: string;
  projectId?: string;
  agentId?: string;
  runtimeId?: string;
  archived: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  error?: string;
  responseTime?: number;
  executionMode?: "sandbox" | "local";
  sandboxStatus?: "created" | "reused" | "fallback" | "required_failed";
  sandboxVmId?: string;
  projectId?: string;
  projectName?: string;
  clarificationQuestions?: string[];
  trace?: MessageTraceEvent[];
  createdAt: string;
}

export interface CreationDispatchResult {
  needsClarification: boolean;
  questions: string[];
  command: {
    id: string;
    instruction: string;
    agentNames: string[];
    projectIds: string[];
    goalId: string | null;
    status: string;
    createdAt: string;
  };
  trace?: MessageTraceEvent[];
  goals: Array<{
    id: string;
    title: string;
    assignedAgentName?: string;
  }>;
}

interface MessageMetadata {
  executionMode?: "sandbox" | "local";
  sandboxStatus?: "created" | "reused" | "fallback" | "required_failed";
  sandboxVmId?: string;
  projectId?: string;
  projectName?: string;
  clarificationQuestions?: string[];
  trace?: MessageTraceEvent[];
}

function parseJsonSafely<T>(value: string | null | undefined): T | undefined {
  if (!value) return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function buildProjectInstructionPrompt(options: {
  projectName?: string;
  projectPath?: string;
  agentsContent?: string;
  activeRules?: Array<{ name: string; condition: string; action: string; instruction: string; priority: string }>;
}) {
  const sections: string[] = [];

  if (options.projectName || options.projectPath) {
    sections.push(
      [
        "Project Context:",
        options.projectName ? `- Name: ${options.projectName}` : null,
        options.projectPath ? `- Path: ${options.projectPath}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (options.agentsContent?.trim()) {
    sections.push(["Project Instructions (AGENTS.md):", options.agentsContent.trim()].join("\n"));
  }

  if (options.activeRules && options.activeRules.length > 0) {
    sections.push(
      [
        "Active Rules:",
        ...options.activeRules.map(
          (rule, index) => `${index + 1}. ${rule.name} [when: ${rule.condition}] [action: ${rule.action}] [priority: ${rule.priority}]\n${rule.instruction}`,
        ),
      ].join("\n"),
    );
  }

  if (sections.length === 0) {
    return "";
  }

  return [
    "System Instructions:",
    "Use the following project instructions and active rules while responding.",
    ...sections,
  ].join("\n\n");
}

export abstract class ConversationService {
  static create(data: {
    title?: string;
    projectId?: string;
    agentId?: string;
    runtimeId?: string;
  }): Conversation {
    const id = generateId("conv");
    const now = new Date().toISOString();

    db.insert(conversations)
      .values({
        id,
        title: data.title || null,
        projectId: data.projectId || null,
        agentId: data.agentId || null,
        runtimeId: data.runtimeId || null,
        archived: "false",
        deleted: "false",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return {
      id,
      title: data.title,
      projectId: data.projectId,
      agentId: data.agentId,
      runtimeId: data.runtimeId,
      archived: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  static get(id: string): Conversation | undefined {
    const row = db.select().from(conversations).where(eq(conversations.id, id)).get();
    if (!row) return undefined;
    return ConversationService.mapRow(row);
  }

  static list(): Conversation[] {
    return db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt))
      .all()
      .map(ConversationService.mapRow);
  }

  static update(
    id: string,
    data: {
      title?: string;
      projectId?: string;
      agentId?: string;
      runtimeId?: string;
      archived?: boolean;
      deleted?: boolean;
    },
  ): Conversation | undefined {
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.projectId !== undefined) updates.projectId = data.projectId || null;
    if (data.agentId !== undefined) updates.agentId = data.agentId || null;
    if (data.runtimeId !== undefined) updates.runtimeId = data.runtimeId || null;
    if (data.archived !== undefined) updates.archived = String(data.archived);
    if (data.deleted !== undefined) updates.deleted = String(data.deleted);
    updates.updatedAt = new Date().toISOString();

    if (Object.keys(updates).length === 1 && updates.updatedAt) {
      // Only updatedAt, still update
    }

    db.update(conversations).set(updates).where(eq(conversations.id, id)).run();
    return ConversationService.get(id);
  }

  static delete(id: string, options?: { permanent?: boolean }): boolean {
    const existing = ConversationService.get(id);
    if (!existing) return false;

    if (!options?.permanent) {
      db.update(conversations)
        .set({ deleted: "true", archived: "false", updatedAt: new Date().toISOString() })
        .where(eq(conversations.id, id))
        .run();
      return true;
    }

    db.delete(conversations).where(eq(conversations.id, id)).run();
    return true;
  }

  static clearDeleted(): number {
    const deletedConversations = db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.deleted, "true"))
      .all();

    for (const conversation of deletedConversations) {
      db.delete(conversations).where(eq(conversations.id, conversation.id)).run();
    }

    return deletedConversations.length;
  }

  static getMessages(conversationId: string): Message[] {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt), asc(messages.id))
      .all()
      .map(ConversationService.mapMessageRow);
  }

  static addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    error?: string,
    responseTime?: number,
    metadata?: MessageMetadata,
  ): Message {
    const id = generateId("msg");
    const now = new Date().toISOString();

    db.insert(messages)
      .values({
        id,
        conversationId,
        role,
        content,
        trace: metadata?.trace ? JSON.stringify(metadata.trace) : null,
        error: error || null,
        responseTime: responseTime != null ? String(responseTime) : null,
        executionMode: metadata?.executionMode || null,
        sandboxStatus: metadata?.sandboxStatus || null,
        sandboxVmId: metadata?.sandboxVmId || null,
        projectId: metadata?.projectId || null,
        projectName: metadata?.projectName || null,
        clarificationQuestions: metadata?.clarificationQuestions
          ? JSON.stringify(metadata.clarificationQuestions)
          : null,
        createdAt: now,
      })
      .run();

    // Update conversation timestamp
    db.update(conversations)
      .set({ updatedAt: now })
      .where(eq(conversations.id, conversationId))
      .run();

    return {
      id,
      conversationId,
      role,
      content,
      error,
      responseTime,
      executionMode: metadata?.executionMode,
      sandboxStatus: metadata?.sandboxStatus,
      sandboxVmId: metadata?.sandboxVmId,
      projectId: metadata?.projectId,
      projectName: metadata?.projectName,
      clarificationQuestions: metadata?.clarificationQuestions,
      trace: metadata?.trace,
      createdAt: now,
    };
  }

  static async sendAndReply(conversationId: string, userContent: string): Promise<Message> {
    const conv = ConversationService.get(conversationId);
    if (!conv) throw new Error("Conversation not found");

    // Add user message
    ConversationService.addMessage(conversationId, "user", userContent);

    // Determine runtime to use
    const runtimeId = conv.runtimeId;
    if (!runtimeId) {
      const errorMsg =
        "No runtime configured for this conversation. Please select an agent/runtime.";
      const msg = ConversationService.addMessage(conversationId, "assistant", errorMsg, errorMsg);
      return msg;
    }

    const runtime = RuntimeService.get(runtimeId);

    // Get all previous messages for context
    const allMessages = ConversationService.getMessages(conversationId);
    const contextMessages = allMessages.slice(0, -1); // Exclude the assistant error message we haven't added yet

    const project = conv.projectId ? ProjectService.get(conv.projectId) : undefined;
    const projectInstructionsPath = project?.path ? `${project.path.replace(/\/$/, "")}/AGENTS.md` : undefined;
    const agentsFile = projectInstructionsPath
      ? FilesystemService.readFile(projectInstructionsPath).content ?? undefined
      : undefined;
    const ruleEvaluation = RuleService.evaluateInstructions({
      projectId: project?.id,
      projectPath: project?.path,
      agentId: conv.agentId,
      taskType: "chat",
    });
    const matchedRuleIds = new Set(ruleEvaluation.filter((rule) => rule.matched).map((rule) => rule.id));
    const matchedRules = RuleService.matchInstructions({
      projectId: project?.id,
      projectPath: project?.path,
      agentId: conv.agentId,
      taskType: "chat",
    });
    const activeRules = matchedRules
      .map((rule) => ({
        name: rule.name,
        condition: rule.condition,
        action: rule.action,
        instruction: rule.instruction,
        priority: rule.priority,
      }));
    const compiledInstructions = buildProjectInstructionPrompt({
      projectName: project?.name,
      projectPath: project?.path,
      agentsContent: agentsFile,
      activeRules,
    });

    // Build prompt with conversation context
    const contextPrompt = contextMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const conversationPrompt = contextPrompt
      ? `${contextPrompt}\n\nUser: ${userContent}\n\nAssistant:`
      : userContent;

    const prompt = compiledInstructions
      ? `${compiledInstructions}\n\n${conversationPrompt}`
      : conversationPrompt;

    try {
      const startTime = Date.now();
      const projectMetadata = {
        projectId: project?.id,
        projectName: project?.name,
      };
      let result:
        | {
            success: boolean;
            output: string;
            error?: string;
            agentName: string;
            responseTime: number;
            metadata?: MessageMetadata;
          }
        | undefined;

      const shouldUseSandbox = !!conv.projectId;

      if (shouldUseSandbox) {
        let vm = SandboxService.getRunningVMForProject(conv.projectId);
        let sandboxStatus: MessageMetadata["sandboxStatus"] = vm ? "reused" : undefined;
        let sandboxFailureReason: string | undefined;

        if (!vm) {
          try {
            vm = await SandboxService.createVM({
              projectId: conv.projectId,
              agentType: runtimeId,
            });
            sandboxStatus = "created";
          } catch (err) {
            sandboxFailureReason =
              err instanceof Error ? err.message : "Failed to create sandbox for this project.";
            vm = undefined;
          }
        }

        if (vm) {
          let sessionId: string | undefined;

          try {
            const session = await SandboxService.createSession(vm.vmId, {
              agentType: runtimeId,
            });
            sessionId = session.sessionId;

            const sandboxResult = await SandboxService.sendPrompt(session.sessionId, prompt);
            result = {
              success: sandboxResult.success,
              output: sandboxResult.text,
              error: sandboxResult.success ? undefined : sandboxResult.text,
              agentName: runtimeId,
              responseTime: Date.now() - startTime,
              metadata: {
                executionMode: "sandbox",
                sandboxStatus,
                sandboxVmId: vm.vmId,
                trace: matchedRules.length > 0
                  ? [
                      {
                        kind: "tool" as const,
                        toolName: "matched_rules",
                        toolCallId: `matched-rules-${conversationId}`,
                        state: "output-available",
                        output: ruleEvaluation,
                      },
                    ]
                  : undefined,
                ...projectMetadata,
              },
            };
          } catch (err) {
            sandboxFailureReason =
              err instanceof Error ? err.message : "Failed to execute prompt in sandbox.";
            result = undefined;
          } finally {
            if (sessionId) {
              try {
                SandboxService.closeSession(sessionId);
              } catch {}
            }
          }
        }

        if (!result) {
          const sandboxError =
            sandboxFailureReason || "Sandbox is required for project-bound chats, but startup failed.";
          return ConversationService.addMessage(
            conversationId,
            "assistant",
            sandboxError,
            sandboxError,
            Date.now() - startTime,
            {
              executionMode: "sandbox",
              sandboxStatus: "required_failed",
              sandboxVmId: vm?.vmId,
              ...projectMetadata,
            },
          );
        }
      }

      if (!result) {
        result = await RuntimeService.chat(runtimeId, prompt, {
          conversationId,
          cwd: project?.path,
        });
        result.metadata = {
          executionMode: "local",
          sandboxStatus: conv.projectId ? "fallback" : undefined,
          trace:
            matchedRules.length > 0
              ? [
                  {
                    kind: "tool" as const,
                    toolName: "matched_rules",
                    toolCallId: `matched-rules-${conversationId}`,
                    state: "output-available",
                    output: ruleEvaluation,
                  },
                ]
              : undefined,
          ...projectMetadata,
        };
      }

      if (matchedRuleIds.size > 0 && contextMessages.length > 0) {
        ActivityService.add(
          conv.id,
          runtime?.name || runtimeId,
          "rules_matched",
          `${matchedRuleIds.size} rule(s) matched for chat`,
          ruleEvaluation
            .filter((rule) => rule.matched)
            .map((rule) => `${rule.name} [${rule.priority}]`)
            .join("\n"),
        );
      }

      const responseTime = Date.now() - startTime;

      const msg = ConversationService.addMessage(
        conversationId,
        "assistant",
        result.output || result.error || "No response",
        result.success ? undefined : result.error,
        responseTime,
        result.metadata,
      );
      return msg;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to get response";
      const msg = ConversationService.addMessage(conversationId, "assistant", errorMsg, errorMsg);
      return msg;
    }
  }

  static async createGoalsFromConversation(
    conversationId: string,
    instruction: string,
    options?: {
      runtimeId?: string;
      agentNames?: string[];
      projectIds?: string[];
    },
  ): Promise<CreationDispatchResult> {
    const conv = ConversationService.get(conversationId);
    if (!conv) throw new Error("Conversation not found");

    const runtimeId = options?.runtimeId || conv.runtimeId;
    if (!runtimeId) throw new Error("No runtime configured for this conversation");

    ConversationService.addMessage(conversationId, "user", instruction);

    const history = ConversationService.getMessages(conversationId)
      .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
      .join("\n\n");

    const planningInstruction = history ? `Conversation context:\n${history}` : instruction;

    const command = CommandService.create({
      instruction: planningInstruction,
      agentNames: options?.agentNames,
      projectIds: conv.projectId ? [conv.projectId] : options?.projectIds,
    });

    const result = await CommandService.dispatchAsync(command, runtimeId, { conversationId });

    if (result.needsClarification) {
      ConversationService.addMessage(
        conversationId,
        "assistant",
        ["I identified a few ambiguities while planning and resolved them internally.", ...result.questions.map((question, index) => `${index + 1}. ${question}`)].join("\n"),
        undefined,
        undefined,
        {
          clarificationQuestions: result.questions,
          trace: result.trace,
        },
      );
      return result;
    }

    ConversationService.addMessage(
      conversationId,
      "assistant",
      [
        `Created ${result.goals.length} task${result.goals.length === 1 ? "" : "s"}.`,
        ...result.goals.map((goal, index) => `${index + 1}. ${goal.title}${goal.assignedAgentName ? ` -> ${goal.assignedAgentName}` : ""}`),
      ].join("\n"),
      undefined,
      undefined,
      {
        trace: result.trace,
      },
    );

    return result;
  }

  static mapRow(row: typeof conversations.$inferSelect): Conversation {
    return {
      id: row.id,
      title: row.title || undefined,
      projectId: row.projectId || undefined,
      agentId: row.agentId || undefined,
      runtimeId: row.runtimeId || undefined,
      archived: row.archived === "true",
      deleted: row.deleted === "true",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static mapMessageRow(row: typeof messages.$inferSelect): Message {
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role as "user" | "assistant",
      content: row.content,
      error: row.error || undefined,
      responseTime: row.responseTime ? Number(row.responseTime) : undefined,
      executionMode:
        row.executionMode === "sandbox" || row.executionMode === "local"
          ? row.executionMode
          : undefined,
      sandboxStatus:
        row.sandboxStatus === "created" ||
        row.sandboxStatus === "reused" ||
        row.sandboxStatus === "fallback" ||
        row.sandboxStatus === "required_failed"
          ? row.sandboxStatus
          : undefined,
      sandboxVmId: row.sandboxVmId || undefined,
      projectId: row.projectId || undefined,
      projectName: row.projectName || undefined,
      clarificationQuestions: parseJsonSafely<string[]>(row.clarificationQuestions),
      trace: parseJsonSafely<MessageTraceEvent[]>(row.trace),
      createdAt: row.createdAt,
    };
  }
}
