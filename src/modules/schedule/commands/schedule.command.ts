import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { humanDate, humanTime } from '@/utils/date.js';
import {
  getEndOfTodayLessons,
  getTodaysLessons,
  getTodaysNextLesson,
} from '@/utils/schedule.js';
import {
  ChatInputCommandInteraction,
  ColorResolvable,
  EmbedBuilder,
  SlashCommandBuilder,
  time,
  TimestampStyles
} from 'discord.js';

export class TodaysLessonCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('todays-lessons')
    .setDescription('Affiche les cours du jour (passés ou non).')
    .addSubcommand(subcommand =>
      subcommand
        .setName('get')
        .setDescription('Affiche tous les cours du jour (passés ou non).')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('next')
        .setDescription('Affiche le prochain cours de la journée.')
        .addBooleanOption(option =>
          option.setName('ephemeral')
            .setDescription('Répondre en privé')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('Affiche l\'heure de fin des cours du jour.')
    );




  public async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand: string = interaction.options.getSubcommand();

    const handlers: Record<string, () => Promise<void>> = {
      get: () => this.handleGetCommand(interaction),
      next: () => this.handleNextCommand(interaction),
      end: () => this.handleEndCommand(interaction),
    };

    const handler = handlers[subcommand];
    if (handler) {
      await handler();
    } else {
      await interaction.reply({
        ephemeral: true,
        content: 'Qu\'est-ce que tu me demandes frérot ?',
      });
    }
  }

  private async handleGetCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const lessons = await getTodaysLessons();
    if (lessons.length === 0) {
      await interaction.reply({
        ephemeral: true,
        content: "Aujourd'hui c'est dodo...",
      });
      return;
    }

    const embeds = [];

    for (const lesson of lessons) {
      const embed = new EmbedBuilder()
        .setTitle(lesson.name)
        .addFields(
          { name: 'Début', value: humanDate(lesson.start) },
          { name: 'Fin', value: humanDate(lesson.end) },
          { name: 'Salle', value: lesson.room },
        )
        .setColor(lesson.color as ColorResolvable);

      embeds.push(embed);
    }

    await interaction.reply({
      ephemeral: false,
      embeds: embeds,
    });
  }

  private async handleNextCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const lesson = await getTodaysNextLesson();

    if (!lesson) {
      await interaction.reply({
        ephemeral: false,
        content: "Les cours c'est stop! IL",
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(lesson.name)
      .addFields(
        { name: 'Début', value: humanTime(lesson.start) },
        { name: 'Fin', value: humanTime(lesson.end) },
        { name: 'Salle', value: lesson.room },
      )
      .setColor(lesson.color as ColorResolvable);

    await interaction.reply({
      ephemeral: false,
      embeds: [embed],
    });
  }

  private async handleEndCommand(interaction: ChatInputCommandInteraction): Promise<void> {
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
