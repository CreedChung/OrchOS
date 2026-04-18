import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId } from "@/utils";
import { RuntimeService } from "@/modules/runtime/service";

export interface Conversation {
  id: string;
  title?: string;
  projectId?: string;
  agentId?: string;
  runtimeId?: string;
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
  createdAt: string;
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
    data: { title?: string; projectId?: string; agentId?: string; runtimeId?: string },
  ): Conversation | undefined {
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.projectId !== undefined) updates.projectId = data.projectId || null;
    if (data.agentId !== undefined) updates.agentId = data.agentId || null;
    if (data.runtimeId !== undefined) updates.runtimeId = data.runtimeId || null;
    updates.updatedAt = new Date().toISOString();

    if (Object.keys(updates).length === 1 && updates.updatedAt) {
      // Only updatedAt, still update
    }

    db.update(conversations).set(updates).where(eq(conversations.id, id)).run();
    return ConversationService.get(id);
  }

  static delete(id: string): boolean {
    const existing = ConversationService.get(id);
    if (!existing) return false;
    db.delete(conversations).where(eq(conversations.id, id)).run();
    return true;
  }

  static getMessages(conversationId: string): Message[] {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .all()
      .map(ConversationService.mapMessageRow);
  }

  static addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    error?: string,
    responseTime?: number,
  ): Message {
    const id = generateId("msg");
    const now = new Date().toISOString();

    db.insert(messages)
      .values({
        id,
        conversationId,
        role,
        content,
        error: error || null,
        responseTime: responseTime != null ? String(responseTime) : null,
        createdAt: now,
      })
      .run();

    // Update conversation timestamp
    db.update(conversations)
      .set({ updatedAt: now })
      .where(eq(conversations.id, conversationId))
      .run();

    return { id, conversationId, role, content, error, responseTime, createdAt: now };
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

    // Get all previous messages for context
    const allMessages = ConversationService.getMessages(conversationId);
    const contextMessages = allMessages.slice(0, -1); // Exclude the assistant error message we haven't added yet

    // Build prompt with conversation context
    const contextPrompt = contextMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const prompt = contextPrompt
      ? `${contextPrompt}\n\nUser: ${userContent}\n\nAssistant:`
      : userContent;

    try {
      const startTime = Date.now();
      const result = await RuntimeService.chat(runtimeId, prompt, { conversationId });
      const responseTime = Date.now() - startTime;

      const msg = ConversationService.addMessage(
        conversationId,
        "assistant",
        result.output || result.error || "No response",
        result.success ? undefined : result.error,
        responseTime,
      );
      return msg;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to get response";
      const msg = ConversationService.addMessage(conversationId, "assistant", errorMsg, errorMsg);
      return msg;
    }
  }

  static mapRow(row: typeof conversations.$inferSelect): Conversation {
    return {
      id: row.id,
      title: row.title || undefined,
      projectId: row.projectId || undefined,
      agentId: row.agentId || undefined,
      runtimeId: row.runtimeId || undefined,
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
      createdAt: row.createdAt,
    };
  }
}
