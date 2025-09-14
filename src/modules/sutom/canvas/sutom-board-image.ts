import { LetterState, SutomGame } from '@/modules/sutom/core/sutom-game.js';
import { resolveResourcePath } from '@/utils/resources.js';
import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';
import { drawLetter, drawLetterTile, drawRoundedTile } from './canvas-utils.js';
import {
  DEFAULT_RENDER_OPTIONS,
  GAME_CONFIG,
  RenderConfig,
  TILE_COLORS,
} from './sutom-theme.js';

interface Dimensions {
  width: number;
  height: number;
}

interface GameState {
  attempts: number;
  isSolved: boolean;
  solvedPositions: boolean[];
  isInProgress: boolean;
}

// --- Utility Functions ---

/**
 * Creates a render configuration with defaults applied.
 */
function createRenderConfig(options: Partial<RenderConfig>): RenderConfig {
  return {
    tileSize: options.tileSize ?? DEFAULT_RENDER_OPTIONS.tileSize,
    tileSpacing: options.tileSpacing ?? DEFAULT_RENDER_OPTIONS.tileSpacing,
    margin: options.margin ?? DEFAULT_RENDER_OPTIONS.margin,
    roundedRadius:
      options.roundedRadius ?? DEFAULT_RENDER_OPTIONS.roundedRadius,
    background: options.background ?? DEFAULT_RENDER_OPTIONS.background,
  };
}

/**
 * Calculates canvas dimensions based on word length and configuration.
 */
function calculateCanvasDimensions(
  wordLength: number,
  config: RenderConfig,
): Dimensions {
  const width =
    config.margin * 2 +
    wordLength * config.tileSize +
    (wordLength - 1) * config.tileSpacing;
  const height =
    config.margin * 2 +
    GAME_CONFIG.MAX_ATTEMPTS * config.tileSize +
    (GAME_CONFIG.MAX_ATTEMPTS - 1) * config.tileSpacing;
  return { width, height };
}

/**
 * Sets up the canvas context with background and text styling.
 */
