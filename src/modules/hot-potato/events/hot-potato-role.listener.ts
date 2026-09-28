import { configManager } from '@/manager/config.manager.js';
import { mention } from '@/utils/mention.js';
import { createLogger } from '@/utils/logger.js';
import {
  AuditLogEvent,
  DiscordAPIError,
  Guild,
  GuildAuditLogsEntry,
} from 'discord.js';

const logger = createLogger('hot-potato');

export async function hotPotatoRoleListener(
  entry: GuildAuditLogsEntry,
  guild: Guild,
): Promise<void> {
  const { action } = entry;
  if (action !== AuditLogEvent.MemberUpdate) return;

  const memberUpdateEntry =
    entry as GuildAuditLogsEntry<AuditLogEvent.MemberUpdate>;
  const { changes, executorId, targetId } = memberUpdateEntry;

  const firstChange = changes.at(0);
  const isTimeout = firstChange?.key === 'communication_disabled_until';

  if (!isTimeout) {
    return;
  }

  if (!executorId || !targetId) {
    logger.debug(
      { guildId: guild.id, executorId, targetId },
      'Timeout audit entry without an executor or target; ignoring',
    );
    return;
  }

  const [executorResult, targetResult] = await Promise.allSettled([
    guild.members.fetch(executorId),
    guild.members.fetch(targetId),
  ]);

  const executor = getMemberResult(executorResult, guild, executorId);
  const target = getMemberResult(targetResult, guild, targetId);

  if (!executor || !target) {
    logger.info(
      { guildId: guild.id, executorId, targetId },
      'Executor or target is no longer a member; skipping potato transfer',
    );
    return;
  }

  const wasCommunicationDisabled = 'old' in firstChange;
  const isCommunicationDisabled = 'new' in firstChange;

  const valueChanged = wasCommunicationDisabled !== isCommunicationDisabled;

  if (!valueChanged || !isCommunicationDisabled) {
    return;
  }

  logger.info(
    `Member ${mention(target)} has been timed-out by ${mention(executor)}.`,
  );

  const guildConfig = configManager.getGuild(guild.id);
  const hotPotatoRoleId = guildConfig.HOT_POTATO_ROLE_ID;

  if (!hotPotatoRoleId) {
    logger.info(
      `No role configured for the guild ${guild.name} (${guild.id}).`,
    );
    return;
  }

  const executorHadPotato = executor.roles.cache.has(hotPotatoRoleId);

  if (!executorHadPotato) {
    logger.debug(
      {
        guildId: guild.id,
        executorId: executor.id,
        roleId: hotPotatoRoleId,
      },
      'Executor does not hold the hot potato role; not transferring',
    );
    return;
  }

  const configuredDuration = guildConfig.HOT_POTATO_TIMEOUT_DURATION;

  await executor.roles.remove(hotPotatoRoleId);
  await target.roles.add(hotPotatoRoleId);

  if (configuredDuration && configuredDuration > 0) {
    await target.timeout(configuredDuration, "Hot Potato'd");
  } else {
    logger.info(
      { guildId: guild.id },
      'No hot potato timeout duration configured; transferring the role only',
    );
  }
}

function getMemberResult<T>(
  result: PromiseSettledResult<T>,
  guild: Guild,
  userId: string,
): T | null {
  if (result.status === 'fulfilled') return result.value;

  if (
    result.reason instanceof DiscordAPIError &&
    result.reason.code === 10007
  ) {
    return null;
  }

  logger.error(
    { error: result.reason, guildId: guild.id, userId },
    'Failed to fetch guild member for hot potato transfer',
  );
  throw result.reason;
}
