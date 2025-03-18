type Fetcher<T> = () => Promise<T>;

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

  public get(): Promise<T | null> {
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
