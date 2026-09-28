import type { Message } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger.js', () => ({
  createLogger: () => ({ debug: vi.fn(), warn: vi.fn() }),
}));

import {
  calculateFreshPercentage,
  MAX_FETCH_REQUESTS,
} from './message-picker.js';

const messageWithTimestamp = (createdTimestamp: number): Message =>
  ({ createdTimestamp }) as Message;

describe('calculateFreshPercentage', () => {
  it('returns zero for an empty collection', () => {
    expect(calculateFreshPercentage([])).toBe(0);
  });

  it('returns one when every message is fresh', () => {
    expect(
      calculateFreshPercentage([
        messageWithTimestamp(Date.now() - 24 * 60 * 60 * 1000),
        messageWithTimestamp(Date.now() - 7 * 24 * 60 * 60 * 1000),
      ]),
    ).toBe(1);
  });

  it('returns one half when half of the messages are fresh', () => {
    expect(
      calculateFreshPercentage([
        messageWithTimestamp(Date.now() - 24 * 60 * 60 * 1000),
        messageWithTimestamp(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000),
      ]),
    ).toBe(0.5);
  });
});

describe('MAX_FETCH_REQUESTS', () => {
  it('is a positive integer capped at 200', () => {
    expect(Number.isInteger(MAX_FETCH_REQUESTS)).toBe(true);
    expect(MAX_FETCH_REQUESTS).toBeGreaterThan(0);
    expect(MAX_FETCH_REQUESTS).toBeLessThanOrEqual(200);
  });
});
