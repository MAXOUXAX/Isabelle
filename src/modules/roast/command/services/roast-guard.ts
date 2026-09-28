/**
 * Deterministic post-generation check on roast output.
 *
 * The prompt forbids a set of subjects (see `roast-prompt.ts`), but a prompt is
 * guidance, not a guarantee. This guard refuses to publish text that contains
 * a prohibited term. False positives cost one roast; false negatives can harm
 * a student.
 */

/** Terms whose presence blocks publication, matched case- and accent-insensitively. */
const PROHIBITED_TERMS: readonly string[] = [
  'bougnoule',
  'youpin',
  'negro',
  'nigger',
  'pede',
  'tapette',
  'gouine',
  'mongol',
  'retarde',
  'autiste',
  'schizo',
  'bipolaire',
  'obese',
  'baleine',
  'laideron',
  'boudin',
];

export interface RoastGuardResult {
  allowed: boolean;
  /** The terms that triggered a block, for logging. Never shown to users. */
  matched: string[];
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '');

export function checkRoast(text: string): RoastGuardResult {
  const normalized = normalize(text);

  const matched = PROHIBITED_TERMS.filter((term) =>
    new RegExp(`(?:^|\\W)${term}(?:\\W|$)`, 'u').test(normalized),
  );

  return { allowed: matched.length === 0, matched };
}
