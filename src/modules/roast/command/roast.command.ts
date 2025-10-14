import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import {
  MAX_ROASTS_PER_USER_PER_DAY,
  ROAST_FALLBACK_MESSAGE,
  isProd,
} from '@/modules/roast/command/config/roast-config.js';
import { handleRoastError } from '@/modules/roast/command/services/roast-error-handler.js';
import { generateRoast } from '@/modules/roast/command/services/roast-generator.js';
import {
  checkRoastQuota,
  recordRoastUsage,
} from '@/modules/roast/command/services/roast-throttle.js';
import { createLogger } from '@/utils/logger.js';
import { fetchLastUserMessages } from '@/utils/message-picker.js';
import { safelySendMessage } from '@/utils/safely-send-message.js';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

const logger = createLogger('roast-command');

export class RoastCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Demande à Isabelle de générer un roast sur un camarade')
    .addUserOption((option) =>
      option
        .setName('cible')
        .setDescription('Qui est-ce que tu aimerais que je roast ?')
        .setRequired(true),
    );

  async executeCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    logger.debug({ interactionId: interaction.id }, 'Executing roast command');

    let hasDeferred = false;

    try {
      const { guildId, guild } = interaction;

      if (!guildId || !guild) {
        await interaction.reply({
          content:
            "Impossible d'identifier le serveur. Réessaie dans un salon du serveur.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const block = await checkRoastQuota(
        guildId,
        interaction.user.id,
        MAX_ROASTS_PER_USER_PER_DAY,
      );

      if (block) {
        if (isProd) {
          await interaction.reply(block);
          return;
        }
        logger.debug('Development mode - bypassing cooldown');
        // In development, continue but we'll add a note to the roast message
      }

      const user = interaction.options.getUser('cible', true);

      if (user.bot) {
        await interaction.reply(
          'Je ne vais pas roast un bot, finis les conneries. stop!',
        );
        return;
      }

      const lastUserMessagesPromise = fetchLastUserMessages(guild, user.id, 25);

      await interaction.deferReply();
      hasDeferred = true;

      const lastUserMessages = await lastUserMessagesPromise;

      logger.debug(
        { messageCount: lastUserMessages.length },
        'Fetched user messages for roast',
      );

      if (lastUserMessages.length === 0) {
        await interaction.editReply(
          "Je n'ai pas pu trouver de messages récents de cet utilisateur pour le roast.",
        );
        return;
      }

      const roast = await generateRoast({
        displayName: user.displayName,
        messages: lastUserMessages,
      });

      if (!roast) {
        await interaction.editReply(
          "stop! Je n'arrive pas à me concentrer. Impossible de générer un roast pour le moment. Réessaie plus tard !",
        );
        return;
      }

      logger.debug({ contentLength: roast.length }, 'Generated roast content');

      await recordRoastUsage(guildId, interaction.user.id);

      const developmentNote =
        !isProd && block
          ? '\n-# *Cooldown contourné - environnement de développement*'
          : '';

      await safelySendMessage(interaction, roast + developmentNote);
    } catch (error) {
      logger.error({ error }, 'Failed to execute roast command');
      await handleRoastError({
        interaction,
        fallbackContent: ROAST_FALLBACK_MESSAGE,
        hasDeferred,
      });
    }
  }
}
