/**
 * Parsing Types for Enhanced Error Handling
 * Part of plugin-optimization-v3
 *
 * Provides structured error/warning types and ParseResult wrapper
 * for better visibility into parsing issues.
 */

/**
 * Types of parsing errors that can occur
 */
export type ParseErrorType =
  | 'invalid_regex'       // Regex pattern compilation failed
  | 'malformed_date'      // Date format couldn't be parsed
  | 'malformed_task'      // Task line structure is invalid
  | 'missing_file'        // Source file not found
  | 'invalid_frontmatter' // YAML frontmatter parsing failed
  | 'invalid_table'       // Table structure is malformed
  | 'encoding_error'      // Character encoding issue
  | 'unknown';            // Unclassified error

/**
 * Types of parsing warnings (non-fatal issues)
 */
export type ParseWarningType =
  | 'missing_priority'    // Task has no priority indicator
  | 'missing_date'        // Task has no due date
  | 'missing_owner'       // Task has no assignee
  | 'ambiguous_date'      // Date format is unclear
  | 'duplicate_field'     // Same field appears twice
  | 'unknown_status'      // Status indicator not recognized
  | 'deprecated_format'   // Using old/deprecated syntax
  | 'truncated_content';  // Content may have been cut off

/**
 * Represents a parsing error with context
 */
export interface ParseError {
  /** Error classification */
  type: ParseErrorType;
  /** Human-readable error message */
  message: string;
  /** Line number where error occurred (1-indexed) */
  line?: number;
  /** Column number where error occurred */
  column?: number;
  /** Source file or section name */
  source?: string;
  /** Suggested fix or alternative */
  suggestion?: string;
  /** Original text that caused the error */
  originalText?: string;
}

/**
 * Represents a parsing warning (non-fatal issue)
 */
export interface ParseWarning {
  /** Warning classification */
  type: ParseWarningType;
  /** Human-readable warning message */
  message: string;
  /** Line number where warning applies */
  line?: number;
  /** Source file or section name */
  source?: string;
  /** Suggested improvement */
  suggestion?: string;
}

/**
 * Statistics about the parsing operation
 */
export interface ParseStats {
  /** Total items processed */
  totalProcessed: number;
  /** Successfully parsed items */
  successCount: number;
  /** Items with errors (not included in result) */
  errorCount: number;
  /** Items with warnings (included in result) */
  warningCount: number;
  /** Parsing duration in milliseconds */
  durationMs: number;
  /** Lines processed */
  linesProcessed: number;
  /** Bytes processed */
  bytesProcessed?: number;
}

/**
 * Generic wrapper for parsing results with error tracking.
 * All parsing operations should return this type.
 *
 * @template T The type of successfully parsed data
 */
export interface ParseResult<T> {
  /** Parsed data (may be partial if errors occurred) */
  data: T;
  /** Fatal errors that prevented parsing */
  errors: ParseError[];
  /** Non-fatal warnings */
  warnings: ParseWarning[];
  /** Parsing statistics */
  stats: ParseStats;
}

/**
 * Create an empty ParseResult with default values
 */
export function emptyParseResult<T>(data: T): ParseResult<T> {
  return {
    data,
    errors: [],
    warnings: [],
    stats: {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      warningCount: 0,
      durationMs: 0,
      linesProcessed: 0,
    },
  };
}

/**
 * Create a ParseResult with an error
 */
export function errorResult<T>(
  data: T,
  error: ParseError
): ParseResult<T> {
  return {
    data,
    errors: [error],
    warnings: [],
    stats: {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 1,
      warningCount: 0,
      durationMs: 0,
      linesProcessed: 0,
    },
  };
}

/**
 * Create a simple ParseError object
 */
export function createParseError(
  type: ParseErrorType,
  message: string,
  options?: Partial<Omit<ParseError, 'type' | 'message'>>
): ParseError {
  return {
    type,
    message,
    ...options,
  };
}

/**
 * Create a simple ParseWarning object
 */
export function createParseWarning(
  type: ParseWarningType,
  message: string,
  options?: Partial<Omit<ParseWarning, 'type' | 'message'>>
): ParseWarning {
  return {
    type,
    message,
    ...options,
  };
}

