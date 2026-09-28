import { describe, expect, it } from 'vitest';
import { cacheStore } from './cache.js';

let testKey = 0;

function createKey() {
  testKey += 1;
  return `cache-test-${String(testKey)}`;
}

describe('Cache', () => {
  it('shares one fetch across concurrent get calls', async () => {
    let resolveFetch!: (value: string) => void;
    let calls = 0;
    const cache = cacheStore.useCache(
      createKey(),
      () => {
        calls += 1;
        return new Promise<string>((resolve) => {
          resolveFetch = resolve;
        });
      },
      1000,
    );

    const first = cache.get();
    const second = cache.get();
    const third = cache.get();
    await Promise.resolve();
    resolveFetch('shared');

    await expect(Promise.all([first, second, third])).resolves.toEqual([
      'shared',
      'shared',
      'shared',
    ]);
    expect(calls).toBe(1);
  });

  it('returns a fresh cached value without fetching again', async () => {
    let calls = 0;
    const cache = cacheStore.useCache(
      createKey(),
      () => Promise.resolve(`value-${String(++calls)}`),
      1000,
    );

    await expect(cache.get()).resolves.toBe('value-1');
    await expect(cache.get()).resolves.toBe('value-1');
    expect(calls).toBe(1);
  });

  it('caches a falsy value', async () => {
    let calls = 0;
    const cache = cacheStore.useCache(
      createKey(),
      () => {
        calls += 1;
        return Promise.resolve(false);
      },
      1000,
    );

    await expect(cache.get()).resolves.toBe(false);
    await expect(cache.get()).resolves.toBe(false);
    expect(calls).toBe(1);
  });

  it('fetches again after the entry expires', async () => {
    let calls = 0;
    const cache = cacheStore.useCache(
      createKey(),
      () => Promise.resolve(++calls),
      1,
    );

    await cache.get();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await cache.get();
    expect(calls).toBe(2);
  });

  it('clears the in-flight fetch after a rejection', async () => {
    let calls = 0;
    const cache = cacheStore.useCache(
      createKey(),
      () => {
        calls += 1;
        if (calls === 1) {
          return Promise.reject(new Error('temporary failure'));
        }
        return Promise.resolve('recovered');
      },
      1000,
    );

    await expect(cache.get()).rejects.toThrow('temporary failure');
    await expect(cache.get()).resolves.toBe('recovered');
    expect(calls).toBe(2);
  });

  it('revalidates after an in-flight get and keeps the revalidated value', async () => {
    let resolveFirst!: (value: string) => void;
    let calls = 0;
    const cache = cacheStore.useCache(
      createKey(),
      () => {
        calls += 1;
        if (calls === 1) {
          return new Promise<string>((resolve) => {
            resolveFirst = resolve;
          });
        }
        return Promise.resolve('revalidated');
      },
      1000,
    );

    const initialGet = cache.get();
    const revalidation = cache.revalidate();
    await Promise.resolve();
    resolveFirst('in-flight');

    await expect(initialGet).resolves.toBe('in-flight');
    await expect(revalidation).resolves.toBe('revalidated');
    await expect(cache.get()).resolves.toBe('revalidated');
    expect(calls).toBe(2);
  });

  it('turns a synchronous fetcher throw into a rejected promise and allows retry', async () => {
    let calls = 0;
    const cache = cacheStore.useCache(
      createKey(),
      () => {
        calls += 1;
        if (calls === 1) throw new Error('synchronous failure');
        return Promise.resolve('recovered');
      },
      1000,
    );

    await expect(cache.get()).rejects.toThrow('synchronous failure');
    await expect(cache.get()).resolves.toBe('recovered');
    expect(calls).toBe(2);
  });

  it('revalidates a fresh entry explicitly', async () => {
    let calls = 0;
    const cache = cacheStore.useCache(
      createKey(),
      () => Promise.resolve(++calls),
      1000,
    );

    await cache.get();
    await expect(cache.revalidate()).resolves.toBe(2);
    expect(calls).toBe(2);
  });
});
