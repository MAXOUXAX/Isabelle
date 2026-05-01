import {
  incrementDeaths,
  incrementPlays,
  incrementShots,
} from '@/modules/russian-roulette/db/russian-roulette.db-operations.js';
import {
  RIPPED_OFF_MESSAGES,
  SAFE_MESSAGES,
} from '@/modules/russian-roulette/russian-roulette.config.js';
import {
  getGunTarget,
  getRandomTimeoutDuration,
  increaseGamesSinceLastKill,
  resetNumberOfGamesSinceLastKill,
} from '@/modules/russian-roulette/utils/russian-roulette.utils.js';
import { createLogger } from '@/utils/logger.js';
import { mentionId } from '@/utils/mention.js';
import { voidAndTrackError } from '@/utils/promises.js';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  MessageMentionOptions,
} from 'discord.js';

const logger = createLogger('russian-roulette-play-command');

// Restrict mentions to an explicit allow-list of user IDs, never roles/@everyone.
const mentionOnly = (...userIds: string[]): MessageMentionOptions => ({
  parse: [],
  users: userIds,
});

export const executePlayCommand = async (
  interaction: ChatInputCommandInteraction,
) => {
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      content: 'Vous ne pouvez pas jouer en DM.',
      allowedMentions: mentionOnly(),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const targetId = getGunTarget(interaction.user.id, guild);

  const randomSafeMessage =
    SAFE_MESSAGES[Math.floor(Math.random() * SAFE_MESSAGES.length)];

  // Always track the play (someone executed the command)
  voidAndTrackError(incrementPlays(guild.id, interaction.user.id));

  // No one got hit this round.
  if (targetId == null) {
    increaseGamesSinceLastKill();
    await interaction.reply({
      content: randomSafeMessage,
      allowedMentions: mentionOnly(interaction.user.id),
    });
    return;
  }

  try {
    const member = await guild.members
      .fetch(targetId)
      .catch(() => guild.members.cache.get(targetId));

    if (!member) {
      logger.warn(
        `Failed to fetch member ${targetId} for timeout - skipping execution`,
      );

      increaseGamesSinceLastKill();
      await interaction.reply({
        content: randomSafeMessage,
        allowedMentions: mentionOnly(interaction.user.id),
      });
      return;
    }

    if (!(member.moderatable || member.kickable)) {
      increaseGamesSinceLastKill();
      await interaction.reply({
        content: `Bang...? ${mentionId(targetId)} était trop puissant(e) pour être affecté(e). Le canon a fondu et tout le monde s'en sort vivant cette fois-ci !`,
        allowedMentions: mentionOnly(targetId, interaction.user.id),
      });
      logger.debug(
        `Target ${targetId} (${member.displayName}) is not moderatable - cannot timeout`,
      );
      return;
    }

    // If the target is someone else than the shooter, announce the gun jumped hands
    if (targetId !== interaction.user.id) {
      const preTargetMessage = RIPPED_OFF_MESSAGES[
        Math.floor(Math.random() * RIPPED_OFF_MESSAGES.length)
      ]
        .replace('{shooter}', mentionId(interaction.user.id))
        .replace('{target}', mentionId(targetId));

      await interaction.reply({
        content: preTargetMessage,
        allowedMentions: mentionOnly(targetId, interaction.user.id),
      });
    }

    // Get random timeout duration and message
    const { duration, label, message } = getRandomTimeoutDuration();

    await member.timeout(
      duration,
      `Perdu à la roulette russe (timeout ${label})`,
    );

    // Convert milliseconds to minutes for tracking
    const timeoutMinutes = Math.round(duration / (60 * 1000));

    // Track the shot for the shooter (their play resulted in someone getting hit)
    voidAndTrackError(incrementShots(guild.id, interaction.user.id));

    // Track the death and timeout duration for the target user
    voidAndTrackError(incrementDeaths(guild.id, targetId, timeoutMinutes));

    resetNumberOfGamesSinceLastKill();

    // Replace {user} placeholder with actual mention
    const finalMessage = message.replace('{user}', mentionId(targetId));
    // If we already replied with the pre-target message (when target != shooter), followUp with the final timeout message
    if (targetId !== interaction.user.id) {
      await interaction.followUp({
        content: finalMessage,
        allowedMentions: mentionOnly(targetId, interaction.user.id),
      });
    } else {
      await interaction.reply({
        content: finalMessage,
        allowedMentions: mentionOnly(targetId, interaction.user.id),
      });
    }
    logger.debug(
      { reason: 'Russian Roulette', duration: label },
      `Successfully timed out user ${targetId} (${member.displayName})`,
    );
  } catch (e) {
    logger.error(
      { error: e },
      `Failed to timeout user ${targetId} in Russian Roulette:`,
    );
    increaseGamesSinceLastKill();
    const errorMessage = `Le pistolet s'enraye... Personne n'est sanctionné cette fois-ci.`;
    if (interaction.replied) {
      await interaction.followUp({
        content: errorMessage,
        allowedMentions: mentionOnly(targetId, interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: errorMessage,
        allowedMentions: mentionOnly(targetId, interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
    }
  }
};
