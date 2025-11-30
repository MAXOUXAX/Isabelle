import { createLogger } from '@/utils/logger.js';
import { resolveResourcePath } from '@/utils/resources.js';
import { Resvg } from '@resvg/resvg-js';
import { AttachmentBuilder } from 'discord.js';
import { readFile } from 'fs/promises';
import satori, { type Font } from 'satori';

import { LeaderboardEntry } from './leaderboard-data.js';
import { LeaderboardView } from './leaderboard-view.js';

const logger = createLogger('leaderboard-satori');

let cachedFonts: Font[] | null = null;

async function loadFonts(): Promise<Font[]> {
  if (cachedFonts) return cachedFonts;

  const outfitBuffer = await readFile(
    resolveResourcePath('sutom', 'Outfit-Bold.ttf'),
  );

  cachedFonts = [
    { name: 'Outfit', data: outfitBuffer, weight: 700, style: 'normal' },
  ];

  return cachedFonts;
}

export async function renderLeaderboard(
  entries: LeaderboardEntry[],
): Promise<AttachmentBuilder> {
  const fonts = await loadFonts();
  const svg = await satori(<LeaderboardView entries={entries} />, {
    width: 1000,
    fonts,
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1000 } });
  const pngBuffer = resvg.render().asPng();

  logger.debug(
    { entriesCount: entries.length },
    'Leaderboard rendered successfully with Satori',
  );

  return new AttachmentBuilder(pngBuffer, {
    name: 'roulette-leaderboard.png',
  });
}

export function renderEmptyLeaderboard(): Promise<AttachmentBuilder> {
  return renderLeaderboard([]);
}