function setupCanvas(
  ctx: SKRSContext2D,
  dimensions: Dimensions,
  config: RenderConfig,
): void {
  ctx.fillStyle = config.background;
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${String(Math.round(config.tileSize * 0.55))}px Outfit`;
  ctx.fillStyle = '#FFFFFF';
}

/**
 * Analyzes the current game state to determine rendering requirements.
 */
function analyzeGameState(game: SutomGame): GameState {
  const attempts = game.wordHistory.length;
  const solvedPositions = Array.from({ length: game.word.length }, () => false);

  let isSolved = false;
  for (let i = 0; i < attempts; i++) {
    const guess = game.wordHistory[i];
    const evaluation = game.evaluateGuess(guess);

    for (let j = 0; j < evaluation.length; j++) {
      if (evaluation[j] === LetterState.CORRECT) {
        solvedPositions[j] = true;
      }
    }

    if (
      i === attempts - 1 &&
      evaluation.every((s) => s === LetterState.CORRECT)
    ) {
      isSolved = true;
    }
  }

  return {
    attempts,
    isSolved,
    solvedPositions,
    isInProgress: attempts < GAME_CONFIG.MAX_ATTEMPTS && !isSolved,
  };
}

/**
 * Renders all rows of the game board.
 */
function renderAllRows(
  ctx: SKRSContext2D,
  game: SutomGame,
  gameState: GameState,
  config: RenderConfig,
): void {
  let currentY = config.margin;

  // Render completed guesses
  for (let i = 0; i < gameState.attempts; i++) {
    const guess = game.wordHistory[i];
    const evaluation = game.evaluateGuess(guess);
    drawEvaluationRow(ctx, guess, evaluation, config.margin, currentY, config);
    currentY += config.tileSize + config.tileSpacing;
  }

  // Render next attempt row if game is in progress
  if (gameState.isInProgress) {
    drawNextAttemptRow(
      ctx,
      game.word,
      gameState.solvedPositions,
      config.margin,
      currentY,
      config,
    );
    currentY += config.tileSize + config.tileSpacing;
  }

  const remainingRows =
    GAME_CONFIG.MAX_ATTEMPTS -
    gameState.attempts -
    (gameState.isInProgress ? 1 : 0);
  for (let i = 0; i < remainingRows; i++) {
    drawEmptyRow(ctx, game.word.length, config.margin, currentY, config);
    currentY += config.tileSize + config.tileSpacing;
  }
}

/**
 * Renders a SUTOM (Wordle-like) board to a PNG image attachment.
 *
 * @param game - The current SUTOM game instance
 * @param options - Optional rendering configuration
 * @returns A Discord.js AttachmentBuilder containing the board image
 */
export function renderSutomBoardImage(
  game: SutomGame,
  options: Partial<RenderConfig> = {},
): AttachmentBuilder {
  const config = createRenderConfig(options);
  registerFontOnce();

  const dimensions = calculateCanvasDimensions(game.word.length, config);
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext('2d');

  setupCanvas(ctx, dimensions, config);

  const gameState = analyzeGameState(game);
  renderAllRows(ctx, game, gameState, config);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'sutom-board.png' });
}

// --- Row Rendering Functions ---

/**
 * Renders a completed guess row with letter evaluations.
 */
function drawEvaluationRow(
  ctx: SKRSContext2D,
  guess: string,
  evaluation: LetterState[],
  startX: number,
  y: number,
  config: RenderConfig,
): void {
  for (let i = 0; i < guess.length; i++) {
    const x = startX + i * (config.tileSize + config.tileSpacing);
    const letter = guess[i];
    const state = evaluation[i];

    switch (state) {
      case LetterState.CORRECT:
        drawLetterTile(
          ctx,
          x,
          y,
          config.tileSize,
          config.roundedRadius,
          TILE_COLORS.CORRECT,
          letter,
          'rounded',
        );
        break;
      case LetterState.MISPLACED:
        drawLetterTile(
          ctx,
          x,
          y,
          config.tileSize,
          config.roundedRadius,
          TILE_COLORS.MISPLACED,
          letter,
          'circle',
          '#1d1f22',
        );
        break;
      default:
        drawLetterTile(
          ctx,
          x,
          y,
          config.tileSize,
          config.roundedRadius,
          TILE_COLORS.INCORRECT,
          letter,
          'rounded',
        );
        break;
    }
  }
}

/**
 * Renders an empty row for future guesses.
 */
function drawEmptyRow(
  ctx: SKRSContext2D,
  wordLength: number,
  startX: number,
  y: number,
  config: RenderConfig,
): void {
  for (let i = 0; i < wordLength; i++) {
    const x = startX + i * (config.tileSize + config.tileSpacing);
    drawRoundedTile(
      ctx,
      x,
      y,
      config.tileSize,
      TILE_COLORS.EMPTY,
      config.roundedRadius,
      {
        outline: TILE_COLORS.EMPTY_OUTLINE,
      },
    );
  }
}

/**
 * Renders the next attempt row with hints and placeholders.
 */
function drawNextAttemptRow(
  ctx: SKRSContext2D,
  word: string,
  solvedPositions: boolean[],
  startX: number,
  y: number,
  config: RenderConfig,
): void {
  for (let i = 0; i < word.length; i++) {
    const x = startX + i * (config.tileSize + config.tileSpacing);
    const shouldReveal = i === 0 || solvedPositions[i];

    if (shouldReveal) {
      drawLetterTile(
        ctx,
        x,
        y,
        config.tileSize,
        config.roundedRadius,
        TILE_COLORS.CORRECT,
        word[i],
        'rounded',
      );
    } else {
      const { cx, cy } = drawRoundedTile(
        ctx,
        x,
        y,
        config.tileSize,
        TILE_COLORS.INCORRECT,
        config.roundedRadius,
      );
      const dotY = cy + config.tileSize * 0.22;
      drawLetter(ctx, '·', cx, dotY);
    }
  }
}

// --- Font Management ---

let fontRegistered = false;

/**
 * Registers the Outfit font for rendering. Only registers once to avoid redundant operations.
 */
function registerFontOnce(): void {
  if (fontRegistered) return;

  try {
    const fontPath = resolveResourcePath('sutom', 'Outfit-Bold.ttf');
    GlobalFonts.registerFromPath(fontPath, 'Outfit');
    fontRegistered = true;
  } catch (error) {
    console.error('[SUTOM] Failed to register Outfit font:', error);
  }
}
