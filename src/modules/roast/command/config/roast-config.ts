const parsedMaxRoasts = Number.parseInt(
  (process.env.MAX_ROASTS_PER_USER_PER_DAY ?? '2').trim(),
  10,
);

export const MAX_ROASTS_PER_USER_PER_DAY = Number.isNaN(parsedMaxRoasts)
  ? 2
  : parsedMaxRoasts;

export const isProd = process.env.NODE_ENV !== 'development';

export const ROAST_FALLBACK_MESSAGE =
  'Je suis perdue dans mes notes... Impossible de générer ce roast maintenant. Réessaie plus tard !';
