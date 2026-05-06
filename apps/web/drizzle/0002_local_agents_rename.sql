ALTER TABLE `local_hosts` RENAME TO `local_agents`;
--> statement-breakpoint
ALTER TABLE `local_host_pairings` RENAME TO `local_agent_pairings`;
--> statement-breakpoint
DROP INDEX IF EXISTS `idx_local_hosts_user_id`;
--> statement-breakpoint
DROP INDEX IF EXISTS `idx_local_hosts_organization_id`;
--> statement-breakpoint
DROP INDEX IF EXISTS `idx_local_hosts_device_id`;
--> statement-breakpoint
DROP INDEX IF EXISTS `idx_local_hosts_last_seen_at`;
--> statement-breakpoint
CREATE INDEX `idx_local_agents_user_id` ON `local_agents` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_local_agents_organization_id` ON `local_agents` (`organization_id`);
--> statement-breakpoint
CREATE INDEX `idx_local_agents_device_id` ON `local_agents` (`device_id`);
--> statement-breakpoint
CREATE INDEX `idx_local_agents_last_seen_at` ON `local_agents` (`last_seen_at`);
--> statement-breakpoint
DROP INDEX IF EXISTS `idx_local_host_pairings_user_id`;
--> statement-breakpoint
DROP INDEX IF EXISTS `idx_local_host_pairings_expires_at`;
--> statement-breakpoint
CREATE INDEX `idx_local_agent_pairings_user_id` ON `local_agent_pairings` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_local_agent_pairings_expires_at` ON `local_agent_pairings` (`expires_at`);
