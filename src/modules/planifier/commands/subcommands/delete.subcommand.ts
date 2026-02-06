import { db } from '@/db/index.js';
import { agendaEvents } from '@/db/schema.js';
import { configManager } from '@/manager/config.manager.js';
import { deleteAgendaEvent } from '@/modules/planifier/services/agenda.service.js';
import {
  AutocompleteOptionHandler,
  filterAutocompleteChoices,
} from '@/utils/autocomplete.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChannelType,
  ChatInputCommandInteraction,
  Guild,
  MessageFlags,
} from 'discord.js';
import { eq } from 'drizzle-orm';

const logger = createLogger('planifier-delete');

// Discord has a 3-second timeout for autocomplete responses
// We use a slightly shorter timeout to ensure we respond in time
const AUTOCOMPLETE_TIMEOUT_MS = 2500;

const fetchEventsWithTimeout = async (guild: Guild) => {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, AUTOCOMPLETE_TIMEOUT_MS);
  });

  const eventsPromise = db
    .select()
    .from(agendaEvents)
    .where(eq(agendaEvents.guildId, guild.id))
    .orderBy(agendaEvents.eventStartTime);

  const result = await Promise.race([eventsPromise, timeoutPromise]);

  return result;
};

export const handleDeleteAutocomplete: AutocompleteOptionHandler = async ({
  interaction,
  focusedValue,
}) => {
  if (!interaction.guild) return [];

  const events = await fetchEventsWithTimeout(interaction.guild);

  if (!events) {
    logger.debug('Autocomplete timed out while fetching scheduled events');
    return [];
  }

  const options = events.map((e) => ({
    name: e.title,
    value: e.id.toString(),
  }));

  return filterAutocompleteChoices(options, focusedValue);
};

export async function handleDeleteSubcommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild || !interaction.guildId) {
    await interaction.reply({
      content: 'Cette commande doit être utilisée dans un serveur.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const eventId = interaction.options.getString('event');

  if (!eventId) {
    await interaction.reply({
      content: 'Vous devez spécifier un événement à supprimer.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const event = await interaction.guild.scheduledEvents.fetch(eventId);
    const eventName = event.name;

    await event.delete();

    // Remove the event-thread association from the database
    await deleteAgendaEvent(interaction.guildId, eventId);

    // Try to delete associated forum thread
    let threadDeleted = false;
    const config = configManager.getGuild(interaction.guildId);
    if (config.PLANIFIER_FORUM_CHANNEL_ID) {
      try {
        const forum = await interaction.guild.channels.fetch(
          config.PLANIFIER_FORUM_CHANNEL_ID,
        );
        if (forum?.type === ChannelType.GuildForum) {
          const { threads } = await forum.threads.fetchActive();
          // Find thread that contains the event name
          // Logic relies on the thread name being constructed as `${emoji} ${eventLabel}` in creation
          const matchingThread = threads.find((t) =>
            t.name.includes(eventName),
          );

          if (matchingThread) {
            await matchingThread.delete(
              `Suppression de l'événement associé: ${eventName}`,
            );
            threadDeleted = true;
          }
        }
      } catch (err) {
        logger.warn(
          { error: err },
          'Failed to find or delete associated forum thread',
        );
      }
    }

    await interaction.reply({
      content: `L'événement **${eventName}** a été supprimé.${
        threadDeleted
          ? ' Le fil de discussion associé a également été supprimé.'
          : ''
      }`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    logger.error({ error, eventId }, 'Failed to delete scheduled event');
    await interaction.reply({
      content:
        "Une erreur est survenue lors de la suppression de l'événement. Vérifiez que j'ai les permissions nécessaires.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
