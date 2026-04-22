import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inboxMessages, inboxThreads } from "@/db/schema";
import { generateId, timestamp } from "@/utils";
import type {
  InboxMessage,
  InboxMessageType,
  InboxPriority,
  InboxThread,
  InboxThreadKind,
  InboxThreadStatus,
} from "@/types";

function parseJsonSafely<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeTimestamp(value: unknown) {
  return typeof value === "string" ? value : new Date(0).toISOString();
}

export abstract class InboxService {
  static createThread(data: {
    kind: InboxThreadKind;
    title: string;
    summary?: string;
    projectId?: string;
    conversationId?: string;
    commandId?: string;
    primaryGoalId?: string;
    createdByType: "user" | "agent" | "system";
    createdById?: string;
    createdByName: string;
    priority?: InboxPriority;
  }): InboxThread {
    const id = generateId("thr");
    const now = timestamp();

    db.insert(inboxThreads)
      .values({
        id,
        kind: data.kind,
        status: "open",
        priority: data.priority || "warning",
        title: data.title,
        summary: data.summary || null,
        projectId: data.projectId || null,
        conversationId: data.conversationId || null,
        commandId: data.commandId || null,
        primaryGoalId: data.primaryGoalId || null,
        createdByType: data.createdByType,
        createdById: data.createdById || null,
        createdByName: data.createdByName,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
        archived: "false",
      })
      .run();

    return this.getThread(id)!;
  }

  static listThreads(filters?: {
    kind?: InboxThreadKind;
    status?: InboxThreadStatus;
    projectId?: string;
    conversationId?: string;
  }): InboxThread[] {
    const conditions = [];
    if (filters?.kind) conditions.push(eq(inboxThreads.kind, filters.kind));
    if (filters?.status) conditions.push(eq(inboxThreads.status, filters.status));
    if (filters?.projectId) conditions.push(eq(inboxThreads.projectId, filters.projectId));
    if (filters?.conversationId) conditions.push(eq(inboxThreads.conversationId, filters.conversationId));

    let query = db.select().from(inboxThreads).orderBy(desc(inboxThreads.lastMessageAt));
    if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
    return query.all().map(this.mapThreadRow);
  }

  static getThread(id: string): InboxThread | undefined {
    const row = db.select().from(inboxThreads).where(eq(inboxThreads.id, id)).get();
    return row ? this.mapThreadRow(row) : undefined;
  }

  static updateThread(
    id: string,
    patch: {
      title?: string;
      summary?: string;
      status?: InboxThreadStatus;
      priority?: InboxPriority;
      primaryGoalId?: string;
      archived?: boolean;
    },
  ): InboxThread | undefined {
    const existing = this.getThread(id);
    if (!existing) return undefined;

    const updates: Partial<typeof inboxThreads.$inferInsert> = { updatedAt: timestamp() };
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.summary !== undefined) updates.summary = patch.summary || null;
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.priority !== undefined) updates.priority = patch.priority;
    if (patch.primaryGoalId !== undefined) updates.primaryGoalId = patch.primaryGoalId || null;
    if (patch.archived !== undefined) updates.archived = String(patch.archived);

    db.update(inboxThreads).set(updates).where(eq(inboxThreads.id, id)).run();
    return this.getThread(id);
  }

  static addMessage(data: {
    threadId: string;
    messageType: InboxMessageType;
    senderType: "user" | "agent" | "system";
    senderId?: string;
    senderName: string;
    subject?: string;
    body: string;
    to?: string[];
    cc?: string[];
    goalId?: string;
    stateId?: string;
    problemId?: string;
    metadata?: Record<string, unknown>;
  }): InboxMessage {
    const id = generateId("imsg");
    const now = timestamp();

    db.insert(inboxMessages)
      .values({
        id,
        threadId: data.threadId,
        messageType: data.messageType,
        senderType: data.senderType,
        senderId: data.senderId || null,
        senderName: data.senderName,
        subject: data.subject || null,
        body: data.body,
        to: JSON.stringify(data.to || []),
        cc: JSON.stringify(data.cc || []),
        goalId: data.goalId || null,
        stateId: data.stateId || null,
        problemId: data.problemId || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        createdAt: now,
      })
      .run();

    db.update(inboxThreads)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(inboxThreads.id, data.threadId))
      .run();

    return this.getMessages(data.threadId).find((message) => message.id === id)!;
  }

  static getMessages(threadId: string): InboxMessage[] {
    return db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.threadId, threadId))
      .orderBy(inboxMessages.createdAt)
      .all()
      .map(this.mapMessageRow);
  }

  static createAgentRequestThread(data: {
    title: string;
    body: string;
    summary?: string;
    projectId?: string;
    conversationId?: string;
    commandId?: string;
    recipients: string[];
    cc?: string[];
  }): InboxThread {
    const thread = this.createThread({
      kind: "agent_request",
      title: data.title,
      summary: data.summary,
      projectId: data.projectId,
      conversationId: data.conversationId,
      commandId: data.commandId,
      createdByType: "agent",
      createdByName: "Orchestrator",
      priority: "warning",
    });

    this.addMessage({
      threadId: thread.id,
      messageType: "request",
      senderType: "agent",
      senderName: "Orchestrator",
      subject: data.title,
      body: data.body,
      to: data.recipients,
      cc: data.cc || [],
      metadata: {
        kind: "agent_request",
      },
    });

    return this.getThread(thread.id)!;
  }

  private static mapThreadRow(row: typeof inboxThreads.$inferSelect): InboxThread {
    return {
      id: row.id,
      kind: row.kind as InboxThreadKind,
      status: row.status as InboxThreadStatus,
      priority: row.priority as InboxPriority,
      title: row.title,
      summary: row.summary || undefined,
      projectId: row.projectId || undefined,
      conversationId: row.conversationId || undefined,
      commandId: row.commandId || undefined,
      primaryGoalId: row.primaryGoalId || undefined,
      createdByType: row.createdByType as InboxThread["createdByType"],
      createdById: row.createdById || undefined,
      createdByName: row.createdByName,
      lastMessageAt: normalizeTimestamp(row.lastMessageAt),
      createdAt: normalizeTimestamp(row.createdAt),
      updatedAt: normalizeTimestamp(row.updatedAt),
      archived: row.archived === "true",
    };
  }

  private static mapMessageRow(row: typeof inboxMessages.$inferSelect): InboxMessage {
    return {
      id: row.id,
      threadId: row.threadId,
      messageType: row.messageType as InboxMessageType,
      senderType: row.senderType as InboxMessage["senderType"],
      senderId: row.senderId || undefined,
      senderName: row.senderName,
      subject: row.subject || undefined,
      body: row.body,
      to: parseJsonSafely<string[]>(row.to, []),
      cc: parseJsonSafely<string[]>(row.cc, []),
      goalId: row.goalId || undefined,
      stateId: row.stateId || undefined,
      problemId: row.problemId || undefined,
      metadata: parseJsonSafely<Record<string, unknown> | undefined>(row.metadata, undefined),
      createdAt: normalizeTimestamp(row.createdAt),
    };
  }
}
