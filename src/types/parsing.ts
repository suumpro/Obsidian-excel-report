/**
 * Parsing Types
 * Executive summary, recurrence types for reports and task parsing.
 */

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
