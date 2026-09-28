import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { sutomGameManager } from '@/modules/sutom/core/game-manager.js';

const guildId = 'idle-game-test-guild';
const userId = 'idle-game-test-user';

afterEach(() => {
  sutomGameManager.deleteGame(guildId, userId);
});

describe('SutomGameManager idle cleanup', () => {
  it('keeps expired games tracked until asynchronous cleanup finishes', () => {
    expect(
      sutomGameManager.createGame(guildId, userId, 'idle-game-thread'),
    ).toBe(true);

    const expired = sutomGameManager.sweepIdleGames(1, Date.now() + 2);

    expect(expired).toHaveLength(1);
    expect(sutomGameManager.getGame(guildId, userId)).toBeDefined();
    expect(expired[0]).toMatchObject({
      guildId,
      userId,
      threadId: 'idle-game-thread',
      expirationNoticeSent: false,
      expirationThreadArchived: false,
    });
  });

  it('remembers completed cleanup steps between retries', () => {
    sutomGameManager.createDailyGame(
      guildId,
      userId,
      'idle-daily-thread',
      'idle-parent-channel',
    );

    sutomGameManager.markExpirationStep(guildId, userId, 'noticeSent');
    sutomGameManager.markExpirationStep(guildId, userId, 'boardUpdated');

    const [expired] = sutomGameManager.sweepIdleGames(0, Date.now() + 1);

    expect(expired).toMatchObject({
      expirationNoticeSent: true,
      expirationBoardUpdated: true,
      expirationThreadArchived: false,
    });
  });
});
