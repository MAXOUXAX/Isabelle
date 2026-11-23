import { describe, expect, it } from 'vitest';
import { splitMessageIntoChunks } from './message-splitter.js';

describe('splitMessageIntoChunks', () => {
  it('returns no chunks for empty content', () => {
    expect(splitMessageIntoChunks('')).toEqual([]);
  });

  it('preserves content that fits in one chunk', () => {
    expect(splitMessageIntoChunks('A short message', 20)).toEqual([
      'A short message',
    ]);
  });

  it('prefers a paragraph boundary', () => {
    expect(
      splitMessageIntoChunks('First paragraph\n\nSecond paragraph', 20),
    ).toEqual(['First paragraph', 'Second paragraph']);
  });

  it('hard-cuts a word longer than the limit', () => {
    expect(splitMessageIntoChunks('abcdefghijklmnop', 10)).toEqual([
      'abcdefghij',
      'klmnop',
    ]);
  });

  it('keeps every chunk within the requested limit for long content', () => {
    const content = Array.from(
      { length: 100 },
      (_, index) => `word${String(index)}`,
    ).join(' ');
    const chunks = splitMessageIntoChunks(content, 32);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 32)).toBe(true);
  });
});
