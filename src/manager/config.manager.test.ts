import { beforeEach, describe, expect, it, vi } from 'vitest';

interface SavePayload {
  config: Record<string, string | number | undefined>;
}

interface ConflictUpdatePayload {
  target: unknown;
  set: SavePayload;
}

const { limit, onConflictDoUpdate, values } = vi.hoisted(() => ({
  limit: vi.fn(),
  onConflictDoUpdate:
    vi.fn<(payload: ConflictUpdatePayload) => Promise<void>>(),
  values: vi.fn<(payload: SavePayload) => void>(),
}));

vi.mock('@/db/index.js', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit }),
      }),
    }),
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
    limit.mockReset();
    onConflictDoUpdate.mockResolvedValue();
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
    expect(onConflictDoUpdate.mock.calls.at(-1)?.[0].set.config).toEqual({
      HOT_POTATO_ROLE_ID: 'role-id',
      HOT_POTATO_TIMEOUT_DURATION: 60,
    });
  });

  it('does not replace a saved config with an older pending database read', async () => {
    let releaseRead!: (rows: { config: Record<string, string> }[]) => void;
    limit.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseRead = resolve;
        }),
    );

    const guildId = `config-manager-load-race-${String(Date.now())}`;
    const pendingLoad = configManager.loadGuild(guildId);

    await vi.waitFor(() => {
      expect(releaseRead).toBeTypeOf('function');
    });
    await configManager.saveGuild(guildId, { AGENDA_FORUM_CHANNEL_ID: 'new' });
    releaseRead([{ config: { AGENDA_FORUM_CHANNEL_ID: 'old' } }]);

    await expect(pendingLoad).resolves.toEqual({
      AGENDA_FORUM_CHANNEL_ID: 'new',
    });
    expect(configManager.getGuild(guildId)).toEqual({
      AGENDA_FORUM_CHANNEL_ID: 'new',
    });
  });

  it('does not replace a save with a read started during its database write', async () => {
    let releaseWrite!: () => void;
    let releaseRead!: (rows: { config: Record<string, string> }[]) => void;
    onConflictDoUpdate.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseWrite = resolve;
        }),
    );
    limit.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseRead = resolve;
        }),
    );

    const guildId = `config-manager-save-race-${String(Date.now())}`;
    const pendingSave = configManager.saveGuild(guildId, {
      AGENDA_FORUM_CHANNEL_ID: 'new',
    });

    await vi.waitFor(() => {
      expect(releaseWrite).toBeTypeOf('function');
    });
    const loadDuringSave = configManager.loadGuild(guildId);
    await vi.waitFor(() => {
      expect(releaseRead).toBeTypeOf('function');
    });
    releaseWrite();

    await pendingSave;
    releaseRead([{ config: { AGENDA_FORUM_CHANNEL_ID: 'old' } }]);
    await expect(loadDuringSave).resolves.toEqual({
      AGENDA_FORUM_CHANNEL_ID: 'new',
    });
    expect(configManager.getGuild(guildId)).toEqual({
      AGENDA_FORUM_CHANNEL_ID: 'new',
    });
  });
});
