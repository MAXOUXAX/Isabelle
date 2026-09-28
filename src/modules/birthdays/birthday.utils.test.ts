import { describe, expect, it } from 'vitest';
import {
  daysUntilBirthday,
  formatDayMonth,
  isLeapYear,
  isSameLocalDay,
  isValidMonthDay,
  nextBirthdayDate,
} from './birthday.utils.js';

describe('isLeapYear', () => {
  it.each([
    [2024, true],
    [2023, false],
    [1900, false],
    [2000, true],
  ])('returns %s for year %i', (year, expected) => {
    expect(isLeapYear(year)).toBe(expected);
  });
});

describe('isValidMonthDay', () => {
  it.each([
    [2, 29, true],
    [2, 30, false],
    [4, 31, false],
    [12, 31, true],
    [0, 1, false],
    [13, 1, false],
  ])('validates month %i, day %i as %s', (month, day, expected) => {
    expect(isValidMonthDay(month, day)).toBe(expected);
  });
});

it('formats day and month with zero padding', () => {
  expect(formatDayMonth(5, 3)).toBe('05/03');
});

describe('birthday countdown dates', () => {
  it('returns zero when the birthday is today', () => {
    expect(daysUntilBirthday(5, 12, new Date(2024, 4, 12, 18))).toBe(0);
  });

  it('wraps to the next year after the birthday has passed', () => {
    expect(daysUntilBirthday(1, 2, new Date(2024, 0, 3))).toBe(
      Math.round(
        (new Date(2025, 0, 2).getTime() - new Date(2024, 0, 3).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );
  });

  it('observes a leap-day birthday on 28 February in non-leap years', () => {
    const next = nextBirthdayDate(2, 29, new Date(2027, 0, 15));

    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });
});

describe('isSameLocalDay', () => {
  it('returns false when the date is null', () => {
    expect(isSameLocalDay(null, new Date(2024, 0, 1))).toBe(false);
  });

  it('matches different times on the same local calendar day', () => {
    expect(
      isSameLocalDay(new Date(2024, 0, 1, 23, 59), new Date(2024, 0, 1, 0, 1)),
    ).toBe(true);
  });
});
