// AlphaVantage Browser-Compatible Caching Service
// Implements daily caching with retry logic for failed requests

export interface CacheEntry {
  symbol: string;
  function: string;
  interval?: string;
  lastFetched: string;
  data: any;
  success: boolean;
  retryCount: number;
}

export interface CacheMetadata {
  symbol: string;
  function: string;
  interval?: string;
  lastFetched: Date;
  success: boolean;
  retryCount: number;
  nextRetry?: Date;
}

export class AlphaVantageCacheService {
  private maxRetries: number = 3;
  private retryDelayHours: number = 2;
  private storagePrefix: string = 'alphavantage_cache_';
  private metadataKey: string = 'alphavantage_metadata';

  constructor(cacheDir?: string) {
    // Browser-only implementation using localStorage
    if (typeof window === 'undefined') {
      console.warn('AlphaVantage cache service requires browser environment');
    }
  }

  private isStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  private getCacheKey(symbol: string, functionName: string, interval?: string): string {
    return `${symbol}_${functionName}${interval ? `_${interval}` : ''}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private getStorageKey(cacheKey: string): string {
    return `${this.storagePrefix}${cacheKey}`;
  }

  private getMetadata(): CacheMetadata[] {
    if (!this.isStorageAvailable()) return [];

    try {
      const stored = localStorage.getItem(this.metadataKey);
      if (!stored) return [];
      
      return JSON.parse(stored).map((item: any) => ({
        ...item,
        lastFetched: new Date(item.lastFetched),
        nextRetry: item.nextRetry ? new Date(item.nextRetry) : undefined
      }));
    } catch (error) {
      console.error('Failed to read cache metadata:', error);
      return [];
    }
  }

  private saveMetadata(metadata: CacheMetadata[]): void {
    if (!this.isStorageAvailable()) return;

    try {
      localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save cache metadata:', error);
    }
  }

  private findMetadataEntry(symbol: string, functionName: string, interval?: string): CacheMetadata | undefined {
    const metadata = this.getMetadata();
    return metadata.find(entry => 
      entry.symbol === symbol && 
      entry.function === functionName && 
      entry.interval === interval
    );
  }

  private updateMetadataEntry(symbol: string, functionName: string, interval: string | undefined, success: boolean): void {
    const metadata = this.getMetadata();
    const existingIndex = metadata.findIndex(entry => 
      entry.symbol === symbol && 
      entry.function === functionName && 
      entry.interval === interval
    );

    const now = new Date();
    const newEntry: CacheMetadata = {
      symbol,
      function: functionName,
      interval,
      lastFetched: now,
      success,
      retryCount: success ? 0 : (existingIndex >= 0 ? metadata[existingIndex].retryCount + 1 : 1),
      nextRetry: success ? undefined : new Date(now.getTime() + this.retryDelayHours * 60 * 60 * 1000)
    };

    if (existingIndex >= 0) {
      metadata[existingIndex] = newEntry;
    } else {
      metadata.push(newEntry);
    }

    this.saveMetadata(metadata);
  }

  // Check if data should be fetched from cache or API
  shouldUseCache(symbol: string, functionName: string, interval?: string): boolean {
    const metadata = this.findMetadataEntry(symbol, functionName, interval);
    if (!metadata) return false;

    const now = new Date();
    const daysSinceLastFetch = (now.getTime() - metadata.lastFetched.getTime()) / (1000 * 60 * 60 * 24);

    // If successful fetch within last day, use cache
    if (metadata.success && daysSinceLastFetch < 1) {
      return true;
    }

    // If failed fetch, check retry logic
    if (!metadata.success && metadata.nextRetry && now < metadata.nextRetry) {
      return true; // Still in retry cooldown, use cache if available
    }

    // If too many retries, use cache
    if (!metadata.success && metadata.retryCount >= this.maxRetries) {
      return true;
    }

    return false;
  }

  // Get cached data
  async getCachedData(symbol: string, functionName: string, interval?: string): Promise<any | null> {
    if (!this.isStorageAvailable()) return null;

    try {
      const cacheKey = this.getCacheKey(symbol, functionName, interval);
      const storageKey = this.getStorageKey(cacheKey);
      const cached = localStorage.getItem(storageKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to read cached data:', error);
      return null;
    }
  }

  // Cache successful API response
  async cacheData(symbol: string, functionName: string, interval: string | undefined, data: any): Promise<void> {
    if (!this.isStorageAvailable()) return;

    try {
      const cacheKey = this.getCacheKey(symbol, functionName, interval);
      const storageKey = this.getStorageKey(cacheKey);
      localStorage.setItem(storageKey, JSON.stringify(data));
      this.updateMetadataEntry(symbol, functionName, interval, true);
    } catch (error) {
      console.error('Failed to cache data:', error);
      this.updateMetadataEntry(symbol, functionName, interval, false);
    }
  }

  // Mark failed request for retry logic
  markFailedRequest(symbol: string, functionName: string, interval?: string): void {
    this.updateMetadataEntry(symbol, functionName, interval, false);
  }

  // Clean up old cache entries (older than 7 days)
  cleanupOldCache(): void {
    if (!this.isStorageAvailable()) return;

    const metadata = this.getMetadata();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const validMetadata = metadata.filter(entry => {
      if (entry.lastFetched < sevenDaysAgo) {
        // Remove old cache entry from localStorage
        try {
          const cacheKey = this.getCacheKey(entry.symbol, entry.function, entry.interval);
          const storageKey = this.getStorageKey(cacheKey);
          localStorage.removeItem(storageKey);
        } catch (error) {
          console.error('Failed to remove old cache entry:', error);
        }
        return false;
      }
      return true;
    });

    this.saveMetadata(validMetadata);
  }

  // Get cache statistics
  getCacheStats(): { totalEntries: number; successfulEntries: number; failedEntries: number; retryingEntries: number } {
    const metadata = this.getMetadata();
    const now = new Date();

    return {
      totalEntries: metadata.length,
      successfulEntries: metadata.filter(entry => entry.success).length,
      failedEntries: metadata.filter(entry => !entry.success && entry.retryCount >= this.maxRetries).length,
      retryingEntries: metadata.filter(entry => !entry.success && entry.retryCount < this.maxRetries && (!entry.nextRetry || now >= entry.nextRetry)).length
    };
  }
}

export default AlphaVantageCacheService;