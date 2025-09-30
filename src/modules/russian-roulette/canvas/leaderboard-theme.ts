export const LEADERBOARD_COLORS = {
  BACKGROUND: '#1a1a1a',
  CARD_BACKGROUND: '#2c2c2c',
  GOLD: '#FFD700',
  SILVER: '#C0C0C0',
  BRONZE: '#CD7F32',
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#CCCCCC',
  ACCENT: '#FF4444',
} as const;

/**
 * Configuration options for rendering the leaderboard.
 */
export interface LeaderboardConfig {
  /** Width of the leaderboard image */
  width: number;
  /** Height of the leaderboard image */
  height: number;
  /** Margin around the leaderboard */
  margin: number;
  /** Background color */
  background: string;
  /** Font family */
  fontFamily: string;
}

/**
 * Default styling options for the leaderboard renderer.
 */
export const DEFAULT_LEADERBOARD_CONFIG: LeaderboardConfig = {
  width: 800,
  height: 600,
  margin: 40,
  background: LEADERBOARD_COLORS.BACKGROUND,
  fontFamily: 'Outfit',
} as const;

/**
 * Podium configuration for different ranks
 */
export const PODIUM_CONFIG = {
  GOLD: {
    color: LEADERBOARD_COLORS.GOLD,
    size: 120,
    position: 1,
  },
  SILVER: {
    color: LEADERBOARD_COLORS.SILVER,
    size: 100,
    position: 2,
  },
  BRONZE: {
    color: LEADERBOARD_COLORS.BRONZE,
    size: 80,
    position: 3,
  },
  DEFAULT: {
    color: LEADERBOARD_COLORS.TEXT_SECONDARY,
    size: 60,
    position: 4,
  },
} as const;
