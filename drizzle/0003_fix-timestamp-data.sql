-- Custom SQL migration file, put your code below! --

-- Fix incorrect timestamp values in existing rows
-- Previous migration used DEFAULT (current_timestamp) which stored text in integer columns
-- This updates any rows with invalid timestamps to use current Unix timestamp

UPDATE `automatic_responses` 
SET 
  `created_at` = unixepoch(),
  `updated_at` = NULL
WHERE `created_at` = 0 OR `created_at` IS NULL OR typeof(`created_at`) = 'text';

--> statement-breakpoint

UPDATE `guild_configs` 
SET 
  `created_at` = unixepoch(),
  `updated_at` = NULL
WHERE `created_at` = 0 OR `created_at` IS NULL OR typeof(`created_at`) = 'text';
