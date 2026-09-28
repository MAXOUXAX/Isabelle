import { db } from '@/db/index.js';
import { guildConfigs } from '@/db/schema.js';
import { createLogger } from '@/utils/logger.js';
import { eq } from 'drizzle-orm';

const logger = createLogger('config');

class ConfigManager {
  private guilds: Record<string, GuildConfig> = {};
  private guildSaveQueues = new Map<string, Promise<void>>();
  private guildConfigVersions = new Map<string, number>();

  private getGuildConfigVersion(guildId: string): number {
    return this.guildConfigVersions.get(guildId) ?? 0;
  }

  private bumpGuildConfigVersion(guildId: string): number {
    const version = this.getGuildConfigVersion(guildId) + 1;
    this.guildConfigVersions.set(guildId, version);
    return version;
  }

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

  /**
   * Loads (or reloads) a single guild's config from the database into the
   * cache. Returns the loaded config, or an empty object when the guild has
   * no row yet.
   */
  async loadGuild(guildId: string): Promise<GuildConfig> {
    const version = this.getGuildConfigVersion(guildId);
    try {
      const rows = await db
        .select()
        .from(guildConfigs)
        .where(eq(guildConfigs.id, guildId))
        .limit(1);

      const config = rows.at(0)?.config ?? {};
      if (version === this.getGuildConfigVersion(guildId)) {
        this.guilds[guildId] = config;
      } else {
        return this.getGuild(guildId);
      }

      logger.debug({ guildId }, 'Guild config loaded from database');

      return config;
    } catch (error) {
      logger.error({ error, guildId }, 'Failed to load guild config');
      throw error;
    }
  }

  getGuild(guildId: string): GuildConfig {
    return this.guilds[guildId] ?? {};
  }

  setGuild(guildId: string, config: GuildConfig): void {
    this.bumpGuildConfigVersion(guildId);
    this.guilds[guildId] = config;
  }

  async saveGuild(guildId: string, config: GuildConfig): Promise<void> {
    this.bumpGuildConfigVersion(guildId);
    const previousSave = this.guildSaveQueues.get(guildId);
    const save = (previousSave ?? Promise.resolve())
      .catch(() => undefined)
      .then(async () => {
        const merged: GuildConfig = { ...this.getGuild(guildId), ...config };

        try {
          await db
            .insert(guildConfigs)
            .values({
              id: guildId,
              config: merged,
            })
            .onConflictDoUpdate({
              target: guildConfigs.id,
              set: {
                config: merged,
                updatedAt: new Date(),
              },
            });

          this.bumpGuildConfigVersion(guildId);
          this.guilds[guildId] = merged;
          logger.info({ guildId }, 'Guild config saved to database');
        } catch (error) {
          logger.error({ error, guildId }, 'Failed to save guild config');
          throw error;
        }
      });

    this.guildSaveQueues.set(guildId, save);

    try {
      await save;
    } finally {
      if (this.guildSaveQueues.get(guildId) === save) {
        this.guildSaveQueues.delete(guildId);
      }
    }
  }
}

export interface GuildConfig {
  HOT_POTATO_ROLE_ID?: string;
  HOT_POTATO_TIMEOUT_DURATION?: number;
  AGENDA_FORUM_CHANNEL_ID?: string;
  AGENDA_ROLE_TO_MENTION?: string;
  BIRTHDAY_CHANNEL_ID?: string;
}

export const configManager = new ConfigManager();
