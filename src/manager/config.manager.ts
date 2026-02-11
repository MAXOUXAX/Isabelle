import { db } from '@/db/index.js';
import { guildConfigs } from '@/db/schema.js';
import { createLogger } from '@/utils/logger.js';

const logger = createLogger('config');

class ConfigManager {
  private guilds: Record<string, GuildConfig> = {};

  async init() {
    logger.info('Loading guild configs from database...');
    try {
      const configs = await db.select().from(guildConfigs);

      for (const guildConfig of configs) {
        this.guilds[guildConfig.id] = guildConfig.config;
      }

      logger.info(
        { count: configs.length },
        'Guild configs loaded from database',
      );
    } catch (error) {
      logger.error({ error }, 'Failed to load guild configs from database');
      throw error;
    }
  }

  getGuild(guildId: string): GuildConfig {
    return this.guilds[guildId] ?? {};
  }

  setGuild(guildId: string, config: GuildConfig): void {
    this.guilds[guildId] = config;
  }

  async saveGuild(guildId: string, config: GuildConfig): Promise<void> {
    try {
      await db
        .insert(guildConfigs)
        .values({
          id: guildId,
          config,
        })
        .onConflictDoUpdate({
          target: guildConfigs.id,
          set: {
            config,
          },
        });

      this.guilds[guildId] = config;
      logger.info({ guildId }, 'Guild config saved to database');
    } catch (error) {
      logger.error({ error, guildId }, 'Failed to save guild config');
      throw error;
    }
  }
}

export interface GuildConfig {
  HOT_POTATO_ROLE_ID?: string;
  HOT_POTATO_TIMEOUT_DURATION?: number;
  AGENDA_FORUM_CHANNEL_ID?: string;
  AGENDA_ROLE_TO_MENTION?: string;
}

export const configManager = new ConfigManager();
