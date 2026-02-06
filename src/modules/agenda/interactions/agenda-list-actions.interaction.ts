import { configManager } from '@/manager/config.manager.js';
import {
  AGENDA_MODAL_CUSTOM_ID,
  buildAgendaModal,
} from '@/modules/agenda/commands/subcommands/create.subcommand.js';
import { AGENDA_EVENT_ACTION_ID } from '@/modules/agenda/messages/agenda-list-message.js';
import {
  deleteAgendaEventResources,
  findAgendaEventByDiscordId,
} from '@/modules/agenda/services/agenda.service.js';
import { formatDateRangeInput } from '@/modules/agenda/utils/date-parser.js';
import { InteractionHandler } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import { Interaction, MessageFlags } from 'discord.js';

const logger = createLogger('agenda-list-actions');

export class AgendaListActionsHandler implements InteractionHandler {
  customId: string = AGENDA_EVENT_ACTION_ID;

  async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) {
      return;
    }

    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: 'Cette interaction doit être utilisée dans un serveur.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const parts = interaction.customId.split(':');
    const action = parts[2];
    const eventId = parts[3];

    if (!action || !eventId) {
      await interaction.reply({
        content: 'Action invalide. Utilise `/agenda list` pour réessayer.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const event = await findAgendaEventByDiscordId(
      interaction.guildId,
      eventId,
    );

    if (!event) {
      await interaction.reply({
        content:
          'Impossible de retrouver cet événement. Rafraîchis la liste avec `/agenda list`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'edit') {
      const modal = buildAgendaModal({
        customId: `${AGENDA_MODAL_CUSTOM_ID}:edit:${eventId}`,
        defaults: {
          title: event.title,
          description: event.description,
          location: event.location,
          dates: formatDateRangeInput(event.eventStartTime, event.eventEndTime),
          aiOptions: ['enhance', 'emoji'],
        },
      });

      await interaction.showModal(modal);
      return;
    }

    if (action === 'delete') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const config = configManager.getGuild(interaction.guildId);
        const { eventName, threadDeleted } = await deleteAgendaEventResources({
          guild: interaction.guild,
          eventId,
          forumChannelId: config.AGENDA_FORUM_CHANNEL_ID,
          eventRecord: event,
        });

        await interaction.editReply({
          content: `L'événement **${eventName}** a été supprimé.${
            threadDeleted
              ? ' Le fil de discussion associé a également été supprimé.'
              : ''
          }`,
        });
      } catch (error) {
        logger.error({ error, eventId }, 'Failed to delete scheduled event');
        await interaction.editReply({
          content:
            "Une erreur est survenue lors de la suppression de l'événement. Vérifie que j'ai les permissions nécessaires.",
        });
      }
      return;
    }

    await interaction.reply({
      content: 'Action inconnue. Utilise `/agenda list` pour réessayer.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
