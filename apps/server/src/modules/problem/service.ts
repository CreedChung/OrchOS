import { db } from "../../db"
import { problems } from "../../db/schema"
import { eq, desc, and, inArray } from "drizzle-orm"
import { generateId } from "../../utils"

export type ProblemPriority = "critical" | "warning" | "info"
export type ProblemStatus = "open" | "fixed" | "ignored" | "assigned"

export interface Problem {
  id: string
  title: string
  priority: ProblemPriority
  source?: string
  context?: string
  goalId?: string
  stateId?: string
  status: ProblemStatus
  actions: string[]
  createdAt: string
  updatedAt: string
}

interface CreateProblemData {
  title: string
  priority?: ProblemPriority
  source?: string
  context?: string
  goalId?: string
  stateId?: string
  actions?: string[]
}

export const ProblemService = {
  list(filters?: { status?: ProblemStatus; priority?: ProblemPriority }): Problem[] {
    let query = db.select().from(problems).orderBy(desc(problems.createdAt))
    const conditions = []
    if (filters?.status) conditions.push(eq(problems.status, filters.status))
    if (filters?.priority) conditions.push(eq(problems.priority, filters.priority))
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }
    return query.all().map(row => ({
      ...row,
      priority: row.priority as ProblemPriority,
      status: row.status as ProblemStatus,
      actions: JSON.parse(row.actions || "[]"),
    }))
  },

  get(id: string): Problem | null {
    const row = db.select().from(problems).where(eq(problems.id, id)).get()
    if (!row) return null
    return {
      ...row,
      priority: row.priority as ProblemPriority,
      status: row.status as ProblemStatus,
      actions: JSON.parse(row.actions || "[]"),
    }
  },

  create(data: CreateProblemData): Problem {
    const now = new Date().toISOString()
    const id = generateId()
    const problem: Record<string, unknown> = {
      id,
      title: data.title,
      priority: data.priority || "warning",
      status: "open",
      actions: JSON.stringify(data.actions || []),
      createdAt: now,
      updatedAt: now,
    }
    if (data.source) problem.source = data.source
    if (data.context) problem.context = data.context
    if (data.goalId) problem.goalId = data.goalId
    if (data.stateId) problem.stateId = data.stateId
    db.insert(problems).values(problem as any).run()
    return { ...problem, actions: data.actions || [], status: "open" } as Problem
  },

  update(id: string, data: Partial<Pick<Problem, "title" | "priority" | "status" | "source" | "context">>): Problem | null {
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: now }
    if (data.title !== undefined) updates.title = data.title
    if (data.priority !== undefined) updates.priority = data.priority
    if (data.status !== undefined) updates.status = data.status
    if (data.source !== undefined) updates.source = data.source
    if (data.context !== undefined) updates.context = data.context
    db.update(problems).set(updates).where(eq(problems.id, id)).run()
    return ProblemService.get(id)
  },

  delete(id: string): boolean {
    const result = db.delete(problems).where(eq(problems.id, id)).run()
    return result.rowsAffected > 0
  },

  bulkUpdate(ids: string[], data: Partial<Pick<Problem, "status">>): number {
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: now }
    if (data.status !== undefined) updates.status = data.status
    const result = db.update(problems).set(updates).where(inArray(problems.id, ids)).run()
    return result.rowsAffected
  },

  countByStatus(): Record<ProblemStatus, number> {
    const all = db.select().from(problems).all()
    const counts: Record<string, number> = { open: 0, fixed: 0, ignored: 0, assigned: 0 }
    for (const row of all) {
      counts[row.status] = (counts[row.status] || 0) + 1
    }
    return counts as Record<ProblemStatus, number>
  },
}
