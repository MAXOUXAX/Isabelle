CREATE TABLE `automatic_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text,
	`configuration` text NOT NULL,
	`probability` integer DEFAULT 100 NOT NULL,
	`created_at` integer DEFAULT (current_timestamp),
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `guild_configs` (
	`guild_id` integer PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`created_at` integer DEFAULT (current_timestamp),
	`updated_at` integer
);
