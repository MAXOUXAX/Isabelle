export class ReminderChannelUnavailableError extends Error {
  constructor(channelId: string) {
    super(`Channel ${channelId} is not sendable for reminder delivery`);
    this.name = 'ReminderChannelUnavailableError';
  }
}
