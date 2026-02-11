import { configManager } from '@/manager/config.manager.js';
import { AGENDA_EVENT_ACTION_ID } from '@/modules/agenda/messages/agenda-list-message.js';
import {
  AGENDA_MODAL_CUSTOM_ID,
  buildAgendaModal,
} from '@/modules/agenda/messages/agenda-modal.js';
import {
  AgendaUserError,
  withAgendaErrorHandling,
} from '@/modules/agenda/utils/agenda-errors.js';
import { formatDateRangeInput } from '@/modules/agenda/utils/date-parser.js';
import { requireGuild } from '@/modules/agenda/utils/interaction-guards.js';
import { InteractionHandler } from '@/modules/bot-module.js';
import { createLogger } from '@/utils/logger.js';
import {
  ButtonInteraction,
  DiscordAPIError,
  Interaction,
  MessageFlags,
} from 'discord.js';
import {
  deleteAgendaEventResources,
  findAgendaEventByDiscordId,
} from '../services/agenda.service.js';

const logger = createLogger('agenda-list-actions');

export class AgendaListActionsHandler implements InteractionHandler {
  customId: string = AGENDA_EVENT_ACTION_ID;

  async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) {
      return;
    }
    const handler = withAgendaErrorHandling(
      logger,
      async (buttonInteraction: ButtonInteraction): Promise<void> => {
        const { guild, guildId } = requireGuild(buttonInteraction);
        const [, , action, eventId] = buttonInteraction.customId.split(':');

        if (!action || !eventId) {
          throw new AgendaUserError(
            'Action invalide. Utilise `/agenda list` pour réessayer.',
          );
        }

        const event = await findAgendaEventByDiscordId(guildId, eventId);

        if (!event) {
          throw new AgendaUserError(
            'Impossible de retrouver cet événement. Rafraîchis la liste avec `/agenda list`.',
          );
        }

        if (action === 'edit') {
          const modal = buildAgendaModal({
            customId: `${AGENDA_MODAL_CUSTOM_ID}:edit:${eventId}`,
            defaults: {
              title: event.title,
              description: event.description,
              location: event.location,
              dates: formatDateRangeInput(
                event.eventStartTime,
                event.eventEndTime,
              ),
            },
          });

          await buttonInteraction.showModal(modal);
          return;
        }

        if (action === 'delete') {
          await buttonInteraction.deferReply({ flags: MessageFlags.Ephemeral });

          const config = configManager.getGuild(guildId);
          const { eventName, threadDeleted } = await deleteAgendaEventResources(
            {
              guild,
              eventId,
              forumChannelId: config.AGENDA_FORUM_CHANNEL_ID,
              eventRecord: event,
            },
          );

          try {
            await buttonInteraction.editReply({
              content: `L'événement **${eventName}** a été supprimé.${
                threadDeleted
                  ? ' Le fil de discussion associé a également été supprimé.'
                  : ''
              }`,
            });
          } catch (error) {
            if (!(error instanceof DiscordAPIError) || error.code !== 10008) {
              throw error;
            }
            // If the channel was deleted, ignore the reply failure
          }
          return;
        }

        throw new AgendaUserError(
          'Action inconnue. Utilise `/agenda list` pour réessayer.',
        );
      },
      "Une erreur est survenue lors de l'action agenda. Vérifie que j'ai les permissions nécessaires.",
      'edit',
    );

    await handler(interaction);
  }
}
