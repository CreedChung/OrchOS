CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`timestamp` text NOT NULL,
	`agent` text NOT NULL,
	`action` text NOT NULL,
	`detail` text,
	`reasoning` text,
	`diff` text
);
--> statement-breakpoint
CREATE INDEX `idx_activities_goal_id` ON `activities` (`goal_id`);--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`capabilities` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`model` text NOT NULL,
	`enabled` text DEFAULT 'true' NOT NULL,
	`cli_command` text,
	`current_model` text,
	`runtime_id` text,
	`avatar_url` text,
	FOREIGN KEY (`runtime_id`) REFERENCES `runtimes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agents_name_unique` ON `agents` (`name`);--> statement-breakpoint
CREATE TABLE `artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`detail` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_artifacts_goal_id` ON `artifacts` (`goal_id`);--> statement-breakpoint
CREATE TABLE `commands` (
	`id` text PRIMARY KEY NOT NULL,
	`instruction` text NOT NULL,
	`agent_names` text DEFAULT '[]' NOT NULL,
	`project_ids` text DEFAULT '[]' NOT NULL,
	`goal_id` text,
	`status` text DEFAULT 'sent' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_commands_goal_id` ON `commands` (`goal_id`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`project_id` text,
	`agent_id` text,
	`runtime_id` text,
	`archived` text DEFAULT 'false' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`runtime_id`) REFERENCES `runtimes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`goal_id` text,
	`payload` text DEFAULT '{}' NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_goal_id` ON `events` (`goal_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`success_criteria` text DEFAULT '[]' NOT NULL,
	`constraints` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`project_id` text,
	`command_id` text,
	`watchers` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`command_id`) REFERENCES `commands`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mcp_servers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`command` text NOT NULL,
	`args` text DEFAULT '[]' NOT NULL,
	`env` text DEFAULT '{}' NOT NULL,
	`enabled` text DEFAULT 'true' NOT NULL,
	`scope` text DEFAULT 'global' NOT NULL,
	`project_id` text,
	`organization_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_mcp_servers_project_id` ON `mcp_servers` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_mcp_servers_organization_id` ON `mcp_servers` (`organization_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`error` text,
	`response_time` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_id` ON `messages` (`conversation_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `problems` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`priority` text DEFAULT 'warning' NOT NULL,
	`source` text,
	`context` text,
	`goal_id` text,
	`state_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`actions` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_problems_status` ON `problems` (`status`);--> statement-breakpoint
CREATE INDEX `idx_problems_goal_id` ON `problems` (`goal_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`repository_url` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`condition` text NOT NULL,
	`action` text NOT NULL,
	`enabled` text DEFAULT 'true' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `runtimes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`command` text NOT NULL,
	`version` text,
	`path` text,
	`role` text NOT NULL,
	`capabilities` text DEFAULT '[]' NOT NULL,
	`model` text NOT NULL,
	`enabled` text DEFAULT 'true' NOT NULL,
	`current_model` text,
	`status` text DEFAULT 'idle' NOT NULL,
	`registry_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runtimes_name_unique` ON `runtimes` (`name`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`enabled` text DEFAULT 'true' NOT NULL,
	`scope` text DEFAULT 'global' NOT NULL,
	`project_id` text,
	`organization_id` text,
	`source_type` text DEFAULT 'manual' NOT NULL,
	`source_url` text,
	`install_path` text,
	`manifest_path` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_skills_project_id` ON `skills` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_skills_organization_id` ON `skills` (`organization_id`);--> statement-breakpoint
CREATE TABLE `states` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`label` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`actions` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_states_goal_id` ON `states` (`goal_id`);