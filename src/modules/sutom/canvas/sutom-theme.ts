export const TILE_COLORS = {
  CORRECT: '#D42D34',
  MISPLACED: '#F5BF42',
  INCORRECT: '#3374C0',
  EMPTY: '#1f2329',
  EMPTY_OUTLINE: '#2e353f',
} as const;

/**
 * Game configuration constants.
 */
export const GAME_CONFIG = {
  MAX_ATTEMPTS: 6,
} as const;

/**
 * Default styling options for the SUTOM board renderer.
 */
export const DEFAULT_RENDER_OPTIONS: RenderConfig = {
  /** Default tile size in pixels */
  tileSize: 96,
  /** Default spacing between tiles in pixels */
  tileSpacing: 20,
  /** Default margin around the board in pixels */
  margin: 32,
  /** Default corner radius for rounded tiles in pixels */
  roundedRadius: 22,
  /** Default background color */
  background: '#0f1115',
} as const;

/**
 * Configuration options for rendering the SUTOM board.
 */
export interface RenderConfig {
  /** Size of each tile in pixels (default: 96) */
  tileSize: number;
  /** Gap between tiles in pixels (default: 20) */
  tileSpacing: number;
  /** Outer margin around the board in pixels (default: 32) */
  margin: number;
  /** Corner radius for rounded tiles in pixels (default: 22) */
  roundedRadius: number;
  /** Background color of the canvas (default: '#0f1115') */
  background: string;
}
