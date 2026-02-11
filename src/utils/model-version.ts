/**
 * Extracts the model version from an AI generation result response body.
 * @param responseBody - The response body object from an AI generation result
 * @returns The model version string if found, otherwise undefined
 */
export function extractModelVersion(responseBody: unknown): string | undefined {
  return responseBody &&
    typeof responseBody === 'object' &&
    'modelVersion' in responseBody &&
    typeof (responseBody as Record<string, unknown>).modelVersion === 'string'
    ? ((responseBody as Record<string, unknown>).modelVersion as string)
    : undefined;
}
