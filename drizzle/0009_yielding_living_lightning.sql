CREATE INDEX `automatic_responses_guild_id_idx` ON `automatic_responses` (`guild_id`);--> statement-breakpoint
CREATE INDEX `roast_usage_idx` ON `roast_usage` (`guild_id`,`user_id`,`created_at`);