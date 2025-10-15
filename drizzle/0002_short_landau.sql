CREATE TABLE `birthdays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`day` integer NOT NULL,
	`month` integer NOT NULL,
	`year` integer,
	`created_at` integer DEFAULT (current_timestamp),
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `birthdays_user_id_unique` ON `birthdays` (`user_id`);