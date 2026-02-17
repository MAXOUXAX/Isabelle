export function ensureTitleStartsWithEmoji(
  title: string,
  emoji: string,
): string {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return emoji;
  }

  if (normalizedTitle.startsWith(emoji)) {
    return normalizedTitle;
  }

  return `${emoji} ${normalizedTitle}`;
}
