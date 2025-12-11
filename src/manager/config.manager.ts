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
}

export interface GuildConfig {
  HOT_POTATO_ROLE_ID?: string;
  HOT_POTATO_TIMEOUT_DURATION?: number;
}

export const configManager = new ConfigManager();
