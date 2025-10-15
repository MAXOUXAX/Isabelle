export const DISCORD_MESSAGE_CHAR_LIMIT = 2000;

/**
 * Intelligently splits a long message into chunks that respect Discord's message length limit.
 * Prioritizes splitting at natural break points in this order:
 * 1. Paragraphs (double newlines)
 * 2. Single newlines
 * 3. Sentences (periods followed by space)
 * 4. Character boundaries (last resort)
 *
 * @param content - The content to split
 * @param maxLength - Maximum length per chunk (defaults to Discord's limit)
 * @returns Array of message chunks
 */
export function splitMessageIntoChunks(
  content: string,
  maxLength = DISCORD_MESSAGE_CHAR_LIMIT,
): string[] {
  if (!content) {
    return [];
  }

  if (content.length <= maxLength) {
    return [content];
  }

  const chunks: string[] = [];
  let remainingContent = content;

  while (remainingContent.length > 0) {
    if (remainingContent.length <= maxLength) {
      chunks.push(remainingContent);
      break;
    }

    const chunk = extractOptimalChunk(remainingContent, maxLength);
    chunks.push(chunk);
    remainingContent = remainingContent.slice(chunk.length).trimStart();
  }

  return chunks;
}

/**
 * Extracts the optimal chunk from the content, respecting natural break points.
 */
function extractOptimalChunk(content: string, maxLength: number): string {
  // If the content fits, return it as is
  if (content.length <= maxLength) {
    return content;
  }

  // Try to split by paragraphs (double newlines)
  const paragraphChunk = splitByDelimiter(content, maxLength, '\n\n');
  if (paragraphChunk) {
    return paragraphChunk;
  }

  // Try to split by single newlines
  const lineChunk = splitByDelimiter(content, maxLength, '\n');
  if (lineChunk) {
    return lineChunk;
  }

  // Try to split by sentences (period followed by space)
  const sentenceChunk = splitBySentence(content, maxLength);
  if (sentenceChunk) {
    return sentenceChunk;
  }

  // Last resort: split by words
  const wordChunk = splitByDelimiter(content, maxLength, ' ');
  if (wordChunk) {
    return wordChunk;
  }

  // Absolute last resort: hard cut at maxLength
  return content.slice(0, maxLength);
}

/**
 * Attempts to split content by a specific delimiter, fitting as much as possible
 * within the maxLength while keeping complete segments.
 */
function splitByDelimiter(
  content: string,
  maxLength: number,
  delimiter: string,
): string | null {
  const segments = content.split(delimiter);
  let currentLength = 0;
  const selectedSegments: string[] = [];

  for (const segment of segments) {
    // Calculate the length including the delimiter (except for the first segment)
    const segmentLength =
      segment.length + (selectedSegments.length > 0 ? delimiter.length : 0);

    // If adding this segment would exceed the limit, stop
    if (currentLength + segmentLength > maxLength) {
      break;
    }

    selectedSegments.push(segment);
    currentLength += segmentLength;
  }

  // If we couldn't fit even one segment, return null to try next strategy
  if (selectedSegments.length === 0) {
    return null;
  }

  return selectedSegments.join(delimiter);
}

/**
 * Attempts to split content by sentences (periods followed by space or end of string).
 */
function splitBySentence(content: string, maxLength: number): string | null {
  // Match sentences ending with period + space or period at end
  const sentencePattern = /[.!?](?:\s|$)/g;
  const matches = [...content.matchAll(sentencePattern)];

  if (matches.length === 0) {
    return null;
  }

  let lastValidPosition = 0;

  for (const match of matches) {
    const position = match.index + match[0].length;
    if (position > maxLength) {
      break;
    }
    lastValidPosition = position;
  }

  // If we couldn't fit even one sentence, return null
  if (lastValidPosition === 0) {
    return null;
  }

  return content.slice(0, lastValidPosition);
}
