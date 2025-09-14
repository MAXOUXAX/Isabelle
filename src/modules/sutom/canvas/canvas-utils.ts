import { type SKRSContext2D } from '@napi-rs/canvas';

export interface TileCenter {
  cx: number;
  cy: number;
}

export interface TileOutlineOptions {
  outline?: string;
}

/**
 * Draws a letter at the specified coordinates.
 *
 * @param ctx - Canvas rendering context
 * @param letter - Letter to draw (will be uppercased)
 * @param cx - Center X coordinate
 * @param cy - Center Y coordinate
 * @param color - Text color (default: white)
 */
export function drawLetter(
  ctx: SKRSContext2D,
  letter: string,
  cx: number,
  cy: number,
  color = '#FFFFFF',
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillText(letter.toUpperCase(), cx, cy);
  ctx.restore();
}

/**
 * Draws a rounded rectangle tile and returns its center coordinates.
 *
 * @param ctx - Canvas rendering context
 * @param x - X position of the tile
 * @param y - Y position of the tile
 * @param size - Size of the tile
 * @param fill - Fill color
 * @param radius - Corner radius
 * @param extras - Optional outline configuration
 * @returns Center coordinates of the drawn tile
 */
export function drawRoundedTile(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  size: number,
  fill: string,
  radius: number,
  extras?: TileOutlineOptions,
): TileCenter {
  ctx.save();
  ctx.beginPath();

  const r = Math.min(radius, size / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + size - r, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + r);
  ctx.lineTo(x + size, y + size - r);
  ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
  ctx.lineTo(x + r, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();

  if (extras?.outline) {
    ctx.strokeStyle = extras.outline;
    ctx.lineWidth = Math.max(2, size * 0.04);
    ctx.stroke();
  }

  ctx.restore();
  return { cx: x + size / 2, cy: y + size / 2 };
}

/**
 * Draws a circular tile and returns its center coordinates.
 *
 * @param ctx - Canvas rendering context
 * @param x - X position of the tile
 * @param y - Y position of the tile
 * @param size - Size of the tile
 * @param fill - Fill color
 * @returns Center coordinates of the drawn tile
 */
export function drawCircleTile(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  size: number,
  fill: string,
): TileCenter {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  return { cx: x + size / 2, cy: y + size / 2 };
}

/**
 * Draws a tile with a letter, handling different tile shapes.
 *
 * @param ctx - Canvas rendering context
 * @param x - X position of the tile
 * @param y - Y position of the tile
 * @param size - Size of the tile
 * @param radius - Corner radius for rounded tiles
 * @param color - Tile fill color
 * @param letter - Letter to draw on the tile
 * @param shape - Shape of the tile ('rounded' or 'circle')
 * @param textColor - Color of the letter text
 */
export function drawLetterTile(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
  color: string,
  letter: string,
  shape: 'rounded' | 'circle',
  textColor = '#FFFFFF',
): void {
  const { cx, cy } =
    shape === 'circle'
      ? drawCircleTile(ctx, x, y, size, color)
      : drawRoundedTile(ctx, x, y, size, color, radius);

  drawLetter(ctx, letter, cx, cy, textColor);
}
