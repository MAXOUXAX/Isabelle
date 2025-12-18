import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { humanTime } from '@/utils/date.js';
import {
  createLessonEmbed,
  createLessonEmbeds,
  getEndOfTodayLessons,
  getTodaysLessons,
  getTodaysNextLesson,
  getTomorrowsLessons,
} from '@/utils/schedule.js';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  time,
  TimestampStyles,
} from 'discord.js';

export class ScheduleCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('schedule')
    .setDescription("Consultation de l'emploi du temps")
    .addSubcommand((subcommand) =>
      subcommand
        .setName('aujourdhui')
        .setDescription("Affiche tous les cours d'aujourd'hui"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('demain')
        .setDescription('Affiche tous les cours de demain'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('cours-suivant')
        .setDescription('Affiche le prochain cours de la journée.'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('fin-de-journée')
        .setDescription("Affiche l'heure de fin des cours du jour."),
    );

  public async executeCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const subcommand: string = interaction.options.getSubcommand();

    const handlers: Record<string, () => Promise<void>> = {
      aujourdhui: () => this.handleTodaysClassesCommand(interaction),
      demain: () => this.handleTomorrowClassesCommand(interaction),
      'cours-suivant': () => this.handleNextClassCommand(interaction),
      'fin-de-journée': () => this.handleEndOfDayCommand(interaction),
    };

    const handler = handlers[subcommand];
    await handler();
  }

  private async handleTodaysClassesCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const lessons = await getTodaysLessons();
    if (lessons.length === 0) {
      await interaction.reply({
        ephemeral: true,
        content:
          "Aujourd'hui c'est dodo...\n-# *Aucun cours n'est prévu aujourd'hui*",
      });
      return;
    }

    await interaction.reply({
      ephemeral: false,
      embeds: createLessonEmbeds(lessons),
    });
  }

  private async handleTomorrowClassesCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const lessons = await getTomorrowsLessons();
    if (lessons.length === 0) {
      await interaction.reply({
        ephemeral: true,
        content: "Demain c'est dodo...\n-# *Aucun cours n'est prévu demain*",
      });
      return;
    }

    await interaction.reply({
      ephemeral: false,
      embeds: createLessonEmbeds(lessons),
    });
  }

  private async handleNextClassCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const lesson = await getTodaysNextLesson();

    if (!lesson) {
      await interaction.reply({
        ephemeral: false,
        content: "Les cours c'est stop! IL\n-# *La journée est terminée*",
      });
      return;
    }

    await interaction.reply({
      ephemeral: false,
      embeds: [createLessonEmbed(lesson, { useShortTime: true })],
    });
  }

  private async handleEndOfDayCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const lessonEnd = await getEndOfTodayLessons();

    if (!lessonEnd) {
      await interaction.reply({
        ephemeral: false,
        content: "Y a pas cours aujourd'hui, lâchez moi!",
      });
      return;
    }

    await interaction.reply({
      ephemeral: interaction.options.getBoolean('ephemeral') ?? false,
      content: `Les cours finissent à ${humanTime(lessonEnd)} soit ${time(lessonEnd, TimestampStyles.RelativeTime)}`,
    });
  }
}
