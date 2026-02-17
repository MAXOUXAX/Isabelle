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

const MAX_DEPTH = 50;
const BATCH_SIZE = 100;
const FRESHNESS_THRESHOLD_MONTHS = 3;
const MIN_FRESH_PERCENTAGE = 0.8;

/**
 * Check if a message is considered "fresh" (less than 3 months old)
 */
const isMessageFresh = (message: Message): boolean => {
  const now = Date.now();
  const millisecondsIn3Months =
    FRESHNESS_THRESHOLD_MONTHS * 30 * 24 * 60 * 60 * 1000;
  const thresholdTimestamp = now - millisecondsIn3Months;
  return message.createdTimestamp >= thresholdTimestamp;
};

/**
 * Calculate the percentage of fresh messages in a collection
 */
const calculateFreshPercentage = (messages: Message[]): number => {
  if (messages.length === 0) return 0;
  const freshCount = messages.filter(isMessageFresh).length;
  return freshCount / messages.length;
};

/**
 * Check if a channel is accessible for reading messages
 */
const isChannelAccessible = (
  channel: TextChannel,
  botMember: Guild['members']['me'],
  botUserId: Snowflake,
  invokerId?: Snowflake,
): boolean => {
  if (!channel.viewable) {
    return false;
  }

  const permissions = botMember
    ? channel.permissionsFor(botMember)
    : channel.permissionsFor(botUserId);

  if (!permissions) {
    return false;
  }

  if (
    !permissions.has(PermissionFlagsBits.ViewChannel) ||
    !permissions.has(PermissionFlagsBits.ReadMessageHistory)
  ) {
    return false;
  }

  if (invokerId) {
    const invokerPermissions = channel.permissionsFor(invokerId);
    if (!invokerPermissions) {
      return false;
    }
    if (
      !invokerPermissions.has(PermissionFlagsBits.ViewChannel) ||
      !invokerPermissions.has(PermissionFlagsBits.ReadMessageHistory)
    ) {
      return false;
    }
  }

  return true;
};

/**
 * Get all accessible text channels in a guild
 */
const getAccessibleChannels = (
  guild: Guild,
  botMember: Guild['members']['me'],
  botUserId: Snowflake,
  invokerId?: Snowflake,
): TextChannel[] => {
  const textChannels = guild.channels.cache.filter(
    (channel): channel is TextChannel => channel.type === ChannelType.GuildText,
  );

  return Array.from(textChannels.values()).filter((channel) => {
    const accessible = isChannelAccessible(
      channel,
      botMember,
      botUserId,
      invokerId,
    );
    if (!accessible) {
      logger.debug(
        { channelId: channel.id, guildId: guild.id },
        'Skipping inaccessible channel',
      );
    }
    return accessible;
  });
};

/**
 * Fetch messages from a single channel starting from a specific point
 */
const fetchChannelMessages = async (
  channel: TextChannel,
  lastId: Snowflake | undefined,
): Promise<Message[]> => {
  const messages = await channel.messages.fetch({
    limit: BATCH_SIZE,
    ...(lastId ? { before: lastId } : {}),
  });

  return Array.from(messages.values());
};

/**
 * Process messages from a channel and collect user messages
 */
const processChannelMessages = (
  messages: Message[],
  userId: Snowflake,
  uniqueMessages: Map<Snowflake, Message>,
): { foundNew: boolean; lastMessageId: Snowflake | undefined } => {
  let foundNew = false;
  let lastMessageId: Snowflake | undefined;

  for (const message of messages) {
    if (message.author.id === userId && !uniqueMessages.has(message.id)) {
      uniqueMessages.set(message.id, message);
      foundNew = true;
    }
  }

  if (messages.length > 0) {
    lastMessageId = messages[messages.length - 1]?.id;
  }

  return { foundNew, lastMessageId };
};

/**
 * Perform one depth iteration across all channels
 */
const searchChannelsAtDepth = async (
  channels: TextChannel[],
  userId: Snowflake,
  uniqueMessages: Map<Snowflake, Message>,
  channelLastIds: Map<Snowflake, Snowflake | undefined | null>,
  maxMessages: number,
  depth: number,
  guildId: Snowflake,
): Promise<boolean> => {
  let foundNewMessages = false;

  for (const channel of channels) {
    const lastId = channelLastIds.get(channel.id);

    // Skip exhausted channels
    if (lastId === null) {
      continue;
    }

    try {
      const messages = await fetchChannelMessages(channel, lastId ?? undefined);

      if (messages.length === 0) {
        channelLastIds.set(channel.id, null);
        continue;
      }

      const { foundNew, lastMessageId } = processChannelMessages(
        messages,
        userId,
        uniqueMessages,
      );

      if (foundNew) {
        foundNewMessages = true;
      }

      if (lastMessageId) {
        channelLastIds.set(channel.id, lastMessageId);
      }
    } catch (error) {
      logger.warn(
        { channelId: channel.id, guildId, error, depth },
        'Failed to fetch messages from channel',
      );
      channelLastIds.set(channel.id, null);
    }
  }

  return foundNewMessages;
};

