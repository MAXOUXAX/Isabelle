import { Interaction } from 'discord.js';
import { Logger } from 'pino';

/**
 * Handles errors during interaction execution.
 * Logs the error securely and sends a generic message to the user.
 *
 * @param error The error that occurred
 * @param interaction The interaction that failed
 * @param logger The logger to use
 */
export async function handleInteractionError(
  error: unknown,
  interaction: Interaction,
  logger: Logger,
): Promise<void> {
  // Log the error with context
  logger.error(
    {
      error,
      interactionType: interaction.type,
      commandName: interaction.isCommand() ? interaction.commandName : undefined,
      customId: 'customId' in interaction ? interaction.customId : undefined,
      userId: interaction.user.id,
      guildId: interaction.guildId,
    },
    'Interaction handling failed',
  );

  // We only handle interactions that can be replied to (e.g. commands, context menus, buttons, select menus, modals)
  if (!interaction.isRepliable()) return;

  // SECURITY: Do NOT expose internal error details to the user.
  // We log the full error above but show a generic message to the user.
  const genericMessage =
    'Une erreur inattendue est survenue. Veuillez contacter un administrateur.';

  // Only reply if the interaction hasn't been replied to already
  if (interaction.replied || interaction.deferred) {
    await interaction
      .followUp({
        content: genericMessage,
        ephemeral: true,
      })
      .catch((err: unknown) => {
        logger.error(
          { error: err },
          'Failed to send followup message after interaction error',
        );
      });
  } else {
    await interaction
      .reply({
        content: genericMessage,
        ephemeral: true,
      })
      .catch((err: unknown) => {
        logger.error(
          { error: err },
          'Failed to reply to interaction after error',
        );
      });
  }
}
