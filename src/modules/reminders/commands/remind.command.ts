import { db } from '@/db/index.js';
import { reminders } from '@/db/schema.js';
import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

const logger = createLogger('command:remind');

export class RemindCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('rappel')
    .setDescription('Programmer un rappel')
    .addStringOption((option) =>
      option
        .setName('duree')
        .setDescription('Dans combien de temps ? (ex: 10m, 1h, 2j)')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('Le message de rappel')
        .setRequired(true),
    );

  async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "Cette commande n'est disponible que sur les serveurs.",
        ephemeral: true,
      });
      return;
    }

    const durationInput = interaction.options.getString('duree', true);
    const message = interaction.options.getString('message', true);

    const duration = this.parseDuration(durationInput);

    if (!duration) {
      await interaction.reply({
        content:
          "Je n'ai pas compris la durée. Utilisez le format : nombre + lettre (m pour minutes, h pour heures, j pour jours). Exemple : 10m, 1h, 2j.",
        ephemeral: true,
      });
      return;
    }

    const dueAt = new Date(Date.now() + duration);

    try {
      await db.insert(reminders).values({
        userId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        message,
        dueAt,
      });

      const timestamp = Math.floor(dueAt.getTime() / 1000);
      await interaction.reply({
        content: `Rappel programmé pour le <t:${String(timestamp)}:F> (<t:${String(timestamp)}:R>) : "${message}"`,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create reminder');
      await interaction.reply({
        content: 'Une erreur est survenue lors de la création du rappel.',
        ephemeral: true,
      });
    }
  }

  private parseDuration(input: string): number | null {
    const regex =
      /^(\d+)\s*(m|min|minutes?|h|heures?|hours?|j|jours?|d|days?)$/i;
    const match = regex.exec(input);

    if (!match) {
      return null;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (unit.startsWith('m')) {
      return value * 60 * 1000;
    }
    if (unit.startsWith('h')) {
      return value * 60 * 60 * 1000;
    }
    if (unit.startsWith('j') || unit.startsWith('d')) {
      return value * 24 * 60 * 60 * 1000;
    }

    return null;
  }
}
