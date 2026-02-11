CREATE TABLE `birthdays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`day` integer NOT NULL,
	`month` integer NOT NULL,
	`year` integer,
	`last_celebrated_year` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `birthdays_date_idx` ON `birthdays` (`guild_id`,`month`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `birthdays_guild_id_user_id_unique` ON `birthdays` (`guild_id`,`user_id`);