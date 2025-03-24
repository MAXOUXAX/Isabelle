import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import { humanDate, humanTime } from '@/utils/date.js';
import {
  getEndOfTodayLessons,
  getNextLesson,
  getTodaysLessons,
} from '@/utils/schedule.js';
import {
  ColorResolvable,
  CommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  time,
  TimestampStyles,
} from 'discord.js';

export class TodaysLessonCommand implements IsabelleCommand {
  commandData: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('todays-lessons')
    .setDescription('Affiche les cours du jour (passés ou non).');

  async executeCommand(interaction: CommandInteraction) {
    const lessons = await getTodaysLessons();

    if (lessons.length === 0) {
      return await interaction.reply({
        ephemeral: true,
        content: "Aujourd'hui c'est dodo...",
      });
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

    return await interaction.reply({
      ephemeral: false,
      embeds: embeds,
    });
  }
}

export class NextLessonCommand implements IsabelleCommand {
  commandData: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('next-lesson')
    .setDescription('Affiche le prochain cours de la journée.');

  async executeCommand(interaction: CommandInteraction) {
    const lesson = await getNextLesson();

    if (!lesson) {
      return await interaction.reply({
        ephemeral: false,
        content: "Les cours c'est stop! IL",
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(lesson.name)
      .addFields(
        { name: 'Début', value: humanTime(lesson.start) },
        { name: 'Fin', value: humanTime(lesson.end) },
        { name: 'Salle', value: lesson.room },
      )
      .setColor(lesson.color as ColorResolvable);

    return await interaction.reply({
      ephemeral: false,
      embeds: [embed],
    });
  }
}

export class EndOfLessonsCommand implements IsabelleCommand {
  commandData: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('lessons-end')
    .setDescription('Affiche quand se termine la journée.');

  async executeCommand(interaction: CommandInteraction) {
    const lessonEnd = await getEndOfTodayLessons();

    if (!lessonEnd) {
      return await interaction.reply({
        ephemeral: false,
        content: "Y a pas cours aujourd'hui, lâchez moi!",
      });
    }

    return await interaction.reply({
      ephemeral: false,
      content: `Les cours finissent à ${humanTime(lessonEnd)} soit ${time(lessonEnd, TimestampStyles.RelativeTime)}`,
    });
  }
}