/**
 * Sort and limit messages to the final result set
 */
const finalizeMessages = (
  uniqueMessages: Map<Snowflake, Message>,
  maxMessages: number,
): Message[] => {
  return Array.from(uniqueMessages.values())
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
    .slice(0, maxMessages);
};

/**
 * Fetch the last messages from a user across all accessible channels in a guild.
 * Uses depth-based searching to ensure minimum message count is reached if possible.
 */
export const fetchLastUserMessages = async (
  guild: Guild | null,
  userId: Snowflake,
  minMessages = 0,
  maxMessages = 100,
  invokerId?: Snowflake,
): Promise<Message[]> => {
  if (!guild) {
    return [];
  }

  const botMember = guild.members.me;
  const botUserId = guild.client.user.id;

  const accessibleChannels = getAccessibleChannels(
    guild,
    botMember,
    botUserId,
    invokerId,
  );

  if (accessibleChannels.length === 0) {
    logger.warn(
      { guildId: guild.id, userId },
      'No accessible channels found for message fetching',
    );
    return [];
  }

  const uniqueMessages = new Map<Snowflake, Message>();
  const channelLastIds = new Map<Snowflake, Snowflake | undefined | null>();

  // Initialize tracking for each channel
  for (const channel of accessibleChannels) {
    channelLastIds.set(channel.id, undefined);
  }

  let depth = 0;

  // Keep searching with increasing depth until we have enough messages
  while (
    uniqueMessages.size < Math.max(minMessages, maxMessages) &&
    depth < MAX_DEPTH
  ) {
    const foundNewMessages = await searchChannelsAtDepth(
      accessibleChannels,
      userId,
      uniqueMessages,
      channelLastIds,
      maxMessages,
      depth,
      guild.id,
    );

    depth++;

    if (!foundNewMessages) {
      if (uniqueMessages.size < minMessages) {
        logger.warn(
          {
            userId,
            guildId: guild.id,
            foundMessages: uniqueMessages.size,
            minMessages,
            depth,
          },
          'No more messages available - could not reach minimum message count',
        );
      }
      break;
    }

    // Check if we have enough messages and if they meet the freshness requirement
    if (
      uniqueMessages.size >= minMessages ||
      uniqueMessages.size >= maxMessages
    ) {
      const currentMessages = Array.from(uniqueMessages.values());
      const freshPercentage = calculateFreshPercentage(currentMessages);

      if (freshPercentage >= MIN_FRESH_PERCENTAGE) {
        // We have enough messages and they're fresh enough
        break;
      } else {
        // We have enough messages but they're not fresh enough, keep searching
        logger.debug(
          {
            userId,
            guildId: guild.id,
            freshPercentage: (freshPercentage * 100).toFixed(1),
            requiredPercentage: (MIN_FRESH_PERCENTAGE * 100).toFixed(1),
            depth,
          },
          'Messages not fresh enough, continuing search',
        );
      }
    }
  }

  if (depth >= MAX_DEPTH) {
    logger.warn(
      {
        userId,
        guildId: guild.id,
        foundMessages: uniqueMessages.size,
        maxDepth: MAX_DEPTH,
      },
      'Reached maximum search depth',
    );
  }

  const sortedMessages = finalizeMessages(uniqueMessages, maxMessages);
  const freshPercentage = calculateFreshPercentage(sortedMessages);

  logger.debug(
    {
      userId,
      guildId: guild.id,
      foundMessages: sortedMessages.length,
      freshPercentage: (freshPercentage * 100).toFixed(1) + '%',
      minMessages,
      maxMessages,
      depth,
    },
    'Completed message fetching',
  );

  // Warn if freshness requirement wasn't met
  if (
    sortedMessages.length >= minMessages &&
    freshPercentage < MIN_FRESH_PERCENTAGE
  ) {
    logger.warn(
      {
        userId,
        guildId: guild.id,
        freshPercentage: (freshPercentage * 100).toFixed(1) + '%',
        requiredPercentage: (MIN_FRESH_PERCENTAGE * 100).toFixed(1) + '%',
      },
      'Could not meet freshness requirement',
    );
  }

  return sortedMessages;
};
