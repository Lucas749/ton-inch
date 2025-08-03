import fs from 'fs';
import path from 'path';

export interface CacheEntry {
  symbol: string;
  function: string;
  interval?: string;
  lastFetched: string;
  success: boolean;
  retryCount: number;
  nextRetry?: string;
  data: any;
}

export class ServerCSVCacheService {
  private cacheDir: string;
  private dailyRefreshInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private retryDelayHours = 1; // Retry failed requests after 1 hour
  private maxRetries = 3;

  constructor(cacheDir: string = './cache') {
    this.cacheDir = path.resolve(cacheDir);
    this.ensureCacheDirectoryExists();
  }

  private ensureCacheDirectoryExists(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      console.log(`📁 Created cache directory: ${this.cacheDir}`);
    }
  }

  private getCacheKey(symbol: string, functionName: string, interval?: string): string {
    return `${functionName}_${symbol}${interval ? `_${interval}` : ''}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private getCacheFilePath(cacheKey: string): string {
    return path.join(this.cacheDir, `${cacheKey}.csv`);
  }

  private parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private escapeCSVValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private loadCacheEntry(cacheKey: string): CacheEntry | null {
    const filePath = this.getCacheFilePath(cacheKey);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const lines = csvContent.trim().split('\n');
      
      if (lines.length < 2) {
        return null;
      }

      // Skip header row (index 0), parse metadata row (index 1)
      const metadataRow = this.parseCSVRow(lines[1]);
      
      if (metadataRow.length < 7) {
        return null;
      }

      const entry: CacheEntry = {
        symbol: metadataRow[0],
        function: metadataRow[1],
        interval: metadataRow[2] || undefined,
        lastFetched: metadataRow[3],
        success: metadataRow[4] === 'true',
        retryCount: parseInt(metadataRow[5]) || 0,
        nextRetry: metadataRow[6] || undefined,
        data: null
      };

      // Parse the JSON data from the remaining lines
      if (lines.length > 2) {
        const dataRows = lines.slice(2);
        const jsonString = dataRows.join('\n');
        try {
          entry.data = JSON.parse(jsonString);
        } catch (parseError) {
          console.error(`Error parsing cached JSON data for ${cacheKey}:`, parseError);
          return null;
        }
      }

      return entry;
    } catch (error) {
      console.error(`Error loading cache entry for ${cacheKey}:`, error);
      return null;
    }
  }

  private saveCacheEntry(cacheKey: string, entry: CacheEntry): void {
    const filePath = this.getCacheFilePath(cacheKey);
    
    try {
      const csvLines: string[] = [];
      
      // Header row
      csvLines.push('symbol,function,interval,lastFetched,success,retryCount,nextRetry');
      
      // Metadata row
      const metadataRow = [
        this.escapeCSVValue(entry.symbol),
        this.escapeCSVValue(entry.function),
        this.escapeCSVValue(entry.interval || ''),
        this.escapeCSVValue(entry.lastFetched),
        this.escapeCSVValue(entry.success.toString()),
        this.escapeCSVValue(entry.retryCount.toString()),
        this.escapeCSVValue(entry.nextRetry || '')
      ];
      csvLines.push(metadataRow.join(','));
      
      // JSON data
      if (entry.data) {
        csvLines.push(JSON.stringify(entry.data, null, 2));
      }
      
      fs.writeFileSync(filePath, csvLines.join('\n'), 'utf-8');
    } catch (error) {
      console.error(`Error saving cache entry for ${cacheKey}:`, error);
    }
  }

  shouldUseCache(symbol: string, functionName: string, interval?: string): boolean {
    const cacheKey = this.getCacheKey(symbol, functionName, interval);
    const entry = this.loadCacheEntry(cacheKey);
    
    if (!entry) {
      return false;
    }

    const now = new Date();
    const lastFetched = new Date(entry.lastFetched);
    const timeSinceLastFetch = now.getTime() - lastFetched.getTime();

    // If it was successful and within the daily refresh interval, use cache
    if (entry.success && timeSinceLastFetch < this.dailyRefreshInterval) {
      return true;
    }

    // If it failed, check if we should retry
    if (!entry.success) {
      if (entry.retryCount >= this.maxRetries) {
        // Max retries reached, use cached data if available
        return entry.data !== null;
      }

      if (entry.nextRetry) {
        const nextRetryTime = new Date(entry.nextRetry);
        if (now < nextRetryTime) {
          // Still within retry delay, use cached data if available
          return entry.data !== null;
        }
      }
    }

    return false;
  }

  getCachedData(symbol: string, functionName: string, interval?: string): any | null {
    const cacheKey = this.getCacheKey(symbol, functionName, interval);
    const entry = this.loadCacheEntry(cacheKey);
    
    if (!entry || !entry.data) {
      return null;
    }

    console.log(`🎯 Using cached data for ${functionName} - ${symbol}${interval ? ` (${interval})` : ''}`);
    return entry.data;
  }

  cacheData(symbol: string, functionName: string, interval: string | undefined, data: any): void {
    const cacheKey = this.getCacheKey(symbol, functionName, interval);
    
    const entry: CacheEntry = {
      symbol,
      function: functionName,
      interval,
      lastFetched: new Date().toISOString(),
      success: true,
      retryCount: 0,
      nextRetry: undefined,
      data
    };

    this.saveCacheEntry(cacheKey, entry);
    console.log(`💾 Cached successful response for ${functionName} - ${symbol}${interval ? ` (${interval})` : ''}`);
  }

  markFailedRequest(symbol: string, functionName: string, interval?: string): void {
    const cacheKey = this.getCacheKey(symbol, functionName, interval);
    let entry = this.loadCacheEntry(cacheKey);
    
    if (!entry) {
      entry = {
        symbol,
        function: functionName,
        interval,
        lastFetched: new Date().toISOString(),
        success: false,
        retryCount: 1,
        nextRetry: new Date(Date.now() + this.retryDelayHours * 60 * 60 * 1000).toISOString(),
        data: null
      };
    } else {
      entry.lastFetched = new Date().toISOString();
      entry.success = false;
      entry.retryCount += 1;
      entry.nextRetry = new Date(Date.now() + this.retryDelayHours * 60 * 60 * 1000).toISOString();
    }

    this.saveCacheEntry(cacheKey, entry);
    console.log(`❌ Marked failed request for retry: ${functionName} - ${symbol}${interval ? ` (${interval})` : ''} (attempt ${entry.retryCount})`);
  }

  cleanupOldCache(): void {
    if (!fs.existsSync(this.cacheDir)) {
      return;
    }

    const files = fs.readdirSync(this.cacheDir);
    const now = new Date();
    let cleanedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.csv')) {
        continue;
      }

      const filePath = path.join(this.cacheDir, file);
      const cacheKey = file.replace('.csv', '');
      const entry = this.loadCacheEntry(cacheKey);

      if (!entry) {
        continue;
      }

      const lastFetched = new Date(entry.lastFetched);
      const daysSinceLastFetch = (now.getTime() - lastFetched.getTime()) / (24 * 60 * 60 * 1000);

      // Remove entries older than 7 days or failed entries that exceeded max retries
      if (daysSinceLastFetch > 7 || (!entry.success && entry.retryCount >= this.maxRetries)) {
        try {
          fs.unlinkSync(filePath);
          cleanedCount++;
        } catch (error) {
          console.error(`Error deleting cache file ${file}:`, error);
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old cache entries`);
    }
  }

  getCacheStats(): { totalEntries: number; successfulEntries: number; failedEntries: number; oldestEntry: string | null } {
    if (!fs.existsSync(this.cacheDir)) {
      return { totalEntries: 0, successfulEntries: 0, failedEntries: 0, oldestEntry: null };
    }

    const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.csv'));
    let successfulEntries = 0;
    let failedEntries = 0;
    let oldestDate: Date | null = null;

    for (const file of files) {
      const cacheKey = file.replace('.csv', '');
      const entry = this.loadCacheEntry(cacheKey);

      if (!entry) {
        continue;
      }

      if (entry.success) {
        successfulEntries++;
      } else {
        failedEntries++;
      }

      const entryDate = new Date(entry.lastFetched);
      if (!oldestDate || entryDate < oldestDate) {
        oldestDate = entryDate;
      }
    }

    return {
      totalEntries: files.length,
      successfulEntries,
      failedEntries,
      oldestEntry: oldestDate ? oldestDate.toISOString() : null
    };
  }
}