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

/**
 * High-confidence wording that the prompt also forbids. Keep these as token
 * sequences instead of interpolated regular expressions: punctuation and
 * accents are normalized before matching, and the target name is unavailable
 * here, so broad semantic guesses would block too much ordinary roast text.
 */
const PROHIBITED_PHRASES: readonly { category: string; phrase: string }[] = [
  { category: 'family', phrase: 'ta mere' },
  { category: 'family', phrase: 'sa mere' },
  { category: 'family', phrase: 'ton pere' },
  { category: 'family', phrase: 'son pere' },
  { category: 'family', phrase: 'tes parents' },
  { category: 'family', phrase: 'ses parents' },
  { category: 'family', phrase: 'ta famille' },
  { category: 'family', phrase: 'sa famille' },
  { category: 'family', phrase: 'tes freres' },
  { category: 'family', phrase: 'ses freres' },
  { category: 'family', phrase: 'tes soeurs' },
  { category: 'family', phrase: 'ses soeurs' },
  { category: 'family', phrase: 'ton frere' },
  { category: 'family', phrase: 'ta soeur' },
  { category: 'family', phrase: 'tes proches' },
  { category: 'family', phrase: 'tes parents divorces' },
  { category: 'family', phrase: 'tes parents se sont separes' },
  { category: 'family', phrase: 'ton pere est mort' },
  { category: 'family', phrase: 'ta mere est morte' },
  { category: 'family', phrase: 'ta famille est pauvre' },
  { category: 'financial', phrase: 'tu es pauvre' },
  { category: 'financial', phrase: 't es pauvre' },
  { category: 'financial', phrase: 'il est pauvre' },
  { category: 'financial', phrase: 'elle est pauvre' },
  { category: 'financial', phrase: 'tu es fauche' },
  { category: 'financial', phrase: 't es fauche' },
  { category: 'financial', phrase: 'il est fauche' },
  { category: 'financial', phrase: 'elle est fauchee' },
  { category: 'financial', phrase: 'sans le sou' },
  { category: 'financial', phrase: 'sans argent' },
  { category: 'financial', phrase: 'tu n as pas d argent' },
  { category: 'financial', phrase: 'tu as des problemes d argent' },
  { category: 'financial', phrase: 'tes problemes financiers' },
  { category: 'financial', phrase: 'tu dois de l argent' },
  { category: 'financial', phrase: 'tes dettes' },
  { category: 'financial', phrase: 'tu croules sous les dettes' },
  { category: 'financial', phrase: 'tu vis dans la misere' },
  { category: 'financial', phrase: 'tu es ruine' },
  { category: 'financial', phrase: 'tu touches le rsa' },
  { category: 'financial', phrase: 'tu vis du rsa' },
  { category: 'financial', phrase: 'tu es au rsa' },
  { category: 'threat', phrase: 'je vais te tuer' },
  { category: 'threat', phrase: 'je vais le tuer' },
  { category: 'threat', phrase: 'je vais la tuer' },
  { category: 'threat', phrase: 'on va te tuer' },
  { category: 'threat', phrase: 'on va le tuer' },
  { category: 'threat', phrase: 'on va la tuer' },
  { category: 'threat', phrase: 'je vais te frapper' },
  { category: 'threat', phrase: 'on va te frapper' },
  { category: 'threat', phrase: 'je vais te tabasser' },
  { category: 'threat', phrase: 'on va te tabasser' },
  { category: 'threat', phrase: 'je vais te faire la peau' },
  { category: 'threat', phrase: 'je vais te faire payer' },
  { category: 'threat', phrase: 'on devrait le frapper' },
  { category: 'threat', phrase: 'on devrait la frapper' },
  { category: 'threat', phrase: 'il faut le frapper' },
  { category: 'threat', phrase: 'il faut la frapper' },
  { category: 'threat', phrase: 'tu merites qu on te frappe' },
  { category: 'threat', phrase: 'tu vas le regretter' },
  { category: 'threat', phrase: 'harcele le' },
  { category: 'threat', phrase: 'harcele la' },
  { category: 'threat', phrase: 'exclu le du groupe' },
  { category: 'threat', phrase: 'exclu la du groupe' },
  { category: 'threat', phrase: 'vire le du groupe' },
  { category: 'threat', phrase: 'vire la du groupe' },
];

export interface RoastGuardResult {
  allowed: boolean;
  /** The terms that triggered a block, for logging. Never shown to users. */
  matched: string[];
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll('œ', 'oe')
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '');

const tokenize = (value: string): string[] =>
  normalize(value).match(/[\p{L}\p{N}]+/gu) ?? [];

const containsPhrase = (tokens: readonly string[], phrase: string): boolean => {
  const phraseTokens = phrase.split(' ');

  return tokens.some((_, start) =>
    phraseTokens.every((token, offset) => tokens[start + offset] === token),
  );
};

export function checkRoast(text: string): RoastGuardResult {
  const tokens = tokenize(text);
  const tokenSet = new Set(tokens);

  const matched = PROHIBITED_TERMS.filter((term) => tokenSet.has(term));

  for (const { category, phrase } of PROHIBITED_PHRASES) {
    if (containsPhrase(tokens, phrase) && !matched.includes(category)) {
      matched.push(category);
    }
  }

  return { allowed: matched.length === 0, matched };
}
