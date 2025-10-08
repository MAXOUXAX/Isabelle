CREATE TABLE `roast_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (current_timestamp),
	`updated_at` integer
);
