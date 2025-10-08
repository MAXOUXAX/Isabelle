import { db } from '@/db/index.js';
import { roastUsage } from '@/db/schema.js';
import { IsabelleCommand } from '@/manager/commands/command.interface.js';
import {
  DAY_IN_MS,
  fromDrizzleDate,
  HOUR_IN_MS,
  timeUntilNextUse,
} from '@/utils/date.js';
import { fetchLastUserMessages } from '@/utils/message-picker.js';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import {
  CommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  time,
  TimestampStyles,
} from 'discord.js';

const parsedMaxRoasts = Number.parseInt(
  (process.env.MAX_ROASTS_PER_USER_PER_DAY ?? '2').trim(),
  10,
);
const MAX_ROASTS_PER_USER_PER_DAY = Number.isNaN(parsedMaxRoasts)
  ? 2
  : parsedMaxRoasts;

export class TrashTalkCommand implements IsabelleCommand {
  commandData = new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Trashtalk un camarade')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription("L'utilisateur à roast")
        .setRequired(true),
    );

  async executeCommand(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({
        content: 'Cette commande doit être utilisée sur un serveur.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.isChatInputCommand()) {
      await interaction.reply({
        content:
          'Cette commande slash uniquement est invalide dans ce contexte.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const { guildId, guild } = interaction;

    if (process.env.NODE_ENV === 'production') {
      const lastUsage = await db.query.roastUsage.findFirst({
        where: (table, { and, eq }) =>
          and(
            eq(table.guildId, guildId),
            eq(table.userId, interaction.user.id),
          ),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });

      if (lastUsage) {
        const lastUsageDate = fromDrizzleDate(lastUsage.createdAt);
        const timeSinceLastUsage = Date.now() - lastUsageDate.getTime();
        if (timeSinceLastUsage < HOUR_IN_MS) {
          await interaction.reply({
            content:
              'On reste gentil avec les copains. Tu devras attendre un peu avant de roast à nouveau.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      const dayThreshold = new Date(Date.now() - DAY_IN_MS);

      const rows = await db.query.roastUsage.findMany({
        where: (table, { and, eq, gt }) =>
          and(
            eq(table.guildId, guildId),
            eq(table.userId, interaction.user.id),
            gt(table.createdAt, dayThreshold),
          ),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });

      if (rows.length >= MAX_ROASTS_PER_USER_PER_DAY) {
        await interaction.reply({
          content: `Tu as déjà roast ${String(MAX_ROASTS_PER_USER_PER_DAY)} fois aujourd'hui. On va calmer le jeu. Tu pourras roast à nouveau ${time(
            timeUntilNextUse(lastUsage?.createdAt),
            TimestampStyles.RelativeTime,
          )}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    const user = interaction.options.getUser('user');
    if (!user) {
      await interaction.reply({
        content: 'Utilisateur non trouvé.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (user.bot) {
      await interaction.reply(
        'Je ne vais pas roast un bot, finis les conneries. stop!',
      );
      return;
    }

    const lastUserMessages = await fetchLastUserMessages(guild, user.id, 25);

    if (lastUserMessages.length === 0) {
      await interaction.reply({
        content:
          "Je n'ai pas pu trouver de messages récents de cet utilisateur pour le roast.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    const result = await generateText({
      model: google('gemini-flash-lite-latest'),
      messages: [
        {
          role: 'user',
          content:
            'Tu es une professeure de communication fatiguée et assez impatiente.\n' +
            'Sois directe, un peu crue, mais sans être insultante.\n' +
            "Trashtalk l'utilisateur. Voici quelques-uns de ses messages récents pour t'aider à le connaître :\n" +
            lastUserMessages.map((msg) => `- ${msg.content}`).join('\n') +
            '\nFais en sorte que ce soit pertinent par rapport à ses messages.',
        },
      ],
    });

    const roast = result.text.trim();
    if (!roast) {
      await interaction.editReply(
        "stop! Je n'arrive pas à me concentrer. Impossible de générer un roast pour le moment. Réessaie plus tard !",
      );
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      await db.insert(roastUsage).values({
        guildId,
        userId: interaction.user.id,
      });
    }

    await interaction.editReply(roast);
    return;
  }
}
