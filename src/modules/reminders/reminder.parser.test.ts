import { describe, expect, it } from 'vitest';
import {
  isDurationInBounds,
  parseDuration,
  parseReminderId,
} from './reminder.parser.js';
import { MAX_DURATION_MS, MIN_DURATION_MS } from './reminder.constants.js';

describe('parseDuration', () => {
  it('parses compact hour and minute notation', () => {
    expect(parseDuration('1h30')).toBe(5_400_000);
  });

  it('parses French duration units', () => {
    expect(parseDuration('3 jours et 2 heures')).toBe(266_400_000);
  });

  it.each(['', "n'importe quoi"])('returns null for %j', (input) => {
    expect(parseDuration(input)).toBeNull();
  });
});

describe('isDurationInBounds', () => {
  it('includes the minimum and maximum boundaries', () => {
    expect(isDurationInBounds(MIN_DURATION_MS)).toBe(true);
    expect(isDurationInBounds(MAX_DURATION_MS)).toBe(true);
  });

  it('rejects values outside the boundaries', () => {
    expect(isDurationInBounds(MIN_DURATION_MS - 1)).toBe(false);
    expect(isDurationInBounds(MAX_DURATION_MS + 1)).toBe(false);
  });
});

describe('parseReminderId', () => {
  it('parses a numeric id', () => {
    expect(parseReminderId('42')).toBe(42);
  });

  it.each(['abc', '-1'])('rejects %j', (input) => {
    expect(parseReminderId(input)).toBeNull();
  });
});
