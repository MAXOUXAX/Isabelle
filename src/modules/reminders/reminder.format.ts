export const formatReminderPreview = (
  message: string,
  maxLength = 60,
): string => {
  const normalizedMessage = message.replaceAll(/\s+/g, ' ').trim();

  if (normalizedMessage.length <= maxLength) {
    return normalizedMessage;
  }

  return `${normalizedMessage.slice(0, maxLength - 1)}…`;
};

export const formatReminderRelativeTime = (dueAt: Date): string => {
  const timestamp = Math.floor(dueAt.getTime() / 1000);
  return `<t:${String(timestamp)}:R>`;
};
