import { sqliteTable, text, index } from "drizzle-orm/sqlite-core"

export const commands = sqliteTable("commands", {
  id: text("id").primaryKey(),
  instruction: text("instruction").notNull(),
  agentNames: text("agent_names").notNull().default("[]"),
  projectIds: text("project_ids").notNull().default("[]"),
  goalId: text("goal_id"),
  status: text("status").notNull().default("sent"),
  createdAt: text("created_at").notNull(),
}, (t) => [
  index("idx_commands_goal_id").on(t.goalId),
])

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  successCriteria: text("success_criteria").notNull().default("[]"),
  constraints: text("constraints").notNull().default("[]"),
  status: text("status").notNull().default("active"),
  projectId: text("project_id").references(() => projects.id),
  commandId: text("command_id").references(() => commands.id),
  watchers: text("watchers").notNull().default("[]"),
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
  diff: text("diff"),
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
  enabled: text("enabled").notNull().default("true"),
  cliCommand: text("cli_command"),
  currentModel: text("current_model"),
  runtimeId: text("runtime_id"),
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

export const problems = sqliteTable("problems", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  priority: text("priority").notNull().default("warning"),
  source: text("source"),
  context: text("context"),
  goalId: text("goal_id"),
  stateId: text("state_id"),
  status: text("status").notNull().default("open"),
  actions: text("actions").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => [
  index("idx_problems_status").on(t.status),
  index("idx_problems_goal_id").on(t.goalId),
])

export const rules = sqliteTable("rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  condition: text("condition").notNull(),
  action: text("action").notNull(),
  enabled: text("enabled").notNull().default("true"),
  createdAt: text("created_at").notNull(),
})
