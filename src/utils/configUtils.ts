/**
 * Configuration Utilities
 * Helper functions for config validation, merging, and manipulation
 */

import {
  PluginConfig,
  ConfigValidationResult,
  LocaleCode,
} from '../types/config';

/**
 * Deep merge two objects, with source taking precedence
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>, overrides?: Partial<T>): T {
  const result = { ...target } as Record<string, unknown>;

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = (target as Record<string, unknown>)[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Partial<Record<string, unknown>>);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    }
  }

  if (overrides) {
    for (const key in overrides) {
      if (overrides.hasOwnProperty(key) && overrides[key] !== undefined) {
        result[key] = overrides[key];
      }
    }
  }

  return result as T;
}

/**
 * Check if value is a plain object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate a plugin configuration
 */
export function validateConfig(config: unknown): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config must be an object'], warnings: [] };
  }

  const cfg = config as Partial<PluginConfig>;

  // Version check
  if (!cfg.version) {
    errors.push('Missing version field');
  }

  // Locale check
  if (!cfg.locale) {
    warnings.push('Missing locale, will use default');
  } else if (!isValidLocale(cfg.locale)) {
    errors.push(`Invalid locale: ${cfg.locale}`);
  }

  // Locale strings check
  if (!cfg.localeStrings) {
    errors.push('Missing localeStrings');
  } else {
    validateLocaleStrings(cfg.localeStrings, errors, warnings);
  }

  // Parsing config check
  if (!cfg.parsing) {
    errors.push('Missing parsing configuration');
  } else {
    validateParsingConfig(cfg.parsing, errors, warnings);
  }

  // Reports config check
  if (!cfg.reports) {
    errors.push('Missing reports configuration');
  }

  // Style config check
  if (!cfg.style) {
    warnings.push('Missing style configuration, will use defaults');
  } else {
    validateStyleConfig(cfg.style, errors, warnings);
  }

  // Sources check
  if (!cfg.sources) {
    warnings.push('Missing sources configuration');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function isValidLocale(locale: string): locale is LocaleCode {
  return ['en', 'ko', 'ja', 'zh', 'custom'].includes(locale);
}

function validateLocaleStrings(
  strings: any,
  errors: string[],
  warnings: string[]
): void {
  const requiredSections = ['reports', 'sheets', 'columns', 'kpi', 'status', 'priority'];

  for (const section of requiredSections) {
    if (!strings[section]) {
      errors.push(`Missing localeStrings.${section}`);
    }
  }

  // Check specific required fields
  if (strings.sheets) {
    const requiredSheets = ['weeklySummary', 'roadmapProgress', 'taskDetails'];
    for (const sheet of requiredSheets) {
      if (!strings.sheets[sheet]) {
        warnings.push(`Missing sheet name: ${sheet}`);
      }
    }
  }
}

function validateParsingConfig(
  parsing: any,
  errors: string[],
  warnings: string[]
): void {
  if (!parsing.task) {
    errors.push('Missing parsing.task configuration');
  } else {
    if (!parsing.task.priorityIndicators) {
      errors.push('Missing task priority indicators');
    }
    if (!parsing.task.statusIndicators) {
      errors.push('Missing task status indicators');
    }
  }

  if (!parsing.feature) {
    warnings.push('Missing parsing.feature configuration');
  }

  if (!parsing.blocker) {
    warnings.push('Missing parsing.blocker configuration');
  }
}

function validateStyleConfig(
  style: any,
  errors: string[],
  _warnings: string[]
): void {
  if (style.colors) {
    // Validate hex colors
    const colorFields = ['headerBackground', 'subheaderBackground'];
    for (const field of colorFields) {
      if (style.colors[field] && !isValidHexColor(style.colors[field])) {
        errors.push(`Invalid hex color for ${field}: ${style.colors[field]}`);
      }
    }
  }
}

/**
 * Validate hex color format
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Safe regex pattern creation with fallback
 */
export function createSafeRegex(pattern: string, flags?: string): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

/**
 * Check if a string matches any pattern in an array
 * Supports both simple strings and regex patterns (prefixed with /)
 */
export function matchesAny(text: string, patterns: string[]): boolean {
  const lowerText = text.toLowerCase();

  return patterns.some(pattern => {
    // Check if it's a regex pattern
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      const regex = createSafeRegex(pattern.slice(1, -1), 'i');
      return regex ? regex.test(text) : false;
    }
    // Simple case-insensitive string match
    return lowerText.includes(pattern.toLowerCase());
  });
}


/**
 * Clone a configuration object (deep copy)
 */
export function cloneConfig<T>(config: T): T {
  return JSON.parse(JSON.stringify(config));
}

