/**
 * Check if a string is a valid URL and return the parsed URL object.
 */
export function parseUrl(urlString: string): URL | null {
  try {
    return new URL(urlString);
  } catch {
    return null;
  }
}
