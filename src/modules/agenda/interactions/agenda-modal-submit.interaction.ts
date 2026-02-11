import { configManager } from '@/manager/config.manager.js';
import {
  AGENDA_MODAL_CUSTOM_ID,
  AI_OPTIONS_CUSTOM_ID,
} from '@/modules/agenda/messages/agenda-modal.js';
import {
  AgendaUserError,
  withAgendaErrorHandling,
} from '@/modules/agenda/utils/agenda-errors.js';
import { parseDateRange } from '@/modules/agenda/utils/date-parser.js';
import {
  requireConfigValue,
  requireGuild,
} from '@/modules/agenda/utils/interaction-guards.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChannelType,
  ForumChannel,
  Guild,
  GuildBasedChannel,
  Interaction,
  MessageFlags,
  ModalSubmitInteraction,
} from 'discord.js';
import {
  createAgendaEvent,
  findAgendaEventByDiscordId,
  updateAgendaEvent,
} from '../services/agenda.service.js';

const logger = createLogger('agenda-modal-submit');

async function fetchAndValidateChannel({
  guild,
  channelId,
  channelType,
}: {
  guild: Guild;
  channelId: string;
  channelType: ChannelType;
}): Promise<GuildBasedChannel> {
  try {
    const fetchedChannel = await guild.channels.fetch(channelId);

    if (!fetchedChannel) {
      throw new AgendaUserError(
        "Le salon forum n'a pas été trouvé. Reconfigure-le avec `/agenda config forum:<salon>`.",
      );
    }

    if (fetchedChannel.type !== channelType) {
      throw new AgendaUserError(
        "Le salon forum configuré n'est plus un salon forum. Reconfigure-le avec `/agenda config forum:<salon>`.",
      );
    }

    return fetchedChannel;
  } catch (error) {
    if (error instanceof AgendaUserError) {
      throw error;
    }

    logger.error({ error, channelId }, 'Failed to fetch channel');
    throw new AgendaUserError(
      "Le salon forum n'a pas été trouvé. Reconfigure-le avec `/agenda config forum:<salon>`.",
    );
  }
}

const EDIT_MODAL_PREFIX = `${AGENDA_MODAL_CUSTOM_ID}:edit:`;

function getEditEventId(customId: string): string | null {
  if (!customId.startsWith(EDIT_MODAL_PREFIX)) {
    return null;
  }

  const parts = customId.split(':');
  return parts[2] ?? null;
}

function parseAiOptions(values: readonly string[]): {
  enhanceText: boolean;
  enhanceEmoji: boolean;
} {
  return {
    enhanceText: values.includes('enhance'),
    enhanceEmoji: values.includes('emoji'),
  };
}

export async function handleAgendaModalSubmit(
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isModalSubmit()) return;
  const handler = withAgendaErrorHandling(
    logger,
    async (modalInteraction: ModalSubmitInteraction): Promise<void> => {
      const { guild, guildId } = requireGuild(modalInteraction);

      const eventLabel =
        modalInteraction.fields.getTextInputValue('event-label');
      const eventDescription =
        modalInteraction.fields.getTextInputValue('event-description');
      const eventDatesStr =
        modalInteraction.fields.getTextInputValue('event-dates');
      const eventLocation =
        modalInteraction.fields.getTextInputValue('event-location');
      const aiOptionsValues =
        modalInteraction.fields.getStringSelectValues(AI_OPTIONS_CUSTOM_ID);

      const aiOptions = parseAiOptions(aiOptionsValues);
      const dateRange = parseDateRange(eventDatesStr);

      if (!dateRange) {
        throw new AgendaUserError(
          'Les dates ne sont pas valides.\nFormats acceptés:\n• `26/03/2025 14:00` (deadline)\n• `26/03/2025 14:00 - 26/03/2025 16:00` (plage)',
        );
      }

      const { startDate, endDate } = dateRange;
      const editEventId = getEditEventId(modalInteraction.customId);
      const isEdit = Boolean(editEventId);

      if (!isEdit && startDate.getTime() < Date.now()) {
        throw new AgendaUserError(
          "La date de début est dans le passé. Choisis une date future pour créer l'événement.",
        );
      }

      if (startDate >= endDate) {
        throw new AgendaUserError(
          'La date de fin doit être après la date de début.',
        );
      }

      const config = configManager.getGuild(guildId);
      const forumChannelId = config.AGENDA_FORUM_CHANNEL_ID;
      const roleToMentionId = config.AGENDA_ROLE_TO_MENTION;

      if (!isEdit) {
        requireConfigValue(
          roleToMentionId,
          "Le rôle à mentionner n'est pas configuré. Utilise `/agenda config role:<rôle>` pour le définir.",
        );
        requireConfigValue(
          forumChannelId,
          "Le salon forum n'a pas été configuré. Utilise `/agenda config forum:<salon>` pour le configurer.",
        );
      }

      await modalInteraction.deferReply({ flags: MessageFlags.Ephemeral });

      if (isEdit && editEventId) {
        const eventRecord = await findAgendaEventByDiscordId(
          guildId,
          editEventId,
        );

        if (!eventRecord) {
          throw new AgendaUserError(
            'Impossible de retrouver cet événement. Relance `/agenda list`.',
          );
        }

        const { scheduledEvent, thread } = await updateAgendaEvent({
          guild,
          eventId: editEventId,
          eventLabel,
          eventDescription,
          eventLocation,
          startDate,
          endDate,
          aiOptions,
          roleId: roleToMentionId,
          baseEmoji: eventRecord.emoji,
          threadId: eventRecord.discordThreadId,
        });

        await modalInteraction.editReply({
          content: `L'événement **${scheduledEvent.name}** a été modifié !\n\n📅 Événement : ${scheduledEvent.url}\n💬 Discussion : <#${thread.id}>`,
        });
        return;
      }

      const forumChannel = await fetchAndValidateChannel({
        guild,
        channelId: forumChannelId ?? '',
        channelType: ChannelType.GuildForum,
      });

      const { scheduledEvent, thread } = await createAgendaEvent({
        guild,
        forumChannel: forumChannel as ForumChannel,
        eventLabel,
        eventDescription,
        eventLocation,
        startDate,
        endDate,
        aiOptions,
        roleId: roleToMentionId,
      });

      await modalInteraction.editReply({
        content: `L'événement **${scheduledEvent.name}** a été créé !\n\n📅 Événement : ${scheduledEvent.url}\n💬 Discussion : <#${thread.id}>`,
      });
    },
    "Une erreur est survenue lors de la création de l'événement. Vérifie que le bot a les permissions nécessaires.",
    'edit',
  );

  await handler(interaction);
}
