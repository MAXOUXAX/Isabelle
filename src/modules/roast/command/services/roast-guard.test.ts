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
});
