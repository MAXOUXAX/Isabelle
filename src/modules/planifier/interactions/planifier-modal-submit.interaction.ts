import { db } from '@/db/index.js';
import { agendaEvents } from '@/db/schema.js';
import { configManager } from '@/manager/config.manager.js';
import {
  AI_OPTIONS_CUSTOM_ID,
  PLANIFIER_MODAL_CUSTOM_ID,
} from '@/modules/planifier/commands/subcommands/create.subcommand.js';
import {
  createAgendaEvent,
  updateAgendaEvent,
} from '@/modules/planifier/services/agenda.service.js';
import { parseDateRange } from '@/modules/planifier/utils/date-parser.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChannelType,
  ForumChannel,
  Guild,
  GuildBasedChannel,
  Interaction,
  MessageFlags,
} from 'discord.js';
import { and, eq } from 'drizzle-orm';

const logger = createLogger('planifier-modal-submit');

async function fetchAndValidateChannel({
  guild,
  channelId,
  channelType,
}: {
  guild: Guild;
  channelId: string;
  channelType: ChannelType;
}): Promise<{
  channel: GuildBasedChannel | null;
  error: 'wrong-type' | 'not-found' | null;
}> {
  try {
    const fetchedChannel = await guild.channels.fetch(channelId);
    if (fetchedChannel?.type !== channelType) {
      return { channel: null, error: 'wrong-type' };
    }
    return { channel: fetchedChannel, error: null };
  } catch (error) {
    logger.error({ error, channelId }, 'Failed to fetch channel');
    return { channel: null, error: 'not-found' };
  }
}

const EDIT_MODAL_PREFIX = `${PLANIFIER_MODAL_CUSTOM_ID}:edit:`;

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

export async function handlePlanifierModalSubmit(
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isModalSubmit()) return;

  const guildId = interaction.guildId;
  if (!guildId || !interaction.guild) {
    await interaction.reply({
      content: 'Cette commande doit être utilisée dans un serveur.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const eventLabel = interaction.fields.getTextInputValue('event-label');
  const eventDescription =
    interaction.fields.getTextInputValue('event-description');
  const eventDatesStr = interaction.fields.getTextInputValue('event-dates');
  const eventLocation = interaction.fields.getTextInputValue('event-location');
  const aiOptionsValues =
    interaction.fields.getStringSelectValues(AI_OPTIONS_CUSTOM_ID);

  const aiOptions = parseAiOptions(aiOptionsValues);

  const dateRange = parseDateRange(eventDatesStr);

  if (!dateRange) {
    await interaction.reply({
      content:
        'Les dates ne sont pas valides.\nFormats acceptés:\n• `26/03/2025 14:00` (deadline)\n• `26/03/2025 14:00 - 26/03/2025 16:00` (plage)',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { startDate, endDate } = dateRange;

  const editEventId = getEditEventId(interaction.customId);
  const isEdit = Boolean(editEventId);

  if (!isEdit && startDate.getTime() < Date.now()) {
    await interaction.reply({
      content:
        "La date de début est dans le passé. Choisis une date future pour créer l'événement.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (startDate >= endDate) {
    await interaction.reply({
      content: 'La date de fin doit être après la date de début.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const config = configManager.getGuild(guildId);
  const forumChannelId = config.PLANIFIER_FORUM_CHANNEL_ID;
  const fisaRoleId = config.PLANIFIER_FISA_ROLE_ID;

  if (!isEdit && !fisaRoleId) {
    await interaction.reply({
      content:
        "Le rôle FISA n'est pas configuré. Utilise `/planifier config role:<rôle>` pour le définir.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!isEdit && !forumChannelId) {
    await interaction.reply({
      content:
        "Le salon forum n'a pas été configuré. Utilise `/planifier config forum:<salon>` pour le configurer.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    if (isEdit && editEventId) {
      const events = await db
        .select()
        .from(agendaEvents)
        .where(
          and(
            eq(agendaEvents.guildId, guildId),
            eq(agendaEvents.discordEventId, editEventId),
          ),
        )
        .limit(1);

      if (events.length === 0) {
        await interaction.editReply({
          content:
            'Impossible de retrouver cet événement. Relance `/planifier list`.',
        });
        return;
      }

      const [eventRecord] = events;

      const { scheduledEvent, thread } = await updateAgendaEvent({
        guild: interaction.guild,
        eventId: editEventId,
        eventLabel,
        eventDescription,
        eventLocation,
        startDate,
        endDate,
        aiOptions,
        roleId: fisaRoleId,
        baseEmoji: eventRecord.emoji,
        threadId: eventRecord.discordThreadId,
      });

      await interaction.editReply({
        content: `L'événement **${scheduledEvent.name}** a été modifié !\n\n📅 Événement : ${scheduledEvent.url}\n💬 Discussion : <#${thread.id}>`,
      });
      return;
    }

    const { channel: forumChannel, error } = await fetchAndValidateChannel({
      guild: interaction.guild,
      channelId: forumChannelId ?? '',
      channelType: ChannelType.GuildForum,
    });

    if (error === 'not-found') {
      await interaction.editReply({
        content:
          "Le salon forum n'a pas été trouvé. Reconfigure-le avec `/planifier config forum:<salon>`.",
      });
      return;
    }

    if (error === 'wrong-type') {
      await interaction.editReply({
        content:
          "Le salon forum configuré n'est plus un salon forum. Reconfigure-le avec `/planifier config forum:<salon>`.",
      });
      return;
    }

    const { scheduledEvent, thread } = await createAgendaEvent({
      guild: interaction.guild,
      forumChannel: forumChannel as ForumChannel,
      eventLabel,
      eventDescription,
      eventLocation,
      startDate,
      endDate,
      aiOptions,
      roleId: fisaRoleId,
    });

    await interaction.editReply({
      content: `L'événement **${scheduledEvent.name}** a été créé !\n\n📅 Événement : ${scheduledEvent.url}\n💬 Discussion : <#${thread.id}>`,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create planifier event');
    await interaction.editReply({
      content:
        "Une erreur est survenue lors de la création de l'événement. Vérifie que le bot a les permissions nécessaires.",
    });
  }
}
