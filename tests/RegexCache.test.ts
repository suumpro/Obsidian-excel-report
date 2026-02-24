/**
 * Unit tests for RegexCache
 */

import { RegexCache } from '../src/utils/RegexCache';

// Mock logger to suppress warnings
jest.mock('../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    isDebugEnabled: jest.fn().mockReturnValue(false),
  },
}));

describe('RegexCache', () => {
  let cache: RegexCache;

  beforeEach(() => {
    cache = new RegexCache();
  });

  describe('get', () => {
    it('should compile and cache a valid pattern', () => {
      const regex = cache.get('\\d+', 'g');
      expect(regex).not.toBeNull();
      expect(regex!.source).toBe('\\d+');
      expect(regex!.flags).toBe('g');
    });

    it('should return null for invalid pattern', () => {
      const regex = cache.get('[invalid', 'g');
      expect(regex).toBeNull();
    });

    it('should return null for previously failed pattern', () => {
      cache.get('[invalid', 'g'); // first call stores error
      const regex = cache.get('[invalid', 'g'); // second call
      expect(regex).toBeNull();
    });

    it('should clone regex for global flag (lastIndex isolation)', () => {
      const r1 = cache.get('\\w+', 'g');
      const r2 = cache.get('\\w+', 'g');

      expect(r1).not.toBeNull();
      expect(r2).not.toBeNull();
      // Should be different instances
      expect(r1).not.toBe(r2);
    });

    it('should return same instance for non-stateful flags', () => {
      const r1 = cache.get('\\d+', 'i');
      const r2 = cache.get('\\d+', 'i');

      expect(r1).not.toBeNull();
      expect(r1).toBe(r2); // same reference
    });

    it('should track hits and misses', () => {
      cache.get('\\d+', 'g'); // miss
      cache.get('\\d+', 'g'); // hit

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(1);
    });
  });

  describe('isValid', () => {
    it('should return true for valid pattern', () => {
      expect(cache.isValid('\\d+')).toBe(true);
      expect(cache.isValid('[a-z]+', 'gi')).toBe(true);
    });

    it('should return false for invalid pattern', () => {
      expect(cache.isValid('[invalid')).toBe(false);
      expect(cache.isValid('(?P<bad>)')).toBe(false);
    });
  });

  describe('getError', () => {
    it('should return error message for failed pattern', () => {
      cache.get('[invalid', 'g');
      const error = cache.getError('[invalid', 'g');
      expect(error).toBeDefined();
      expect(typeof error).toBe('string');
    });

    it('should return undefined for valid pattern', () => {
      cache.get('\\d+', 'g');
      expect(cache.getError('\\d+', 'g')).toBeUndefined();
    });
  });

  describe('getErrors', () => {
    it('should return all errors as a map', () => {
      cache.get('[bad1', 'g');
      cache.get('[bad2', 'g');

      const errors = cache.getErrors();
      expect(errors.size).toBe(2);
    });
  });

  describe('getCompiledPatterns', () => {
    it('should return all compiled patterns', () => {
      cache.get('\\d+', 'g');
      cache.get('[a-z]+', 'i');

      const patterns = cache.getCompiledPatterns();
      expect(patterns).toHaveLength(2);
      expect(patterns[0]).toHaveProperty('pattern');
      expect(patterns[0]).toHaveProperty('flags');
      expect(patterns[0]).toHaveProperty('regex');
    });

    it('should return empty array for empty cache', () => {
      expect(cache.getCompiledPatterns()).toEqual([]);
    });
  });

  describe('precompile', () => {
    it('should compile multiple patterns and return success count', () => {
      const count = cache.precompile([
        { pattern: '\\d+', flags: 'g' },
        { pattern: '[a-z]+', flags: 'i' },
        { pattern: '[invalid' }, // should fail
      ]);

      expect(count).toBe(2);
      expect(cache.getStats().cached).toBe(2);
      expect(cache.getStats().errors).toBe(1);
    });
  });

  describe('clear', () => {
    it('should reset all state', () => {
      cache.get('\\d+', 'g');
      cache.get('[bad', 'g');

      cache.clear();

      const stats = cache.getStats();
      expect(stats.cached).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});
