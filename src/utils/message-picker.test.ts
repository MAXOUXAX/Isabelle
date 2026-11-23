import type { Message } from 'discord.js';
import { ChannelType, type Guild, type TextChannel } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger.js', () => ({
  createLogger: () => ({ debug: vi.fn(), warn: vi.fn() }),
}));

import {
  calculateFreshPercentage,
  fetchLastUserMessages,
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

const createGuild = (pages: Message[][]): { guild: Guild; calls: number } => {
  let calls = 0;
  const channel = {
    id: 'channel-1',
    type: ChannelType.GuildText,
    viewable: true,
    permissionsFor: () => ({ has: () => true }),
    messages: {
      fetch: () => {
        const page = pages[calls] ?? [];
        calls += 1;
        return Promise.resolve(
          new Map(page.map((message) => [message.id, message])),
        );
      },
    },
  } as unknown as TextChannel;
  const guild = {
    id: 'guild-1',
    client: { user: { id: 'bot-1' } },
    members: { me: null },
    channels: {
      cache: {
        filter: (predicate: (value: TextChannel) => boolean) => {
          const channels = new Map([[channel.id, channel]]);
          return new Map(
            Array.from(channels).filter(([, value]) => predicate(value)),
          );
        },
      },
    },
  } as unknown as Guild;

  return {
    guild,
    get calls() {
      return calls;
    },
  };
};

const userMessage = (id: string, createdTimestamp: number): Message =>
  ({ id, author: { id: 'user-1' }, createdTimestamp }) as Message;

const fullPage = (...userMessages: Message[]): Message[] => [
  ...userMessages,
  ...Array.from(
    { length: 100 - userMessages.length },
    (_, index) =>
      ({
        id: `other-${String(index)}-${userMessages.map((message) => message.id).join('-')}`,
        author: { id: 'other-user' },
        createdTimestamp: Date.now(),
      }) as Message,
  ),
];

describe('fetchLastUserMessages', () => {
  it('fetches one batch when the requested minimum is zero', async () => {
    const fixture = createGuild([[]]);

    await expect(
      fetchLastUserMessages(fixture.guild, 'user-1'),
    ).resolves.toEqual([]);
    expect(fixture.calls).toBe(1);
  });

  it('continues after a stale first batch until the freshness threshold is met', async () => {
    const fixture = createGuild([
      fullPage(userMessage('1', Date.now() - 120 * 24 * 60 * 60 * 1000)),
      fullPage(userMessage('2', Date.now())),
      fullPage(userMessage('3', Date.now())),
      fullPage(userMessage('4', Date.now())),
      fullPage(userMessage('5', Date.now())),
    ]);

    const messages = await fetchLastUserMessages(fixture.guild, 'user-1');

    expect(messages).toHaveLength(5);
    expect(calculateFreshPercentage(messages)).toBe(0.8);
    expect(fixture.calls).toBe(5);
  });

  it.each([1, 0])(
    'continues to the next page when a batch has no target-user messages (minMessages=%i)',
    async (minMessages) => {
      const fixture = createGuild([
        fullPage(),
        [userMessage('target-on-page-two', Date.now())],
      ]);

      const messages = await fetchLastUserMessages(
        fixture.guild,
        'user-1',
        minMessages,
      );

      expect(messages.map((message) => message.id)).toContain(
        'target-on-page-two',
      );
      expect(fixture.calls).toBe(2);
    },
  );
});
