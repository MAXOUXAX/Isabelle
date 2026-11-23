import { describe, expect, it } from 'vitest';
import { checkRoast } from './roast-guard.js';

describe('checkRoast', () => {
  it('allows harsh language that is part of the roast persona', () => {
    expect(
      checkRoast('Quel connard, cette grosse merde de procrastinateur !'),
    ).toEqual({ allowed: true, matched: [] });
  });

  it('allows empty text', () => {
    expect(checkRoast('')).toEqual({ allowed: true, matched: [] });
  });

  it('blocks prohibited terms', () => {
    expect(checkRoast('Quelle baleine insupportable.')).toEqual({
      allowed: false,
      matched: ['baleine'],
    });
  });

  it('matches terms regardless of accents and case', () => {
    expect(checkRoast('Il traite quelqu’un de retardé.')).toEqual({
      allowed: false,
      matched: ['retarde'],
    });
    expect(checkRoast('C’est un AUTISTE.')).toEqual({
      allowed: false,
      matched: ['autiste'],
    });
  });

  it('does not match a prohibited term inside a longer word', () => {
    expect(checkRoast('Le pédestal est particulièrement bancal.')).toEqual({
      allowed: true,
      matched: [],
    });
  });

  it.each([
    'Ta mère a élevé un champion de la procrastination.',
    'Tes parents sont divorcés et tu as hérité de leur sens de l’organisation.',
    'T’es pauvre comme une blague recyclée.',
    'Tu n’as pas d’argent pour t’acheter une montre, visiblement.',
    'Tu touches le RSA et tu n’arrives toujours pas à gérer ton agenda.',
    'Je vais te tuer si tu rends encore ton devoir en retard.',
    'Tu mérites qu’on te frappe pour ce tableau illisible.',
    'Exclu-la du groupe pour ses pavés interminables.',
    'Harcèle-la jusqu’à ce qu’elle réponde.',
  ])(
    'blocks prohibited family, financial, or threatening wording: %s',
    (text) => {
      expect(checkRoast(text).allowed).toBe(false);
    },
  );

  it('blocks the œ ligature in prohibited family wording', () => {
    expect(checkRoast('Ta sœur est toujours en retard.')).toEqual({
      allowed: false,
      matched: ['family'],
    });
  });

  it.each([
    'Cette pauvre syntaxe mérite une meilleure indentation.',
    'Son budget de mots est aussi serré que son emploi du temps.',
    'Je vais te battre aux échecs avec les yeux fermés.',
    'Le manuel conseille de ne pas harceler ses camarades.',
  ])('allows unrelated wording outside the prohibited patterns: %s', (text) => {
    expect(checkRoast(text)).toEqual({ allowed: true, matched: [] });
  });
});
