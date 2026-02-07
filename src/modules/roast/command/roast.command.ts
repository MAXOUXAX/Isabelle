import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { requireBothUsersConsent } from '@/modules/legal/consent-helpers.js';
import {
  MAX_ROASTS_PER_USER_PER_DAY,
  ROAST_FALLBACK_MESSAGE,
} from '@/modules/roast/command/config/roast-config.js';
import { handleRoastError } from '@/modules/roast/command/services/roast-error-handler.js';
import { generateRoast } from '@/modules/roast/command/services/roast-generator.js';
import {
  checkRoastQuota,
  recordRoastUsage,
} from '@/modules/roast/command/services/roast-throttle.js';
import { environment } from '@/utils/environment.js';
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
        if (environment === 'production') {
          await interaction.reply(block);
          return;
        }
        logger.debug('Development mode - bypassing cooldown');
        // In development, continue but we'll add a note to the roast message
      }

      const user = interaction.options.getUser('cible', true);

      const bothConsented = await requireBothUsersConsent(
        interaction,
        interaction.user.id,
        user.id,
        'generative-ai',
      );

      if (!bothConsented) {
        return;
      }

      if (user.bot) {
        await interaction.reply(
          'Je ne vais pas roast un bot, fini les conneries. stop!',
        );
        return;
      }

      const lastUserMessagesPromise = fetchLastUserMessages(
        guild,
        user.id,
        75,
        100,
        interaction.user.id,
      );

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

      const guildMember = await guild.members.fetch(user.id);
      const roastResult = await generateRoast({
        displayName: guildMember.displayName,
        messages: lastUserMessages,
      });

      if (!roastResult.text) {
        await interaction.editReply(
          "stop! Je n'arrive pas à me concentrer. Impossible de générer un roast pour le moment. Réessaie plus tard !",
        );
        logger.error(
          { roastResult },
          'Roast generation returned no text and no error - unexpected',
        );
        return;
      }

      await recordRoastUsage(guildId, interaction.user.id);

      const developmentNote =
        environment === 'development' && block
          ? '\n-# *Cooldown contourné - environnement de développement*'
          : '';

      const now = new Date();
      const generationDateTime = now.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const modelInfo = roastResult.modelVersion
        ? ` • ${roastResult.modelVersion}`
        : '';

      const metadataNote = `\n\n-# Ce contenu a été généré par une intelligence artificielle et peut être inexact ou inapproprié. Isabelle n'est pas responsable des propos tenus.\n-# ${generationDateTime}${modelInfo} • ${roastResult.totalTokens.toString()} tokens`;

      await safelySendMessage(
        interaction,
        roastResult.text + developmentNote + metadataNote,
      );
    } catch (error) {
      logger.error({ error }, 'Failed to execute roast command');
      await handleRoastError({
        interaction,
        fallbackContent: ROAST_FALLBACK_MESSAGE,
        hasDeferred,
        error,
      });
    }
  }
}
