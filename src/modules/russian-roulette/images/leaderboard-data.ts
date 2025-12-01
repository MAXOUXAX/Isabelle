/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Collection, GuildMember } from 'discord.js';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

export const LEADERBOARD_COLUMN_WIDTH = 120;

export const LEADERBOARD_ROWS_COUNT = 10;

export interface LeaderboardStat {
  userId: string;
  timeoutMinutes: number;
  plays: number;
  shots: number;
  deaths: number;
}

export interface LeaderboardEntry extends LeaderboardStat {
  rank: number;
  displayName: string;
  avatarUrl: string;
}

export interface LeaderboardColumn {
  key: string;
  label: string;
  sublabel: string;
  color: string;
  format: (entry: LeaderboardEntry) => string;
}

export function prepareLeaderboardEntries(
  stats: LeaderboardStat[],
  members: Collection<string, GuildMember>,
  maxEntries: number = LEADERBOARD_ROWS_COUNT,
): LeaderboardEntry[] {
  const sorted = [...stats].sort((a, b) => {
    if (b.timeoutMinutes !== a.timeoutMinutes) {
      return b.timeoutMinutes - a.timeoutMinutes;
    }

    if (b.deaths !== a.deaths) {
      return b.deaths - a.deaths;
    }

    return b.shots - a.shots;
  });

  return sorted.slice(0, maxEntries).map((stat, index) => {
    const member = members.get(stat.userId);

    return {
      rank: index + 1,
      userId: stat.userId,
      displayName: member?.displayName ?? 'Utilisateur inconnu',
      avatarUrl:
        member?.displayAvatarURL({ extension: 'png', size: 128 }) ?? '',
      timeoutMinutes: stat.timeoutMinutes,
      plays: stat.plays,
      shots: stat.shots,
      deaths: stat.deaths,
    } satisfies LeaderboardEntry;
  });
}

export function formatTimeout(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0min';

  const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const remainingAfterDays = totalMinutes % MINUTES_PER_DAY;
  const hours = Math.floor(remainingAfterDays / MINUTES_PER_HOUR);
  const minutes = remainingAfterDays % MINUTES_PER_HOUR;

  const duration = {
    ...(days > 0 && { days }),
    ...(hours > 0 && { hours }),
    ...(minutes > 0 && { minutes }),
  };

  /* We can safely ignore the missing lib typing error: DurationFormat is an
   * experimental API that is not part of TypeScript's DOM lib yet. */
  const formatter = new Intl.DurationFormat('fr-FR', { style: 'narrow' });

  return formatter.format(duration);
}

export const LEADERBOARD_COLUMNS: LeaderboardColumn[] = [
  {
    key: 'timeout',
    label: 'Exclu',
    sublabel: 'pendant',
    color: '#f87171',
    format: (entry) => formatTimeout(entry.timeoutMinutes),
  },
  {
    key: 'plays',
    label: 'Parties',
    sublabel: 'jouées',
    color: '#fbbf24',
    format: (entry) => String(entry.plays),
  },
  {
    key: 'shots',
    label: 'Balles',
    sublabel: 'tirées',
    color: '#34d399',
    format: (entry) => String(entry.shots),
  },
  {
    key: 'deaths',
    label: 'Balles',
    sublabel: 'reçues',
    color: '#60a5fa',
    format: (entry) => String(entry.deaths),
  },
];
