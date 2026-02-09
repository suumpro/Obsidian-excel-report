/**
 * Cache manager for parsed markdown data
 * Implements mtime-based invalidation and LRU eviction
 */

import { logger } from '../utils/logger';

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  mtime: number;        // File modification time (ms)
  cachedAt: number;     // When cached (ms)
  hits: number;         // Access count for debugging
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  maxEntries?: number;
  maxAge?: number;  // in milliseconds
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  entries: string[];
}

/**
 * CacheManager for parsed markdown data
 *
 * Features:
 * - mtime-based invalidation (cache is invalidated when file changes)
 * - Time-based expiration (maxAge)
 * - LRU eviction when maxEntries is exceeded
 * - Statistics tracking for debugging
 */
export class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxEntries: number;
  private maxAge: number;
  private totalHits: number = 0;
  private totalMisses: number = 0;

  constructor(options?: CacheOptions) {
    this.maxEntries = options?.maxEntries ?? 50;
    this.maxAge = options?.maxAge ?? 5 * 60 * 1000; // 5 minutes default
    if (logger.isDebugEnabled()) logger.debug(`CacheManager initialized: maxEntries=${this.maxEntries}, maxAge=${this.maxAge}ms`);
  }

  /**
   * Get cached data if valid
   * @param key Cache key (typically "type:path")
   * @param currentMtime Current file modification time
   * @returns Cached data or null if stale/missing
   */
  get<T>(key: string, currentMtime: number): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.totalMisses++;
      if (logger.isDebugEnabled()) logger.debug(`Cache miss (not found): ${key}`);
      return null;
    }

    // Check if file has been modified
    if (entry.mtime !== currentMtime) {
      this.invalidate(key);
      this.totalMisses++;
      if (logger.isDebugEnabled()) logger.debug(`Cache miss (mtime changed): ${key}`);
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() - entry.cachedAt > this.maxAge) {
      this.invalidate(key);
      this.totalMisses++;
      if (logger.isDebugEnabled()) logger.debug(`Cache miss (expired): ${key}`);
      return null;
    }

    // Cache hit — move to end for LRU (Map preserves insertion order)
    this.cache.delete(key);
    entry.hits++;
    this.cache.set(key, entry);
    this.totalHits++;
    if (logger.isDebugEnabled()) logger.debug(`Cache hit: ${key} (hits: ${entry.hits})`);
    return entry.data as T;
  }

  /**
   * Store data in cache
   * @param key Cache key
   * @param data Data to cache
   * @param mtime File modification time
   */
  set<T>(key: string, data: T, mtime: number): void {
    // Evict oldest if at capacity
    this.evictIfNeeded();

    this.cache.set(key, {
      data,
      mtime,
      cachedAt: Date.now(),
      hits: 0,
    });

    if (logger.isDebugEnabled()) logger.debug(`Cache set: ${key} (mtime: ${mtime})`);
  }

  /**
   * Check if cache entry is valid without retrieving it
   * @param key Cache key
   * @param currentMtime Current file modification time
   */
  isValid(key: string, currentMtime: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check mtime
    if (entry.mtime !== currentMtime) {
      return false;
    }

    // Check age
    if (Date.now() - entry.cachedAt > this.maxAge) {
      return false;
    }

    return true;
  }

  /**
   * Invalidate specific entry
   */
  invalidate(key: string): void {
    if (this.cache.delete(key)) {
      if (logger.isDebugEnabled()) logger.debug(`Cache invalidated: ${key}`);
    }
  }

  /**
   * Invalidate entries matching a pattern
   * @param pattern Pattern to match (supports simple prefix matching)
   */
  invalidateByPattern(pattern: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      if (logger.isDebugEnabled()) logger.debug(`Cache invalidated ${count} entries matching: ${pattern}`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
    if (logger.isDebugEnabled()) logger.debug(`Cache cleared: ${size} entries removed`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.totalHits + this.totalMisses;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? (this.totalHits / total) * 100 : 0,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Evict least-recently-used entry if at capacity
   * O(1) using Map insertion order (oldest first)
   */
  private evictIfNeeded(): void {
    if (this.cache.size < this.maxEntries) return;

    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
      if (logger.isDebugEnabled()) logger.debug(`Cache evicted (LRU): ${oldestKey}`);
    }
  }
}

/**
 * Generate a cache key
 * @param type Data type (e.g., "dashboard", "roadmap")
 * @param path File path
 */
export function createCacheKey(type: string, path: string): string {
  return `${type}:${path}`;
}
