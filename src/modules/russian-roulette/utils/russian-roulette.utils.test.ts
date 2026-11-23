import { describe, expect, it } from 'vitest';

process.env.DISCORD_TOKEN = 'test-token';
process.env.DISCORD_CLIENT_ID = 'test-client-id';
process.env.SCHEDULE_URL = 'https://example.test/schedule.ics';
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';

const {
  calculateDynamicFireChance,
  getNumberOfGamesSinceLastKill,
  increaseGamesSinceLastKill,
  mapNumber,
  resetNumberOfGamesSinceLastKill,
} = await import('./russian-roulette.utils.js');

describe('mapNumber', () => {
  it('maps the middle of one range to the middle of another', () => {
    expect(
      mapNumber({ value: 5, inMin: 0, inMax: 10, outMin: 10, outMax: 20 }),
    ).toBe(15);
  });

  it('maps both range endpoints exactly', () => {
    const options = { inMin: 0, inMax: 10, outMin: 10, outMax: 20 };

    expect(mapNumber({ value: 0, ...options })).toBe(10);
    expect(mapNumber({ value: 10, ...options })).toBe(20);
  });
});

it('keeps the baseline fire chance between its base and maximum', () => {
  const base = 0.1;
  const maximum = 0.7;
  const chance = calculateDynamicFireChance(maximum, base, 0);

  expect(chance).toBeGreaterThanOrEqual(base);
  expect(chance).toBeLessThanOrEqual(maximum);
});

describe('Russian Roulette pity counter', () => {
  it('returns zero for an unseen guild', () => {
    expect(getNumberOfGamesSinceLastKill('guild-unknown')).toBe(0);
  });

  it('increments the counter for a guild', () => {
    increaseGamesSinceLastKill('guild-a');
    increaseGamesSinceLastKill('guild-a');
    increaseGamesSinceLastKill('guild-a');

    expect(getNumberOfGamesSinceLastKill('guild-a')).toBe(3);
  });

  it('keeps counters isolated between guilds', () => {
    for (let i = 0; i < 5; i++) increaseGamesSinceLastKill('guild-isolation-a');

    expect(getNumberOfGamesSinceLastKill('guild-isolation-a')).toBe(5);
    expect(getNumberOfGamesSinceLastKill('guild-isolation-b')).toBe(0);
  });

  it('resets only the selected guild counter', () => {
    increaseGamesSinceLastKill('guild-a');
    increaseGamesSinceLastKill('guild-b');
    increaseGamesSinceLastKill('guild-b');

    resetNumberOfGamesSinceLastKill('guild-a');

    expect(getNumberOfGamesSinceLastKill('guild-a')).toBe(0);
    expect(getNumberOfGamesSinceLastKill('guild-b')).toBe(2);
  });
});

describe('calculateDynamicFireChance', () => {
  it('returns the base chance when the count is zero', () => {
    expect(calculateDynamicFireChance(0.7, 0.1, 0)).toBe(0.1);
  });

  it('caps the chance at the maximum for a large count', () => {
    expect(calculateDynamicFireChance(0.7, 0.1, 1_000_000)).toBe(0.7);
  });
});
