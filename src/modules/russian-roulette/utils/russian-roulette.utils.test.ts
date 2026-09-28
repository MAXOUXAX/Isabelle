import { describe, expect, it } from 'vitest';

process.env.DISCORD_TOKEN = 'test-token';
process.env.DISCORD_CLIENT_ID = 'test-client-id';
process.env.SCHEDULE_URL = 'https://example.test/schedule.ics';
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';

const { calculateDynamicFireChance, mapNumber } =
  await import('./russian-roulette.utils.js');

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
  const chance = calculateDynamicFireChance(maximum, base);

  expect(chance).toBeGreaterThanOrEqual(base);
  expect(chance).toBeLessThanOrEqual(maximum);
});
