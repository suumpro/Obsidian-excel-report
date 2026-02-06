/**
 * Error handling utilities
 * Provides consistent error handling across the plugin
 */

import { Notice } from 'obsidian';
import { PluginError, isPluginError, isRecoverable } from './PluginErrors';
import { logger } from '../utils/logger';

/**
 * Error handler options
 */
export interface ErrorHandlerOptions {
  /** Context string for logging (e.g., "generateWeeklyReport") */
  context?: string;
  /** Whether to show user notification */
  showNotice?: boolean;
  /** Custom notice duration in ms */
  noticeDuration?: number;
  /** Whether to rethrow the error after handling */
  rethrow?: boolean;
}

const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  showNotice: true,
  noticeDuration: 5000,
  rethrow: false,
};

/**
 * Handle plugin errors with appropriate user feedback and logging
 *
 * @param error The error to handle
 * @param options Handler options
 */
export function handleError(error: unknown, options: ErrorHandlerOptions = {}): void {
  const opts = Object.assign({}, DEFAULT_OPTIONS, options);
  const contextStr = opts.context ? ` in ${opts.context}` : '';

  if (isPluginError(error)) {
    // Log with full details
    logger.error(`[${error.code}]${contextStr}: ${error.message}`);
    if (error.cause) {
      logger.error(`Caused by: ${error.cause.message}`);
    }

    // Show user-friendly message
    if (opts.showNotice) {
      new Notice(error.userMessage, opts.noticeDuration);
    }

    // Log recovery hint
    if (error.recoverable) {
      logger.info(`Error is recoverable, fallback data may be used`);
    }
  } else if (error instanceof Error) {
    logger.error(`Unexpected error${contextStr}: ${error.message}`);
    if (opts.showNotice) {
      new Notice(`오류가 발생했습니다: ${error.message}`, opts.noticeDuration);
    }
  } else {
    logger.error(`Unknown error${contextStr}: ${String(error)}`);
    if (opts.showNotice) {
      new Notice('알 수 없는 오류가 발생했습니다', opts.noticeDuration);
    }
  }

  if (opts.rethrow) {
    throw error;
  }
}

/**
 * Wrap an async function with error handling
 *
 * @param fn Async function to wrap
 * @param context Context for error messages
 * @param fallback Fallback value to return on error (makes error "silent" for flow)
 * @returns Result of fn or fallback on error
 *
 * @example
 * const data = await withErrorHandling(
 *   () => loadDashboardData(),
 *   'loadDashboardData',
 *   emptyDashboardData()
 * );
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const opts: ErrorHandlerOptions = {
      context,
      showNotice: fallback === undefined, // Only show notice if no fallback
    };
    handleError(error, opts);

    if (fallback !== undefined) {
      logger.debug(`Using fallback value for ${context}`);
      return fallback;
    }

    throw error;
  }
}

/**
 * Wrap a sync function with error handling
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  context: string,
  fallback?: T
): T {
  try {
    return fn();
  } catch (error) {
    handleError(error, {
      context,
      showNotice: fallback === undefined,
    });

    if (fallback !== undefined) {
      logger.debug(`Using fallback value for ${context}`);
      return fallback;
    }

    throw error;
  }
}

/**
 * Create a safe wrapper that catches errors and returns a Result type
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export async function trySafe<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export function trySafeSync<T>(fn: () => T): Result<T> {
  try {
    const data = fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param baseDelay Base delay in ms (will be multiplied by 2^attempt)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry non-recoverable errors
      if (!isRecoverable(error) && isPluginError(error)) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
