class ConfigManager {
  private guilds: Record<string, GuildConfig> = {};

  constructor() {
    // 1. Load guild configs from database
    // 2. Set guilds to the loaded guild configs
    // TODO: Implement this
    console.log('ConfigManager initialized');
  }

  getGuild(guildId: string): GuildConfig {
    return this.guilds[guildId] ?? {};
  }

  setGuild(guildId: string, config: GuildConfig): void {
    this.guilds[guildId] = config;
  }
}

interface GuildConfig {
  HOT_POTATO_ROLE_ID?: string;
  HOT_POTATO_TIMEOUT_DURATION?: number;
}

export const configManager = new ConfigManager();
