import { configManager } from '@/manager/config.manager.js';
import { mention } from '@/utils/mention.js';
import { logger } from '@/utils/logger.js';
import {
  AuditLogEvent,
  Guild,
  GuildAuditLogsActionType,
  GuildAuditLogsEntry,
  GuildAuditLogsTargetType,
} from 'discord.js';

export async function hotPotatoRoleListener(
  entry: GuildAuditLogsEntry<
    AuditLogEvent,
    GuildAuditLogsActionType,
    GuildAuditLogsTargetType,
    AuditLogEvent
  >,
  guild: Guild,
): Promise<void> {
  const { action, changes } = entry;
  if (action !== AuditLogEvent.MemberUpdate) return;

  const { executorId, targetId } = entry;

  const firstChange = changes.at(0);
  const isTimeout = firstChange?.key === 'communication_disabled_until';

  if (isTimeout) {
    // Ensure the executor is cached.
    const executor = await guild.members.fetch(executorId ?? '');

    // Ensure the target guild member is cached.
    const target = await guild.members.fetch(targetId ?? '');

    const wasCommunicationDisabled = 'old' in firstChange;
    const isCommunicationDisabled = 'new' in firstChange;

    const valueChanged = wasCommunicationDisabled !== isCommunicationDisabled;

    if (valueChanged && isCommunicationDisabled) {
      logger.info(
        `Member ${mention(target)} has been timed-out by ${mention(executor)}.`,
      );

      const hotPotatoRoleId = configManager.getGuild(
        guild.id,
      ).HOT_POTATO_ROLE_ID;

      if (!hotPotatoRoleId) {
        logger.info(
          `[HotPotato] No role configured for the guild ${guild.name} (${guild.id}).`,
        );
        return;
      }

      const hotPotatoTimeoutDuration =
        configManager.getGuild(guild.id).HOT_POTATO_TIMEOUT_DURATION ?? null;

      await Promise.all([
        executor.roles.remove(hotPotatoRoleId),
        target.roles.add(hotPotatoRoleId),
        target.timeout(hotPotatoTimeoutDuration, "Hot Potato'd"),
      ]);
    }
  }
}
