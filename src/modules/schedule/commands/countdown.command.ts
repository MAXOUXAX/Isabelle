import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { createLogger } from '@/utils/logger.js';
import {
  getCurrentLesson,
  getEndOfTodayLessons,
  getLastLessonOfWeek,
} from '@/utils/schedule.js';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  time,
  TimestampStyles,
} from 'discord.js';

const logger = createLogger('countdown-command');

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
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('fin-journee')
        .setDescription("Affiche le temps restant jusqu'à la fin des cours"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('manger')
        .setDescription("Affiche le temps restant jusqu'à 12h"),
    );

  public async executeCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'fin-cours') {
      await this.handleEndClassCommand(interaction);
    } else if (subcommand === 'weekend') {
      await this.handleWeekendCommand(interaction);
    } else if (subcommand === 'fin-journee') {
      await this.handleEndOfDayCommand(interaction);
    } else if (subcommand === 'manger') {
      await this.handleLunchCommand(interaction);
    } else {
      await interaction.editReply({
        content: 'Cette sous-commande est introuvable.',
      });
    }
  }

  private async handleEndClassCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    try {
      const lesson = await getCurrentLesson();

      if (!lesson) {
        await interaction.editReply({
          content: "Il n'y a aucun cours en ce moment.",
        });
        return;
      }

      const timestamp = time(lesson.end, TimestampStyles.RelativeTime);
      await interaction.editReply({
        content: `Le cours se termine ${timestamp}.`,
      });
    } catch (error) {
      logger.error({ error }, 'Impossible de récupérer le cours actuel');
      await interaction.editReply({
        content:
          'Impossible de récupérer le cours en cours pour le moment. Réessaie dans quelques instants.',
      });
    }
  }

  private async handleWeekendCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    try {
      const lesson = await getLastLessonOfWeek();

      if (!lesson) {
        await interaction.editReply({
          content: 'Aucun cours trouvé pour cette semaine.',
        });
        return;
      }

      const timestamp = time(lesson.end, TimestampStyles.RelativeTime);
      await interaction.editReply({
        content: `Le week-end commence ${timestamp}.`,
      });
    } catch (error) {
      logger.error(
        { error },
        'Impossible de récupérer le dernier cours de la semaine',
      );
      await interaction.editReply({
        content:
          'Impossible de calculer le début du week-end pour le moment. Réessaie dans quelques instants.',
      });
    }
  }

  private async handleEndOfDayCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    try {
      const lessonEnd = await getEndOfTodayLessons();
      const now = new Date();

      if (!lessonEnd) {
        await interaction.editReply({
          content: "Aucun cours prévu aujourd'hui.",
        });
        return;
      }

      if (lessonEnd <= now) {
        await interaction.editReply({
          content: "Les cours sont terminés pour aujourd'hui.",
        });
        return;
      }

      const timestamp = time(lessonEnd, TimestampStyles.RelativeTime);
      await interaction.editReply({
        content: `La journée se termine ${timestamp}.`,
      });
    } catch (error) {
      logger.error(
        { error },
        "Impossible de récupérer l'heure de fin des cours",
      );
      await interaction.editReply({
        content:
          'Impossible de récupérer la fin de journée pour le moment. Réessaie dans quelques instants.',
      });
    }
  }

  private async handleLunchCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const now = new Date();
    const noon = new Date(now);
    noon.setHours(12, 0, 0, 0);

    if (now >= noon) {
      await interaction.editReply({
        content: 'Il est déjà midi passé. Bon appétit 😋',
      });
      return;
    }

    const timestamp = time(noon, TimestampStyles.RelativeTime);
    await interaction.editReply({
      content: `Manger ${timestamp}.`,
    });
  }
}
