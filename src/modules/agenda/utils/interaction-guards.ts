import type {
  BaseInteraction,
  ChatInputCommandInteraction,
  Guild,
  PermissionResolvable,
} from 'discord.js';
import { AgendaUserError } from './agenda-errors.js';

type GuildedInteraction = Pick<BaseInteraction, 'guild' | 'guildId'>;

export function requireGuild(interaction: GuildedInteraction): {
  guild: Guild;
  guildId: string;
} {
  if (!interaction.guild || !interaction.guildId) {
    throw new AgendaUserError(
      'Cette commande doit être utilisée dans un serveur.',
    );
  }

  return {
    guild: interaction.guild,
    guildId: interaction.guildId,
  };
}

export function requirePermission(
  interaction: ChatInputCommandInteraction,
  permission: PermissionResolvable,
  message: string,
): void {
  if (!interaction.memberPermissions?.has(permission)) {
    throw new AgendaUserError(message);
  }
}

export function requireConfigValue<T>(
  value: T | null | undefined,
  message: string,
): T {
  if (value === null || value === undefined || value === '') {
    throw new AgendaUserError(message);
  }

  return value;
}
