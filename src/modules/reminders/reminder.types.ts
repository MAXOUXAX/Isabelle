export interface ReminderRow {
  id: number;
  userId: string;
  guildId: string;
  channelId: string;
  message: string;
  dueAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserReminder {
  id: number;
  message: string;
  dueAt: Date;
}

export interface ReminderCursor {
  dueAt: Date | null;
  id: number | null;
}
