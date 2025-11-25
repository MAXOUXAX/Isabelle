/**
 * Isabelle Design System
 *
 * Color palette based on official TELECOM Nancy brand guidelines.
 */

export const colors = {
  /** TELECOM Nancy Purple - primary brand color (PANTONE 519 C) */
  primary: 0x6c2466,

  /** TELECOM Nancy Orange - accent color (PANTONE 144 C) */
  accent: 0xef8a26,

  /** TELECOM Nancy Signature - dark neutral (PANTONE 446 C) */
  signature: 0x565859,

  /** TELECOM Nancy Warm - secondary warm tone (PANTONE 7615 C) */
  warm: 0x8e6f67,

  /** Green - success states, loaded modules */
  success: 0x2ecc71,

  /** Red - error states, failed modules */
  error: 0xe74c3c,
} as const;

export const emojis = {
  /** Status indicators */
  success: '✅',
  error: '❌',
  warning: '⚠️',

  /** Section headers */
  calendar: '📅',
  sparkles: '✨',
  puzzle: '🧩',
  contributors: '👥',
  stats: '📊',
  commands: '⌨️',

  /** Navigation */
  back: '◀️',
  forward: '▶️',
} as const;
