type Fetcher<T> = () => Promise<T>;

/**
 * Cache class
 * @template T
 * @param {Fetcher<T>} fetcher
 * @param {number} revalidationPeriod in milliseconds
 * @param {T} value
 * @param {number} lastFetched timestamp in milliseconds for the last fetch
 */

class Cache<T> {
  private fetcher: Fetcher<T> | null = null;
  private revalidationPeriod: number | null = null;
  private value: T | null = null;
  private lastFetched: number | null = null;

  constructor(fetcher?: Fetcher<T>, revalidationPeriod?: number) {
    if (fetcher) this.fetcher = fetcher;
    if (revalidationPeriod) this.revalidationPeriod = revalidationPeriod;
  }

  private async fetchValue(): Promise<T | null> {
    if (!this.fetcher) return null;
    this.value = await this.fetcher();
    this.lastFetched = Date.now();
    return this.value;
  }

  public async get(): Promise<T | null> {
    const now = Date.now();
    if (
      !this.value ||
      !this.lastFetched ||
      !this.revalidationPeriod ||
      now - this.lastFetched > this.revalidationPeriod
    ) {
      return this.fetchValue();
    }
    return Promise.resolve(this.value);
  }

  public async revalidate(): Promise<T | null> {
    return this.fetchValue();
  }

  public updateConfig(fetcher?: Fetcher<T>, revalidationPeriod?: number) {
    if (fetcher) this.fetcher = fetcher;
    if (revalidationPeriod) this.revalidationPeriod = revalidationPeriod;
  }
}

class CacheStore {
  private caches = new Map<string, Cache<unknown>>();

  /**
   *
   * @param {string} key  the key to store the cache
   * @param {Fetcher<T>} fetcher  the fetcher function to fetch the value
   * @param {number} revalidationPeriod  the revalidation period in milliseconds
   * @returns {Cache<T>} the cache object related to the key
   */

  public useCache<T>(
    key: string,
    fetcher?: Fetcher<T>,
    revalidationPeriod?: number,
  ): Cache<T> {
    if (!this.caches.has(key)) {
      this.caches.set(key, new Cache<T>(fetcher, revalidationPeriod));
    } else if (fetcher || revalidationPeriod) {
      const cache = this.caches.get(key);
      if (cache) cache.updateConfig(fetcher, revalidationPeriod);
    }
    return this.caches.get(key) as Cache<T>;
  }
}

const cacheStore = new CacheStore();

export { cacheStore };
