import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWebSearchTool, shapeExaResults } from './web-search.tool.js';

vi.mock('@/utils/logger.js', () => ({
  createLogger: () => ({ debug: vi.fn(), warn: vi.fn() }),
}));

const toolCallOptions = { toolCallId: 'call-1', messages: [], context: {} };

describe('shapeExaResults', () => {
  it('keeps the title, url and a trimmed excerpt of the first five results', () => {
    const results = Array.from({ length: 7 }, (_, index) => ({
      title: `Page ${String(index)}`,
      url: `https://example.com/${String(index)}`,
      highlights: ['a'.repeat(400), 'b'.repeat(400)],
    }));

    const shaped = shapeExaResults({ results });

    expect(shaped).toHaveLength(5);
    expect(shaped[0]).toMatchObject({
      title: 'Page 0',
      url: 'https://example.com/0',
    });
    expect(shaped[0].excerpt).toHaveLength(500);
  });

  it('falls back to the url when the title is missing', () => {
    expect(
      shapeExaResults({ results: [{ title: null, url: 'https://a.fr' }] }),
    ).toEqual([{ title: 'https://a.fr', url: 'https://a.fr', excerpt: '' }]);
  });

  it('returns no results when Exa sends none', () => {
    expect(shapeExaResults({})).toEqual([]);
  });
});

describe('createWebSearchTool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns no tool without an API key', () => {
    expect(createWebSearchTool(undefined)).toBeUndefined();
    expect(createWebSearchTool('')).toBeUndefined();
  });

  it('searches Exa with the key and returns shaped results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        results: [
          {
            title: 'TELECOM Nancy',
            url: 'https://telecomnancy.eu',
            highlights: ['École'],
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const output = await createWebSearchTool('exa-key')?.execute(
      { query: 'TELECOM Nancy' },
      toolCallOptions,
    );

    expect(output).toEqual({
      status: 'ok',
      results: [
        {
          title: 'TELECOM Nancy',
          url: 'https://telecomnancy.eu',
          excerpt: 'École',
        },
      ],
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.exa.ai/search');
    expect(init.headers).toMatchObject({ 'x-api-key': 'exa-key' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body as string)).toMatchObject({
      query: 'TELECOM Nancy',
    });
  });

  it('reports a timed out search to the model instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValue(
          new DOMException('The operation timed out.', 'TimeoutError'),
        ),
    );

    const output = await createWebSearchTool('exa-key')?.execute(
      { query: 'x' },
      toolCallOptions,
    );

    expect(output).toEqual({
      status: 'error',
      message: 'La recherche a échoué.',
    });
  });

  it('reports a failed search to the model instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('quota', { status: 429 })),
    );

    const output = await createWebSearchTool('exa-key')?.execute(
      { query: 'x' },
      toolCallOptions,
    );

    expect(output).toEqual({
      status: 'error',
      message: 'La recherche a échoué (HTTP 429).',
    });
  });
});
