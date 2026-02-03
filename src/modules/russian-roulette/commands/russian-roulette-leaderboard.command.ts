import { db } from '@/db/index.js';
import { russianRouletteStats } from '@/db/schema.js';
import {
  LEADERBOARD_ROWS_COUNT,
  prepareLeaderboardEntries,
} from '@/modules/russian-roulette/images/leaderboard-data.js';
import {
  renderEmptyLeaderboard,
  renderLeaderboard,
} from '@/modules/russian-roulette/images/leaderboard-renderer.js';
import { createLogger } from '@/utils/logger.js';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { desc, eq } from 'drizzle-orm';

const logger = createLogger('roulette-leaderboard');

export const executeLeaderboardCommand = async (
  interaction: ChatInputCommandInteraction,
) => {
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      content: 'Cette commande ne peut être utilisée que sur un serveur.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const stats = await db
      .select({
        userId: russianRouletteStats.userId,
        timeoutMinutes: russianRouletteStats.timeoutMinutes,
        plays: russianRouletteStats.plays,
        shots: russianRouletteStats.shots,
        deaths: russianRouletteStats.deaths,
      })
      .from(russianRouletteStats)
      .where(eq(russianRouletteStats.guildId, guild.id))
      // Optimization: Sort by timeoutMinutes, deaths, and shots to match the
      // backing composite index `russian_roulette_stats_leaderboard_idx`.
      .orderBy(
        desc(russianRouletteStats.timeoutMinutes),
        desc(russianRouletteStats.deaths),
        desc(russianRouletteStats.shots),
      )
      // Optimization: Limit to LEADERBOARD_ROWS_COUNT to avoid fetching all stats
      .limit(LEADERBOARD_ROWS_COUNT);

    // No one played yet
    if (stats.length === 0) {
      const emptyImage = await renderEmptyLeaderboard();
      await interaction.editReply({
        files: [emptyImage],
      });
      return;
    }

    // Fetch all members for display names and avatars
    const memberIds = stats.map((s) => s.userId);
    const members = await guild.members.fetch({ user: memberIds });

    // Prepare entries for rendering
    const entries = prepareLeaderboardEntries(
      stats,
      members,
      LEADERBOARD_ROWS_COUNT,
    );

    // Render the leaderboard image
    const image = await renderLeaderboard(entries);

    await interaction.editReply({
      files: [image],
    });
  } catch (error) {
    logger.error({ error }, 'Failed to generate leaderboard');
    await interaction.editReply({
      content:
        'Une erreur est survenue lors de la génération du classement. Veuillez réessayer.',
    });
  }
};
