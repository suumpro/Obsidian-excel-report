/**
 * Logging utilities
 * Enhanced in v3 with ParseResult error display
 */

import { Notice } from 'obsidian';
import { ParseResult, ParseError, ParseWarning, formatErrorsForDisplay, formatWarningsForDisplay } from '../types/parsing';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Logger class for the plugin
 */
export class Logger {
  private prefix = '[ExcelAutomation]';
  private level: LogLevel;

  constructor(level: LogLevel = 'INFO') {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('DEBUG')) {
      console.debug(`${this.prefix} [DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('INFO')) {
      console.log(`${this.prefix} ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('WARN')) {
      console.warn(`${this.prefix} [WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('ERROR')) {
      console.error(`${this.prefix} [ERROR] ${message}`, ...args);
    }
  }
}

// Global logger instance
export const logger = new Logger();

/**
 * Show success notice to user
 */
export function showSuccess(message: string): void {
  new Notice(`${message}`);
}

/**
 * Show error notice to user (longer duration)
 */
export function showError(message: string): void {
  new Notice(`${message}`, 5000);
}

/**
 * Show warning notice to user
 */
export function showWarning(message: string): void {
  new Notice(`${message}`, 3000);
}

/**
 * Show progress notice (returns Notice for manual hiding)
 */
export function showProgress(message: string): Notice {
  return new Notice(`${message}`, 0); // 0 = don't auto-hide
}

/**
 * Display parsing errors from a ParseResult to the user
 * Shows a Notice with formatted error messages
 */
export function showParseErrors<T>(result: ParseResult<T>): void {
  if (result.errors.length === 0) return;

  const message = formatErrorsForDisplay(result.errors);
  new Notice(`⚠️ Parsing Errors\n${message}`, 8000);

  // Also log to console for debugging
  logger.error('Parsing errors:', result.errors);
}

/**
 * Display parsing warnings from a ParseResult to the user
 * Shows a Notice with formatted warning messages
 */
export function showParseWarnings<T>(result: ParseResult<T>): void {
  if (result.warnings.length === 0) return;

  const message = formatWarningsForDisplay(result.warnings);
  new Notice(`ℹ️ Parsing Warnings\n${message}`, 5000);

  // Also log to console for debugging
  logger.warn('Parsing warnings:', result.warnings);
}

/**
 * Display parsing results summary
 * Shows errors if any, otherwise shows success with stats
 */
export function showParseResult<T>(result: ParseResult<T>, successMessage: string): void {
  if (result.errors.length > 0) {
    showParseErrors(result);
    return;
  }

  // Show success with stats
  const statsMsg = `${successMessage} (${result.stats.successCount} items, ${result.stats.durationMs}ms)`;
  showSuccess(statsMsg);

  // Show warnings if any (after success)
  if (result.warnings.length > 0) {
    showParseWarnings(result);
  }
}

/**
 * Log parsing statistics for debugging
 */
export function logParseStats<T>(result: ParseResult<T>, context: string): void {
  const { stats } = result;
  logger.debug(`[${context}] Parse stats:`, {
    totalProcessed: stats.totalProcessed,
    successCount: stats.successCount,
    errorCount: stats.errorCount,
    warningCount: stats.warningCount,
    durationMs: stats.durationMs,
    linesProcessed: stats.linesProcessed,
  });
}

/**
 * Create a detailed error report for debugging
 * Returns a formatted string suitable for console or file output
 */
export function createParseErrorReport<T>(result: ParseResult<T>, title: string): string {
  const lines: string[] = [
    `=== ${title} ===`,
    `Processed: ${result.stats.totalProcessed} items`,
    `Success: ${result.stats.successCount} items`,
    `Errors: ${result.stats.errorCount}`,
    `Warnings: ${result.stats.warningCount}`,
    `Duration: ${result.stats.durationMs}ms`,
    '',
  ];

  if (result.errors.length > 0) {
    lines.push('--- ERRORS ---');
    for (const error of result.errors) {
      const location = error.line ? ` (line ${error.line})` : '';
      lines.push(`[${error.type}]${location}: ${error.message}`);
      if (error.suggestion) {
        lines.push(`  Suggestion: ${error.suggestion}`);
      }
      if (error.originalText) {
        lines.push(`  Original: ${error.originalText.substring(0, 100)}...`);
      }
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('--- WARNINGS ---');
    for (const warning of result.warnings) {
      const location = warning.line ? ` (line ${warning.line})` : '';
      lines.push(`[${warning.type}]${location}: ${warning.message}`);
    }
  }

  return lines.join('\n');
}
