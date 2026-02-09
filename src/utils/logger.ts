/**
 * Logging utilities
 * Enhanced in v3 with ParseResult error display
 */

import { Notice } from 'obsidian';

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
 * Show progress notice (returns Notice for manual hiding)
 */
export function showProgress(message: string): Notice {
  return new Notice(`${message}`, 0); // 0 = don't auto-hide
}

