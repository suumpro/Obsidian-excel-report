/**
 * Unit tests for CacheManager
 */

import { CacheManager, createCacheKey } from '../src/services/CacheManager';

// Mock the logger to prevent console output during tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    isDebugEnabled: jest.fn().mockReturnValue(false),
  },
}));

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({ maxEntries: 5, maxAge: 60000 }); // 1 minute max age
  });

  describe('basic operations', () => {
    it('should store and retrieve data', () => {
      const testData = { foo: 'bar', count: 42 };
      const mtime = Date.now();

      cache.set('test-key', testData, mtime);
      const result = cache.get<typeof testData>('test-key', mtime);

      expect(result).toEqual(testData);
    });

    it('should return null for missing keys', () => {
      expect(cache.get('nonexistent', Date.now())).toBeNull();
    });

    it('should handle complex data types', () => {
      const complexData = {
        tasks: [
          { id: 1, name: 'Task 1', completed: true },
          { id: 2, name: 'Task 2', completed: false },
        ],
        metadata: {
          created: new Date().toISOString(),
          nested: { deep: { value: 123 } },
        },
      };
      const mtime = Date.now();

      cache.set('complex', complexData, mtime);
      expect(cache.get('complex', mtime)).toEqual(complexData);
    });
  });

  describe('mtime-based invalidation', () => {
    it('should invalidate when mtime changes', () => {
      const data = { value: 'test' };
      const originalMtime = 1000;
      const newMtime = 2000;

      cache.set('key', data, originalMtime);

      // Should return null with different mtime
      expect(cache.get('key', newMtime)).toBeNull();
    });

    it('should return data when mtime matches', () => {
      const data = { value: 'test' };
      const mtime = 1000;

      cache.set('key', data, mtime);
      expect(cache.get('key', mtime)).toEqual(data);
    });
  });

  describe('isValid', () => {
    it('should return true for valid entries', () => {
      const mtime = Date.now();
      cache.set('key', 'value', mtime);
      expect(cache.isValid('key', mtime)).toBe(true);
    });

    it('should return false for missing entries', () => {
      expect(cache.isValid('nonexistent', Date.now())).toBe(false);
    });

    it('should return false when mtime differs', () => {
      cache.set('key', 'value', 1000);
      expect(cache.isValid('key', 2000)).toBe(false);
    });
  });

  describe('invalidation', () => {
    it('should invalidate specific key', () => {
      const mtime = Date.now();
      cache.set('key1', 'value1', mtime);
      cache.set('key2', 'value2', mtime);

      cache.invalidate('key1');

      expect(cache.get('key1', mtime)).toBeNull();
      expect(cache.get('key2', mtime)).toBe('value2');
    });

    it('should invalidate by pattern', () => {
      const mtime = Date.now();
      cache.set('dashboard:file1', 'data1', mtime);
      cache.set('dashboard:file2', 'data2', mtime);
      cache.set('roadmap:file1', 'data3', mtime);

      cache.invalidateByPattern('dashboard:');

      expect(cache.get('dashboard:file1', mtime)).toBeNull();
      expect(cache.get('dashboard:file2', mtime)).toBeNull();
      expect(cache.get('roadmap:file1', mtime)).toBe('data3');
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      const mtime = Date.now();
      cache.set('key1', 'value1', mtime);
      cache.set('key2', 'value2', mtime);
      cache.set('key3', 'value3', mtime);

      cache.clear();

      expect(cache.get('key1', mtime)).toBeNull();
      expect(cache.get('key2', mtime)).toBeNull();
      expect(cache.get('key3', mtime)).toBeNull();
    });

    it('should reset statistics', () => {
      const mtime = Date.now();
      cache.set('key', 'value', mtime);
      cache.get('key', mtime); // hit
      cache.get('missing', mtime); // miss

      cache.clear();

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should track cache hits', () => {
      const mtime = Date.now();
      cache.set('key', 'value', mtime);

      cache.get('key', mtime);
      cache.get('key', mtime);
      cache.get('key', mtime);

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(3);
    });

    it('should track cache misses', () => {
      cache.get('missing1', Date.now());
      cache.get('missing2', Date.now());

      const stats = cache.getStats();
      expect(stats.totalMisses).toBe(2);
    });

    it('should calculate hit rate', () => {
      const mtime = Date.now();
      cache.set('key', 'value', mtime);

      cache.get('key', mtime); // hit
      cache.get('key', mtime); // hit
      cache.get('missing', mtime); // miss
      cache.get('missing2', mtime); // miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(50); // 2 hits / 4 total = 50%
    });

    it('should report cache size', () => {
      const mtime = Date.now();
      cache.set('key1', 'value1', mtime);
      cache.set('key2', 'value2', mtime);
      cache.set('key3', 'value3', mtime);

      const stats = cache.getStats();
      expect(stats.size).toBe(3);
    });

    it('should list entry keys', () => {
      const mtime = Date.now();
      cache.set('alpha', 'a', mtime);
      cache.set('beta', 'b', mtime);

      const stats = cache.getStats();
      expect(stats.entries).toContain('alpha');
      expect(stats.entries).toContain('beta');
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when maxEntries exceeded', () => {
      const cache = new CacheManager({ maxEntries: 3, maxAge: 60000 });
      const mtime = Date.now();

      // Add entries with slight delays to ensure different cachedAt times
      cache.set('first', 'value1', mtime);
      cache.set('second', 'value2', mtime);
      cache.set('third', 'value3', mtime);

      // This should evict 'first'
      cache.set('fourth', 'value4', mtime);

      expect(cache.get('first', mtime)).toBeNull();
      expect(cache.get('second', mtime)).toBe('value2');
      expect(cache.get('third', mtime)).toBe('value3');
      expect(cache.get('fourth', mtime)).toBe('value4');
    });
  });

  describe('time-based expiration', () => {
    it('should expire entries after maxAge', () => {
      // Create cache with very short maxAge
      const shortLivedCache = new CacheManager({ maxEntries: 10, maxAge: 1 }); // 1ms
      const mtime = Date.now();

      shortLivedCache.set('key', 'value', mtime);

      // Wait a bit
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shortLivedCache.get('key', mtime)).toBeNull();
          resolve();
        }, 10);
      });
    });
  });
});

describe('createCacheKey', () => {
  it('should create cache key with type and path', () => {
    expect(createCacheKey('dashboard', '/path/to/file.md')).toBe('dashboard:/path/to/file.md');
  });

  it('should handle various types', () => {
    expect(createCacheKey('roadmap', '/data/roadmap.md')).toBe('roadmap:/data/roadmap.md');
    expect(createCacheKey('blockers', '/data/blockers.md')).toBe('blockers:/data/blockers.md');
    expect(createCacheKey('quarterly-q1', '/data/q1.md')).toBe('quarterly-q1:/data/q1.md');
  });
});
