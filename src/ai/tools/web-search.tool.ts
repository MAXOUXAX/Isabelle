import { createLogger } from '@/utils/logger.js';
import { tool } from 'ai';
import { z } from 'zod';

const logger = createLogger('web-search-tool');

const EXA_SEARCH_URL = 'https://api.exa.ai/search';
const MAX_RESULTS = 5;
const MAX_HIGHLIGHT_CHARACTERS = 500;
// Covers the request and the body read, so a stalled search can't hold up a roast.
const SEARCH_TIMEOUT_MS = 10_000;

interface ExaSearchResult {
  title?: string | null;
  url: string;
  highlights?: string[];
}

interface ExaSearchResponse {
  results?: ExaSearchResult[];
}

export interface WebSearchResult {
  title: string;
  url: string;
  excerpt: string;
}

export type WebSearchOutput =
  | { status: 'ok'; results: WebSearchResult[] }
  | { status: 'error'; message: string };

export function shapeExaResults(
  response: ExaSearchResponse,
): WebSearchResult[] {
  return (response.results ?? []).slice(0, MAX_RESULTS).map((result) => ({
    title: result.title?.trim() ? result.title.trim() : result.url,
    url: result.url,
    excerpt: (result.highlights ?? [])
      .join(' … ')
      .slice(0, MAX_HIGHLIGHT_CHARACTERS),
  }));
}

/**
 * Builds a web search tool backed by Exa, or returns `undefined` when no API
 * key is configured so callers can run without web search.
 */
export function createWebSearchTool(apiKey: string | undefined) {
  if (!apiKey) {
    return undefined;
  }

  return tool({
    description:
      'Recherche sur le web. Renvoie quelques pages avec un court extrait pertinent.',
    inputSchema: z.object({
      query: z.string().min(1).describe('La requête de recherche'),
    }),
    execute: async ({ query }): Promise<WebSearchOutput> => {
      try {
        const response = await fetch(EXA_SEARCH_URL, {
          method: 'POST',
          signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            query,
            // Cheapest and fastest mode, good enough for short factual lookups.
            type: 'instant',
            numResults: MAX_RESULTS,
            contents: {
              highlights: { maxCharacters: MAX_HIGHLIGHT_CHARACTERS },
            },
          }),
        });

        if (!response.ok) {
          logger.warn(
            { query, status: response.status, body: await response.text() },
            'Exa search failed',
          );
          return {
            status: 'error',
            message: `La recherche a échoué (HTTP ${String(response.status)}).`,
          };
        }

        const results = shapeExaResults(
          (await response.json()) as ExaSearchResponse,
        );
        logger.debug({ query, resultCount: results.length }, 'Exa search done');
        return { status: 'ok', results };
      } catch (error) {
        logger.warn({ error, query }, 'Exa search failed');
        return { status: 'error', message: 'La recherche a échoué.' };
      }
    },
  });
}
