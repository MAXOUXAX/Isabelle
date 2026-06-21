PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_birthdays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`month` integer NOT NULL,
	`day` integer NOT NULL,
	`last_notified` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "birthdays_month_check" CHECK("__new_birthdays"."month" between 1 and 12),
	CONSTRAINT "birthdays_day_check" CHECK("__new_birthdays"."day" between 1 and 31)
);
--> statement-breakpoint
INSERT INTO `__new_birthdays`("id", "guild_id", "user_id", "month", "day", "last_notified", "created_at", "updated_at") SELECT "id", "guild_id", "user_id", "month", "day", "last_notified", "created_at", "updated_at" FROM `birthdays`;--> statement-breakpoint
DROP TABLE `birthdays`;--> statement-breakpoint
ALTER TABLE `__new_birthdays` RENAME TO `birthdays`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `birthdays_month_day_idx` ON `birthdays` (`month`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `birthdays_guild_id_user_id_unique` ON `birthdays` (`guild_id`,`user_id`);