/**
 * Date utility functions
 * Equivalent to Python utils/date_utils.py
 */

import { WeekInfo, QuarterInfo } from '../types/models';

/**
 * Get ISO week number for a date
 */
export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get quarter number (1-4) for a date
 */
export function getQuarter(date: Date = new Date()): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/**
 * Format date according to format string
 * Supports: YYYY, MM, DD, MMM, HH, mm, ss
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[date.getMonth()];

  return format
    .replace('YYYY', String(year))
    .replace('MMM', monthName)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Get the date range (start and end) for a given week number
 */
export function getWeekRange(weekNumber: number, year: number): { start: Date; end: Date } {
  // ISO 8601: Week 1 contains Jan 4
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Mon=1..Sun=7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1));

  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

/**
 * Get current week information
 */
export function getCurrentWeekInfo(): WeekInfo {
  const now = new Date();
  const weekNum = getWeekNumber(now);

  return {
    weekNumber: weekNum,
    year: now.getFullYear(),
    formattedWeek: `W${weekNum}`,
    formattedDate: formatDate(now),
  };
}

/**
 * Get current quarter information
 */
export function getCurrentQuarterInfo(): QuarterInfo {
  const now = new Date();
  const quarter = getQuarter(now);

  return {
    quarter,
    year: now.getFullYear(),
    formattedQuarter: `Q${quarter}`,
    formattedDate: formatDate(now),
  };
}

/**
 * Parse date string in various formats
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try ISO format: YYYY-MM-DD
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }

  // Try MM/DD format
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    const year = new Date().getFullYear();
    return new Date(year, parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
  }

  return null;
}

/**
 * Check if a date is overdue (before today)
 */
export function isOverdue(date: Date | null): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Check if a date is within the current week
 */
export function isThisWeek(date: Date | null): boolean {
  if (!date) return false;

  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay() || 7; // Sunday = 7
  startOfWeek.setDate(now.getDate() - dayOfWeek + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
}
