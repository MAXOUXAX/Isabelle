import { createLogger } from '@/utils/logger.js';
import type { TextChannel } from 'discord.js';
import {
  ChannelType,
  Guild,
  Message,
  PermissionFlagsBits,
  Snowflake,
} from 'discord.js';

const logger = createLogger('message-picker');

export const fetchLastUserMessages = async (
  guild: Guild | null,
  userId: Snowflake,
  maxMessages = 100,
): Promise<Message[]> => {
  if (!guild) {
    return [];
  }

  const textChannels = guild.channels.cache.filter(
    (channel): channel is TextChannel => channel.type === ChannelType.GuildText,
  );

  const uniqueMessages = new Map<Snowflake, Message>();
  const botMember = guild.members.me;
  const botUserId = guild.client.user.id;

  for (const textChannel of textChannels.values()) {
    if (uniqueMessages.size >= maxMessages) {
      break;
    }

    if (!textChannel.viewable) {
      logger.debug(
        { channelId: textChannel.id, guildId: guild.id },
        'Skipping channel without view access',
      );
      continue;
    }
    const permissions = botMember
      ? textChannel.permissionsFor(botMember)
      : botUserId
        ? textChannel.permissionsFor(botUserId)
        : null;

    if (!permissions) {
      logger.debug(
        { channelId: textChannel.id, guildId: guild.id },
        'Skipping channel without permission context',
      );
      continue;
    }

    if (
      !permissions.has(PermissionFlagsBits.ViewChannel) ||
      !permissions.has(PermissionFlagsBits.ReadMessageHistory)
    ) {
      logger.debug(
        { channelId: textChannel.id, guildId: guild.id },
        'Skipping channel without required permissions',
      );
      continue;
    }

    try {
      let lastId: Snowflake | undefined;

      while (uniqueMessages.size < maxMessages) {
        const remaining = Math.min(100, maxMessages - uniqueMessages.size);
        const messages = await textChannel.messages.fetch({
          limit: remaining,
          ...(lastId ? { before: lastId } : {}),
        });

        if (messages.size === 0) {
          break;
        }

        for (const message of messages.values()) {
          if (message.author.id === userId && !uniqueMessages.has(message.id)) {
            uniqueMessages.set(message.id, message);
            if (uniqueMessages.size >= maxMessages) {
              break;
            }
          }
        }

        const lastMessage = messages.last();
        if (!lastMessage) {
          break;
        }

        lastId = lastMessage.id;

        if (messages.size < remaining) {
          break;
        }
      }
    } catch (error) {
      logger.warn(
        { channelId: textChannel.id, guildId: guild.id, error },
        'Failed to fetch messages from channel',
      );
    }
  }

  return Array.from(uniqueMessages.values())
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
    .slice(0, maxMessages);
};
