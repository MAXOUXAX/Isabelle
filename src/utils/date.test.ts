import { describe, expect, it } from 'vitest';
import {
  addDays,
  DAY_IN_MS,
  endOfDay,
  HOUR_IN_MS,
  isValidDate,
  startOfDay,
  timeUntilNextUse,
} from './date.js';

describe('day boundaries', () => {
  it('sets the start to 08:00 on the same calendar day', () => {
    const result = startOfDay(new Date(2024, 4, 12, 17, 45));

    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(4);
    expect(result.getDate()).toBe(12);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('sets the end to 20:00 on the same calendar day', () => {
    const result = endOfDay(new Date(2024, 4, 12, 7, 15));

    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(4);
    expect(result.getDate()).toBe(12);
    expect(result.getHours()).toBe(20);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(addDays(new Date(2024, 0, 31), 1)).toEqual(new Date(2024, 1, 1));
  });
});

describe('isValidDate', () => {
  it.each([
    [29, 2, 2024, true],
    [29, 2, 2023, false],
    [31, 4, 2024, false],
    [0, 1, 2024, false],
    [1, 13, 2024, false],
    [1, 1, 1969, false],
  ])('validates %i/%i/%i as %s', (day, month, year, expected) => {
    expect(isValidDate(day, month, year)).toBe(expected);
  });
});

describe('timeUntilNextUse', () => {
  const lastUse = new Date(2024, 0, 1);

  it('adds an hour while below the daily usage limit', () => {
    expect(timeUntilNextUse(lastUse, 2, 3)).toEqual(
      new Date(lastUse.getTime() + HOUR_IN_MS),
    );
  });

  it('adds a day at or above the daily usage limit', () => {
    expect(timeUntilNextUse(lastUse, 3, 3)).toEqual(
      new Date(lastUse.getTime() + DAY_IN_MS),
    );
    expect(timeUntilNextUse(lastUse, 4, 3)).toEqual(
      new Date(lastUse.getTime() + DAY_IN_MS),
    );
  });
});