/**
 * Merge multiple ParseResults into one
 */
export function mergeParseResults<T>(
  results: ParseResult<T>[],
  mergeData: (items: T[]) => T
): ParseResult<T> {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];
  const dataItems: T[] = [];

  let totalProcessed = 0;
  let successCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let durationMs = 0;
  let linesProcessed = 0;

  for (const result of results) {
    dataItems.push(result.data);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    totalProcessed += result.stats.totalProcessed;
    successCount += result.stats.successCount;
    errorCount += result.stats.errorCount;
    warningCount += result.stats.warningCount;
    durationMs += result.stats.durationMs;
    linesProcessed += result.stats.linesProcessed;
  }

  return {
    data: mergeData(dataItems),
    errors,
    warnings,
    stats: {
      totalProcessed,
      successCount,
      errorCount,
      warningCount,
      durationMs,
      linesProcessed,
    },
  };
}

/**
 * Check if a ParseResult has any errors
 */
export function hasErrors<T>(result: ParseResult<T>): boolean {
  return result.errors.length > 0;
}

/**
 * Check if a ParseResult has any warnings
 */
export function hasWarnings<T>(result: ParseResult<T>): boolean {
  return result.warnings.length > 0;
}

/**
 * Format errors for display in a Notice
 */
export function formatErrorsForDisplay(errors: ParseError[]): string {
  if (errors.length === 0) return '';

  const lines = [`Found ${errors.length} parsing error(s):`];
  for (const error of errors.slice(0, 5)) {
    const location = error.line ? ` (line ${error.line})` : '';
    lines.push(`• ${error.message}${location}`);
    if (error.suggestion) {
      lines.push(`  → ${error.suggestion}`);
    }
  }

  if (errors.length > 5) {
    lines.push(`... and ${errors.length - 5} more`);
  }

  return lines.join('\n');
}

/**
 * Format warnings for display
 */
export function formatWarningsForDisplay(warnings: ParseWarning[]): string {
  if (warnings.length === 0) return '';

  const lines = [`${warnings.length} warning(s):`];
  for (const warning of warnings.slice(0, 3)) {
    const location = warning.line ? ` (line ${warning.line})` : '';
    lines.push(`• ${warning.message}${location}`);
  }

  if (warnings.length > 3) {
    lines.push(`... and ${warnings.length - 3} more`);
  }

  return lines.join('\n');
}

/**
 * Task-specific parse result type
 */
export interface TaskParseResult {
  /** Successfully parsed task */
  task: import('./models').Task | null;
  /** Error if task couldn't be parsed */
  error?: ParseError;
  /** Warnings about the task */
  warnings: ParseWarning[];
  /** Line number in source file */
  lineNumber: number;
}

/**
 * Executive Summary data structure
 */
export interface ExecutiveSummary {
  /** Report title */
  reportTitle: string;
  /** Date range covered */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Generation timestamp */
  generatedAt: Date;
  /** Key Performance Indicators */
  kpis: {
    totalTasks: number;
    completedTasks: number;
    activeBlockers: number;
    totalFeatures: number;
    completionRate: number;
  };
  /** Breakdown by priority level */
  priorityBreakdown: {
    p0: { total: number; completed: number };
    p1: { total: number; completed: number };
    p2: { total: number; completed: number };
  };
  /** Top blockers requiring attention */
  topBlockers: Array<{
    id: string;
    title: string;
    priority: string;
    daysOpen: number;
  }>;
  /** Tasks due within 7 days */
  upcomingDeadlines: Array<{
    task: string;
    dueDate: Date;
    owner?: string;
    priority: import('./models').Priority;
  }>;
  /** Workload distribution by owner */
  teamWorkload: Array<{
    owner: string;
    taskCount: number;
    completedCount: number;
  }>;
}

/**
 * Recurrence frequency types
 */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Recurrence configuration for repeating tasks
 */
export interface Recurrence {
  /** How often the task repeats */
  frequency: RecurrenceFrequency;
  /** Interval multiplier (e.g., every 2 weeks) */
  interval?: number;
  /** Specific days (for weekly: 0=Sun, 6=Sat) */
  days?: number[];
  /** End date for recurrence */
  endDate?: Date;
}
