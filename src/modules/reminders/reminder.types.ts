export interface UserReminder {
  id: number;
  message: string;
  dueAt: Date;
}

export interface ReminderCursor {
  dueAt: Date | null;
  id: number | null;
}
