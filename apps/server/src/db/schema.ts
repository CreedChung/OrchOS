import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const commands = sqliteTable(
  "commands",
  {
    id: text("id").primaryKey(),
    instruction: text("instruction").notNull(),
    agentNames: text("agent_names").notNull().default("[]"),
    projectIds: text("project_ids").notNull().default("[]"),
    goalId: text("goal_id"),
    status: text("status").notNull().default("sent"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_commands_goal_id").on(t.goalId)],
);

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
});

export const states = sqliteTable(
  "states",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    status: text("status").notNull().default("pending"),
    actions: text("actions"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_states_goal_id").on(t.goalId)],
);

export const artifacts = sqliteTable(
  "artifacts",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull().default("pending"),
    detail: text("detail"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_artifacts_goal_id").on(t.goalId)],
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id").notNull(),
    timestamp: text("timestamp").notNull(),
    agent: text("agent").notNull(),
    action: text("action").notNull(),
    detail: text("detail"),
    reasoning: text("reasoning"),
    diff: text("diff"),
  },
  (t) => [index("idx_activities_goal_id").on(t.goalId)],
);

export const runtimes = sqliteTable("runtimes", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  command: text("command").notNull(),
  version: text("version"),
  path: text("path"),
  role: text("role").notNull(),
  capabilities: text("capabilities").notNull().default("[]"),
  model: text("model").notNull(),
  protocol: text("protocol").notNull().default("cli"),
  transport: text("transport").notNull().default("stdio"),
  acpCommand: text("acp_command"),
  acpArgs: text("acp_args").notNull().default("[]"),
  acpEnv: text("acp_env").notNull().default("{}"),
  communicationMode: text("communication_mode").notNull().default("cli-fallback"),
  enabled: text("enabled").notNull().default("true"),
  currentModel: text("current_model"),
  status: text("status").notNull().default("idle"),
  registryId: text("registry_id"),
});

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
  runtimeId: text("runtime_id").references(() => runtimes.id),
  avatarUrl: text("avatar_url"),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  repositoryUrl: text("repository_url"),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const inboxThreads = sqliteTable(
  "inbox_threads",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("open"),
    priority: text("priority").notNull().default("warning"),
    title: text("title").notNull(),
    summary: text("summary"),
    projectId: text("project_id").references(() => projects.id),
    conversationId: text("conversation_id").references(() => conversations.id),
    commandId: text("command_id").references(() => commands.id),
    primaryGoalId: text("primary_goal_id").references(() => goals.id),
    createdByType: text("created_by_type").notNull(),
    createdById: text("created_by_id"),
    createdByName: text("created_by_name").notNull(),
    lastMessageAt: text("last_message_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    archived: text("archived").notNull().default("false"),
  },
  (t) => [
    index("idx_inbox_threads_kind").on(t.kind),
    index("idx_inbox_threads_status").on(t.status),
    index("idx_inbox_threads_project_id").on(t.projectId),
    index("idx_inbox_threads_command_id").on(t.commandId),
  ],
);

export const inboxMessages = sqliteTable(
  "inbox_messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => inboxThreads.id, { onDelete: "cascade" }),
    messageType: text("message_type").notNull(),
    senderType: text("sender_type").notNull(),
    senderId: text("sender_id"),
    senderName: text("sender_name").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    to: text("to_json").notNull().default("[]"),
    cc: text("cc_json").notNull().default("[]"),
    goalId: text("goal_id").references(() => goals.id),
    stateId: text("state_id").references(() => states.id),
    problemId: text("problem_id").references(() => problems.id),
    metadata: text("metadata"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_inbox_messages_thread_id").on(t.threadId),
    index("idx_inbox_messages_goal_id").on(t.goalId),
  ],
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    goalId: text("goal_id"),
    payload: text("payload").notNull().default("{}"),
    timestamp: text("timestamp").notNull(),
  },
  (t) => [index("idx_events_goal_id").on(t.goalId)],
);

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const problems = sqliteTable(
  "problems",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    priority: text("priority").notNull().default("warning"),
    source: text("source"),
    context: text("context"),
    suggestedGoal: text("suggested_goal"),
    goalId: text("goal_id"),
    stateId: text("state_id"),
    status: text("status").notNull().default("open"),
    actions: text("actions").notNull().default("[]"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_problems_status").on(t.status), index("idx_problems_goal_id").on(t.goalId)],
);

export const rules = sqliteTable("rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  condition: text("condition").notNull(),
  action: text("action").notNull(),
  scope: text("scope").notNull().default("global"),
  projectId: text("project_id").references(() => projects.id),
  targetAgentIds: text("target_agent_ids").notNull().default("[]"),
  pathPatterns: text("path_patterns").notNull().default("[]"),
  taskTypes: text("task_types").notNull().default("[]"),
  instruction: text("instruction").notNull().default(""),
  priority: text("priority").notNull().default("normal"),
  enabled: text("enabled").notNull().default("true"),
  createdAt: text("created_at").notNull(),
});

