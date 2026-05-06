CREATE TABLE `bookmark_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` text DEFAULT '0' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bookmark_categories_sort_order` ON `bookmark_categories` (`sort_order`);--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`pinned` text DEFAULT 'false' NOT NULL,
	`sort_order` text DEFAULT '0' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `bookmark_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bookmarks_category_id` ON `bookmarks` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_bookmarks_sort_order` ON `bookmarks` (`sort_order`);--> statement-breakpoint
CREATE TABLE `local_host_pairings` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `local_host_pairings_token_unique` ON `local_host_pairings` (`token`);--> statement-breakpoint
CREATE INDEX `idx_local_host_pairings_user_id` ON `local_host_pairings` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_local_host_pairings_expires_at` ON `local_host_pairings` (`expires_at`);--> statement-breakpoint
CREATE TABLE `local_hosts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text,
	`device_id` text NOT NULL,
	`name` text NOT NULL,
	`host_token` text NOT NULL,
	`platform` text,
	`app_version` text,
	`status` text DEFAULT 'online' NOT NULL,
	`runtimes` text DEFAULT '[]' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`registered_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_local_hosts_user_id` ON `local_hosts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_local_hosts_organization_id` ON `local_hosts` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_local_hosts_device_id` ON `local_hosts` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_local_hosts_last_seen_at` ON `local_hosts` (`last_seen_at`);--> statement-breakpoint
ALTER TABLE `conversations` ADD `deleted` text DEFAULT 'false' NOT NULL;--> statement-breakpoint
ALTER TABLE `runtimes` ADD `transport` text DEFAULT 'stdio' NOT NULL;