import { LeaderboardEntry } from '@/modules/russian-roulette/data/russian-roulette.repository.js';
import { resolveResourcePath } from '@/utils/resources.js';
import {
  createCanvas,
  GlobalFonts,
  loadImage,
  type SKRSContext2D,
} from '@napi-rs/canvas';
import { AttachmentBuilder, Guild } from 'discord.js';
import {
  DEFAULT_LEADERBOARD_CONFIG,
  LEADERBOARD_COLORS,
  LeaderboardConfig,
  PODIUM_CONFIG,
} from './leaderboard-theme.js';

interface LeaderboardPlayerData {
  entry: LeaderboardEntry;
  username: string;
  avatarUrl: string;
  rank: number;
}

let fontRegistered = false;

/**
 * Registers the Outfit font for use in canvas rendering.
 */
function registerFontOnce(): void {
  if (fontRegistered) return;

  try {
    const fontPath = resolveResourcePath('sutom', 'Outfit-Bold.ttf');
    GlobalFonts.registerFromPath(fontPath, 'Outfit');
    fontRegistered = true;
  } catch (error) {
    console.warn('Could not load Outfit font, falling back to default:', error);
    // Font will fallback to system default
  }
}

/**
 * Creates a leaderboard configuration with defaults applied.
 */
function createLeaderboardConfig(
  options: Partial<LeaderboardConfig> = {},
): LeaderboardConfig {
  return {
    width: options.width ?? DEFAULT_LEADERBOARD_CONFIG.width,
    height: options.height ?? DEFAULT_LEADERBOARD_CONFIG.height,
    margin: options.margin ?? DEFAULT_LEADERBOARD_CONFIG.margin,
    background: options.background ?? DEFAULT_LEADERBOARD_CONFIG.background,
    fontFamily: options.fontFamily ?? DEFAULT_LEADERBOARD_CONFIG.fontFamily,
  };
}

/**
 * Sets up the canvas context with background and text styling.
 */
function setupCanvas(ctx: SKRSContext2D, config: LeaderboardConfig): void {
  // Fill background
  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, config.width, config.height);

  // Set default text properties
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = LEADERBOARD_COLORS.TEXT_PRIMARY;
}

/**
 * Draws the leaderboard title
 */
function drawTitle(ctx: SKRSContext2D, config: LeaderboardConfig): void {
  ctx.save();
  ctx.font = `bold 48px ${config.fontFamily}`;
  ctx.fillStyle = LEADERBOARD_COLORS.ACCENT;
  ctx.fillText(
    '🎯 Roulette Russe - Classement',
    config.width / 2,
    config.margin + 30,
  );
  ctx.restore();
}

/**
 * Gets the appropriate podium configuration for a rank
 */
function getPodiumConfig(rank: number) {
  switch (rank) {
    case 1:
      return PODIUM_CONFIG.GOLD;
    case 2:
      return PODIUM_CONFIG.SILVER;
    case 3:
      return PODIUM_CONFIG.BRONZE;
    default:
      return PODIUM_CONFIG.DEFAULT;
  }
}

/**
 * Draws a circular avatar image
 */
async function drawAvatar(
  ctx: SKRSContext2D,
  avatarUrl: string,
  x: number,
  y: number,
  size: number,
): Promise<void> {
  try {
    const image = await loadImage(avatarUrl);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
  } catch (error) {
    console.warn('Failed to load avatar, drawing placeholder:', error);

    // Draw placeholder circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = LEADERBOARD_COLORS.CARD_BACKGROUND;
    ctx.fill();
    ctx.strokeStyle = LEADERBOARD_COLORS.TEXT_SECONDARY;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw "?" placeholder
    ctx.fillStyle = LEADERBOARD_COLORS.TEXT_SECONDARY;
    ctx.font = `bold ${String(Math.round(size * 0.4))}px ${DEFAULT_LEADERBOARD_CONFIG.fontFamily}`;
    ctx.fillText('?', x + size / 2, y + size / 2);
    ctx.restore();
  }
}

/**
 * Draws a single leaderboard entry
 */