export const mcpServers = sqliteTable(
  "mcp_servers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    command: text("command").notNull(),
    args: text("args").notNull().default("[]"),
    env: text("env").notNull().default("{}"),
    enabled: text("enabled").notNull().default("true"),
    scope: text("scope").notNull().default("global"), // "global" | "project"
    projectId: text("project_id").references(() => projects.id),
    organizationId: text("organization_id").references(() => organizations.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_mcp_servers_project_id").on(t.projectId),
    index("idx_mcp_servers_organization_id").on(t.organizationId),
  ],
);

export const sandboxes = sqliteTable(
  "sandboxes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => projects.id),
    agentType: text("agent_type").notNull().default("pi"),
    status: text("status").notNull().default("creating"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_sandboxes_project_id").on(t.projectId)],
);

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title"),
  projectId: text("project_id").references(() => projects.id),
  agentId: text("agent_id").references(() => agents.id),
  runtimeId: text("runtime_id").references(() => runtimes.id),
  archived: text("archived").notNull().default("false"),
  deleted: text("deleted").notNull().default("false"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    trace: text("trace"),
    error: text("error"),
    responseTime: text("response_time"),
    executionMode: text("execution_mode"),
    sandboxStatus: text("sandbox_status"),
    sandboxVmId: text("sandbox_vm_id"),
    projectId: text("project_id").references(() => projects.id),
    projectName: text("project_name"),
    clarificationQuestions: text("clarification_questions"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_messages_conversation_id").on(t.conversationId)],
);

export const skills = sqliteTable(
  "skills",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    enabled: text("enabled").notNull().default("true"),
    scope: text("scope").notNull().default("global"), // "global" | "project"
    projectId: text("project_id").references(() => projects.id),
    organizationId: text("organization_id").references(() => organizations.id),
    sourceType: text("source_type").notNull().default("manual"),
    sourceUrl: text("source_url"),
    installPath: text("install_path"),
    manifestPath: text("manifest_path"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_skills_project_id").on(t.projectId),
    index("idx_skills_organization_id").on(t.organizationId),
  ],
);

export const executionGraphs = sqliteTable(
  "execution_graphs",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    version: text("version").notNull().default("1"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_execution_graphs_goal_id").on(t.goalId)],
);

export const executionNodes = sqliteTable(
  "execution_nodes",
  {
    id: text("id").primaryKey(),
    graphId: text("graph_id")
      .notNull()
      .references(() => executionGraphs.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    label: text("label").notNull(),
    status: text("status").notNull().default("pending"),
    action: text("action"),
    assignedAgentName: text("assigned_agent_name"),
    assignedRuntimeId: text("assigned_runtime_id"),
    inputJson: text("input_json"),
    outputJson: text("output_json"),
    policyJson: text("policy_json"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_execution_nodes_graph_id").on(t.graphId)],
);

export const executionEdges = sqliteTable(
  "execution_edges",
  {
    id: text("id").primaryKey(),
    graphId: text("graph_id")
      .notNull()
      .references(() => executionGraphs.id, { onDelete: "cascade" }),
    fromNodeId: text("from_node_id")
      .notNull()
      .references(() => executionNodes.id, { onDelete: "cascade" }),
    toNodeId: text("to_node_id")
      .notNull()
      .references(() => executionNodes.id, { onDelete: "cascade" }),
    edgeType: text("edge_type").notNull().default("depends_on"),
    conditionJson: text("condition_json"),
  },
  (t) => [
    index("idx_execution_edges_graph_id").on(t.graphId),
    index("idx_execution_edges_to_node_id").on(t.toNodeId),
  ],
);

export const executionAttempts = sqliteTable(
  "execution_attempts",
  {
    id: text("id").primaryKey(),
    nodeId: text("node_id")
      .notNull()
      .references(() => executionNodes.id, { onDelete: "cascade" }),
    attemptNumber: text("attempt_number").notNull(),
    strategy: text("strategy").notNull().default("default"),
    status: text("status").notNull().default("running"),
    errorCode: text("error_code"),
    errorText: text("error_text"),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
  },
  (t) => [index("idx_execution_attempts_node_id").on(t.nodeId)],
);

export const policyDecisions = sqliteTable(
  "policy_decisions",
  {
    id: text("id").primaryKey(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    policySource: text("policy_source").notNull(),
    decision: text("decision").notNull(),
    reason: text("reason"),
    rewriteJson: text("rewrite_json"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_policy_decisions_subject").on(t.subjectType, t.subjectId)],
);

export const policyViolations = sqliteTable(
  "policy_violations",
  {
    id: text("id").primaryKey(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    policySource: text("policy_source").notNull(),
    reason: text("reason").notNull(),
    metadataJson: text("metadata_json"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_policy_violations_subject").on(t.subjectType, t.subjectId)],
);
