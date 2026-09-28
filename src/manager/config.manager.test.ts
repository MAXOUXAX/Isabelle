import { beforeEach, describe, expect, it, vi } from 'vitest';

interface SavePayload {
  config: Record<string, string | number | undefined>;
}

const { onConflictDoUpdate, values } = vi.hoisted(() => ({
  onConflictDoUpdate: vi.fn(),
  values: vi.fn<(payload: SavePayload) => void>(),
}));

vi.mock('@/db/index.js', () => ({
  db: {
    insert: () => ({
      values: (payload: SavePayload) => {
        values(payload);
        return { onConflictDoUpdate };
      },
    }),
  },
}));

vi.mock('@/utils/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

import { configManager } from './config.manager.js';

describe('ConfigManager', () => {
  beforeEach(() => {
    onConflictDoUpdate.mockReset();
    values.mockReset();
  });

  it('preserves fields when partial saves for one guild overlap', async () => {
    let releaseFirstSave!: () => void;
    const firstSaveBlocked = new Promise<void>((resolve) => {
      releaseFirstSave = resolve;
    });
    const savedConfigs: unknown[] = [];

    values.mockImplementation((payload) => savedConfigs.push(payload.config));
    onConflictDoUpdate.mockImplementation(async () => {
      if (savedConfigs.length === 1) {
        await firstSaveBlocked;
      }
    });

    const guildId = `config-manager-test-${String(Date.now())}`;
    const firstSave = configManager.saveGuild(guildId, {
      HOT_POTATO_ROLE_ID: 'role-id',
    });
    const secondSave = configManager.saveGuild(guildId, {
      HOT_POTATO_TIMEOUT_DURATION: 60,
    });

    await vi.waitFor(() => {
      expect(savedConfigs).toEqual([{ HOT_POTATO_ROLE_ID: 'role-id' }]);
    });

    releaseFirstSave();
    await Promise.all([firstSave, secondSave]);

    expect(savedConfigs).toEqual([
      { HOT_POTATO_ROLE_ID: 'role-id' },
      { HOT_POTATO_ROLE_ID: 'role-id', HOT_POTATO_TIMEOUT_DURATION: 60 },
    ]);
    expect(configManager.getGuild(guildId)).toEqual({
      HOT_POTATO_ROLE_ID: 'role-id',
      HOT_POTATO_TIMEOUT_DURATION: 60,
    });
  });
});