async function drawLeaderboardEntry(
  ctx: SKRSContext2D,
  player: LeaderboardPlayerData,
  x: number,
  y: number,
  config: LeaderboardConfig,
): Promise<void> {
  const podiumConfig = getPodiumConfig(player.rank);
  const isTopThree = player.rank <= 3;

  // Card background
  const cardHeight = isTopThree ? 180 : 120;
  const cardWidth = isTopThree ? 220 : 180;

  ctx.save();
  ctx.fillStyle = LEADERBOARD_COLORS.CARD_BACKGROUND;
  ctx.fillRect(x - cardWidth / 2, y, cardWidth, cardHeight);

  // Rank badge
  ctx.fillStyle = podiumConfig.color;
  ctx.fillRect(x - cardWidth / 2, y, cardWidth, 40);

  // Rank text
  ctx.fillStyle = LEADERBOARD_COLORS.BACKGROUND;
  ctx.font = `bold 24px ${config.fontFamily}`;
  ctx.fillText(`#${String(player.rank)}`, x, y + 20);

  // Avatar
  const avatarSize = podiumConfig.size;
  const avatarY = y + 50;
  await drawAvatar(
    ctx,
    player.avatarUrl,
    x - avatarSize / 2,
    avatarY,
    avatarSize,
  );

  // Username
  ctx.fillStyle = LEADERBOARD_COLORS.TEXT_PRIMARY;
  const fontSize = isTopThree ? 20 : 16;
  ctx.font = `bold ${String(fontSize)}px ${config.fontFamily}`;
  const maxUsernameLength = isTopThree ? 12 : 10;
  const displayName =
    player.username.length > maxUsernameLength
      ? player.username.substring(0, maxUsernameLength - 3) + '...'
      : player.username;
  ctx.fillText(displayName, x, avatarY + avatarSize + 20);

  // Stats
  ctx.fillStyle = LEADERBOARD_COLORS.TEXT_SECONDARY;
  const statsFontSize = isTopThree ? 16 : 14;
  ctx.font = `${String(statsFontSize)}px ${config.fontFamily}`;
  ctx.fillText(
    `💀 ${String(player.entry.deaths)}`,
    x,
    avatarY + avatarSize + 45,
  );
  ctx.fillText(
    `🔫 ${String(player.entry.shotsFired)}`,
    x,
    avatarY + avatarSize + 65,
  );

  ctx.restore();
}

/**
 * Renders the Russian Roulette leaderboard to a PNG image attachment.
 */
export async function renderRussianRouletteLeaderboard(
  leaderboardData: LeaderboardEntry[],
  guild: Guild,
  options: Partial<LeaderboardConfig> = {},
): Promise<AttachmentBuilder> {
  const config = createLeaderboardConfig(options);
  registerFontOnce();

  // Create canvas
  const canvas = createCanvas(config.width, config.height);
  const ctx = canvas.getContext('2d');

  setupCanvas(ctx, config);
  drawTitle(ctx, config);

  // Prepare player data
  const playerData: LeaderboardPlayerData[] = [];
  for (let i = 0; i < Math.min(leaderboardData.length, 10); i++) {
    const entry = leaderboardData[i];
    try {
      const member = await guild.members.fetch(entry.userId).catch(() => null);
      if (member) {
        playerData.push({
          entry,
          username: member.displayName || member.user.username,
          avatarUrl: member.user.displayAvatarURL({
            size: 128,
            extension: 'png',
          }),
          rank: i + 1,
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch member ${entry.userId}:`, error);
    }
  }

  // Calculate layout
  const topThreeY = 120;
  const restStartY = 320;

  // Draw top 3 (podium style)
  if (playerData.length >= 1) {
    await drawLeaderboardEntry(
      ctx,
      playerData[0],
      config.width / 2,
      topThreeY,
      config,
    );
  }
  if (playerData.length >= 2) {
    await drawLeaderboardEntry(
      ctx,
      playerData[1],
      config.width / 2 - 150,
      topThreeY + 30,
      config,
    );
  }
  if (playerData.length >= 3) {
    await drawLeaderboardEntry(
      ctx,
      playerData[2],
      config.width / 2 + 150,
      topThreeY + 60,
      config,
    );
  }

  // Draw rest in rows
  const itemsPerRow = 4;
  const itemWidth = 160;
  let currentRow = 0;

  for (let i = 3; i < playerData.length; i++) {
    const col = (i - 3) % itemsPerRow;
    const row = Math.floor((i - 3) / itemsPerRow);

    if (row !== currentRow) {
      currentRow = row;
    }

    const x = config.margin + (col + 0.5) * itemWidth;
    const y = restStartY + row * 140;

    await drawLeaderboardEntry(ctx, playerData[i], x, y, config);
  }

  // Generate image
  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, {
    name: 'russian-roulette-leaderboard.png',
  });
}
