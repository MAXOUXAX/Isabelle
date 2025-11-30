CREATE TABLE `snake_case_targets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snake_case_targets_guild_id_user_id_unique` ON `snake_case_targets` (`guild_id`,`user_id`);