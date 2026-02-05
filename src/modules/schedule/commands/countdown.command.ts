import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { getCurrentLesson, getLastLessonOfWeek } from '@/utils/schedule.js';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  time,
  TimestampStyles,
} from 'discord.js';

export class CountdownCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('compte-a-rebours')
    .setDescription('Affiche un compte à rebours')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('fin-cours')
        .setDescription("Affiche le temps restant jusqu'à la fin du cours"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('weekend')
        .setDescription("Affiche le temps restant jusqu'au week-end"),
    );

  public async executeCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'fin-cours') {
      await this.handleEndClassCommand(interaction);
    } else if (subcommand === 'weekend') {
      await this.handleWeekendCommand(interaction);
    }
  }

  private async handleEndClassCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const lesson = await getCurrentLesson();

    if (!lesson) {
      await interaction.reply({
        content: "Il n'y a aucun cours en ce moment.",
        ephemeral: true,
      });
      return;
    }

    const timestamp = time(lesson.end, TimestampStyles.RelativeTime);
    await interaction.reply({
      content: `La fin du cours est ${timestamp}.`,
    });
  }

  private async handleWeekendCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const lesson = await getLastLessonOfWeek();

    if (!lesson) {
      await interaction.reply({
        content: "Aucun cours trouvé pour cette semaine.",
        ephemeral: true,
      });
      return;
    }

    const timestamp = time(lesson.end, TimestampStyles.RelativeTime);
    await interaction.reply({
      content: `Le week-end commence ${timestamp}.`,
    });
  }
}
