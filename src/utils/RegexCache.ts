/**
 * RegexCache - Caches compiled regular expressions for performance
 * Part of plugin-optimization-v3
 *
 * Pre-compiles and caches regex patterns to avoid repeated compilation
 * during task parsing. Provides error tracking for invalid patterns.
 */

import { logger } from './logger';

export interface RegexCacheStats {
  /** Number of cached patterns */
  cached: number;
  /** Number of failed compilations */
  errors: number;
  /** Cache hit count */
  hits: number;
  /** Cache miss count */
  misses: number;
}

export interface CompiledPattern {
  pattern: string;
  flags: string;
  regex: RegExp;
}

/**
 * Caches compiled RegExp objects to improve parsing performance.
 * Tracks compilation errors and provides statistics.
 */
export class RegexCache {
  private cache: Map<string, RegExp> = new Map();
  private errors: Map<string, string> = new Map();
  private hits: number = 0;
  private misses: number = 0;

  /**
   * Get or create a compiled regex from the cache.
   * Returns null if the pattern is invalid.
   *
   * @param pattern - Regex pattern string
   * @param flags - Optional regex flags (default: 'g')
   * @returns Compiled RegExp or null if invalid
   */
  get(pattern: string, flags: string = 'g'): RegExp | null {
    const key = this.makeKey(pattern, flags);

    // Check if already cached
    if (this.cache.has(key)) {
      this.hits++;
      const cached = this.cache.get(key)!;
      // Only clone for stateful flags (g/y) that track lastIndex
      if (cached.global || cached.sticky) {
        return new RegExp(cached.source, cached.flags);
      }
      return cached;
    }

    // Check if previously failed
    if (this.errors.has(key)) {
      return null;
    }

    // Try to compile
    this.misses++;
    try {
      const regex = new RegExp(pattern, flags);
      this.cache.set(key, regex);
      // Return clone for stateful flags, original otherwise
      if (regex.global || regex.sticky) {
        return new RegExp(regex.source, regex.flags);
      }
      return regex;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.errors.set(key, errorMessage);
      logger.warn(`[RegexCache] Invalid pattern: ${pattern} - ${errorMessage}`);
      return null;
    }
  }

  /**
   * Pre-compile multiple patterns at once.
   * Useful for initializing all patterns on plugin load.
   *
   * @param patterns - Array of patterns to compile
   * @returns Number of successfully compiled patterns
   */
  precompile(patterns: Array<{ pattern: string; flags?: string }>): number {
    let successCount = 0;
    for (const { pattern, flags } of patterns) {
      if (this.get(pattern, flags || 'g') !== null) {
        successCount++;
      }
    }
    return successCount;
  }

  /**
   * Check if a pattern is valid without caching it permanently.
   *
   * @param pattern - Regex pattern to test
   * @param flags - Optional regex flags
   * @returns True if pattern is valid
   */
  isValid(pattern: string, flags?: string): boolean {
    try {
      new RegExp(pattern, flags);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the error message for a failed pattern.
   *
   * @param pattern - Pattern that failed
   * @param flags - Flags used
   * @returns Error message or undefined if no error
   */
  getError(pattern: string, flags: string = 'g'): string | undefined {
    return this.errors.get(this.makeKey(pattern, flags));
  }

  /**
   * Get all failed patterns with their error messages.
   */
  getErrors(): Map<string, string> {
    return new Map(this.errors);
  }

  /**
   * Clear all cached patterns and errors.
   */
  clear(): void {
    this.cache.clear();
    this.errors.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics.
   */
  getStats(): RegexCacheStats {
    return {
      cached: this.cache.size,
      errors: this.errors.size,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * Get all successfully compiled patterns.
   */
  getCompiledPatterns(): CompiledPattern[] {
    const patterns: CompiledPattern[] = [];
    for (const [key, regex] of this.cache.entries()) {
      const [pattern, flags] = this.parseKey(key);
      patterns.push({ pattern, flags, regex });
    }
    return patterns;
  }

  /**
   * Create a unique cache key for pattern + flags combination.
   */
  private makeKey(pattern: string, flags: string): string {
    return `${pattern}:::${flags}`;
  }

  /**
   * Parse a cache key back to pattern and flags.
   */
  private parseKey(key: string): [string, string] {
    const parts = key.split(':::');
    return [parts[0], parts[1] || ''];
  }
}

/**
 * Default patterns commonly used in Obsidian task parsing.
 * Pre-compile these on plugin initialization.
 */
export const DEFAULT_PATTERNS = [
  // Checkbox patterns
  { pattern: '^\\s*-\\s*\\[([ xX])\\]\\s+(.+)$', flags: 'gm' },

  // Priority indicators
  { pattern: '⏫', flags: 'g' },
  { pattern: '🔼', flags: 'g' },
  { pattern: '🔽', flags: 'g' },
  { pattern: '#P[012]', flags: 'gi' },
  { pattern: '\\[P[012]\\]', flags: 'gi' },
  { pattern: '\\(P[012]\\)', flags: 'gi' },
  { pattern: '\\[!\\]', flags: 'g' },
  { pattern: '!!', flags: 'g' },
  { pattern: 'priority::\\s*(P[012]|high|medium|low)', flags: 'gi' },

  // Date patterns
  { pattern: '📅\\s*(\\d{4}-\\d{2}-\\d{2})', flags: 'g' },
  { pattern: 'due::\\s*(\\d{4}-\\d{2}-\\d{2})', flags: 'gi' },
  { pattern: '@due\\((\\d{4}-\\d{2}-\\d{2})\\)', flags: 'gi' },

  // Owner patterns
  { pattern: '👤\\s*(\\w+)', flags: 'g' },
  { pattern: '@(\\w+)(?![:/])', flags: 'g' },
  { pattern: 'assignee::\\s*(\\w+)', flags: 'gi' },
  { pattern: 'owner::\\s*(\\w+)', flags: 'gi' },

  // Time estimation patterns
  { pattern: '⏱️\\s*(\\d+[hmd])', flags: 'g' },
  { pattern: 'estimate::\\s*(\\d+\\s*(?:hours?|mins?|minutes?|days?))', flags: 'gi' },

  // Recurrence patterns
  { pattern: '🔁\\s*(daily|weekly|monthly|yearly)', flags: 'gi' },
  { pattern: 'repeat::\\s*(daily|weekly|monthly|yearly)', flags: 'gi' },

  // Tag patterns
  { pattern: '#([\\w/-]+)', flags: 'g' },

  // Dataview inline field pattern
  { pattern: '(\\w+)::\\s*([^\\n\\]]+?)(?=\\s*(?:\\[|$|\\n))', flags: 'g' },
];

/**
 * Singleton instance for global use
 */
let globalCache: RegexCache | null = null;

/**
 * Get the global RegexCache instance.
 * Creates one if it doesn't exist.
 */
export function getGlobalRegexCache(): RegexCache {
  if (!globalCache) {
    globalCache = new RegexCache();
    // Pre-compile default patterns
    globalCache.precompile(DEFAULT_PATTERNS);
  }
  return globalCache;
}

/**
 * Reset the global cache (useful for testing).
 */
export function resetGlobalRegexCache(): void {
  globalCache = null;
}
