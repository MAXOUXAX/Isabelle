export const DISCORD_MESSAGE_CHAR_LIMIT = 2000;

/**
 * Split long Discord content into chunks compliant with the Discord message length limit.
 */
export function splitMessageIntoChunks(
  content: string,
  chunkSize = DISCORD_MESSAGE_CHAR_LIMIT,
): string[] {
  if (!content) {
    return [];
  }

  const chunks: string[] = [];
  for (let index = 0; index < content.length; index += chunkSize) {
    chunks.push(content.slice(index, index + chunkSize));
  }

  return chunks;
}
