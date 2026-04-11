import { sqliteTable, text, index } from "drizzle-orm/sqlite-core"

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  successCriteria: text("success_criteria").notNull().default("[]"),
  constraints: text("constraints").notNull().default("[]"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const states = sqliteTable("states", {
  id: text("id").primaryKey(),
  goalId: text("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  status: text("status").notNull().default("pending"),
  actions: text("actions"),
  updatedAt: text("updated_at").notNull(),
}, (t) => [
  index("idx_states_goal_id").on(t.goalId),
])

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  goalId: text("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  detail: text("detail"),
  updatedAt: text("updated_at").notNull(),
}, (t) => [
  index("idx_artifacts_goal_id").on(t.goalId),
])

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  goalId: text("goal_id").notNull(),
  timestamp: text("timestamp").notNull(),
  agent: text("agent").notNull(),
  action: text("action").notNull(),
  detail: text("detail"),
  reasoning: text("reasoning"),
}, (t) => [
  index("idx_activities_goal_id").on(t.goalId),
])

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  role: text("role").notNull(),
  capabilities: text("capabilities").notNull().default("[]"),
  status: text("status").notNull().default("idle"),
  model: text("model").notNull(),
})

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  createdAt: text("created_at").notNull(),
})

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  goalId: text("goal_id"),
  payload: text("payload").notNull().default("{}"),
  timestamp: text("timestamp").notNull(),
}, (t) => [
  index("idx_events_goal_id").on(t.goalId),
])

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
})
