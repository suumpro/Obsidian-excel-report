/**
 * Unit tests for dateUtils
 */

import {
  getWeekNumber,
  getQuarter,
  formatDate,
  getCurrentWeekInfo,
  getCurrentQuarterInfo,
  parseDate,
  isOverdue,
  isThisWeek,
} from '../src/utils/dateUtils';

describe('dateUtils', () => {
  describe('getWeekNumber', () => {
    it('should return week 1 for January 1st, 2024', () => {
      const date = new Date(2024, 0, 1); // Jan 1, 2024
      const week = getWeekNumber(date);
      expect(week).toBe(1);
    });

    it('should return correct week for mid-year date', () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      const week = getWeekNumber(date);
      expect(week).toBeGreaterThan(20);
      expect(week).toBeLessThan(30);
    });

    it('should handle year boundary correctly', () => {
      const date = new Date(2024, 11, 31); // Dec 31, 2024
      const week = getWeekNumber(date);
      expect(week).toBeGreaterThanOrEqual(1);
      expect(week).toBeLessThanOrEqual(53);
    });

    it('should use current date when no argument provided', () => {
      const week = getWeekNumber();
      expect(week).toBeGreaterThanOrEqual(1);
      expect(week).toBeLessThanOrEqual(53);
    });
  });

  describe('getQuarter', () => {
    it('should return 1 for Q1 months (Jan-Mar)', () => {
      expect(getQuarter(new Date(2024, 0, 15))).toBe(1); // Jan
      expect(getQuarter(new Date(2024, 1, 15))).toBe(1); // Feb
      expect(getQuarter(new Date(2024, 2, 15))).toBe(1); // Mar
    });

    it('should return 2 for Q2 months (Apr-Jun)', () => {
      expect(getQuarter(new Date(2024, 3, 15))).toBe(2); // Apr
      expect(getQuarter(new Date(2024, 4, 15))).toBe(2); // May
      expect(getQuarter(new Date(2024, 5, 15))).toBe(2); // Jun
    });

    it('should return 3 for Q3 months (Jul-Sep)', () => {
      expect(getQuarter(new Date(2024, 6, 15))).toBe(3); // Jul
      expect(getQuarter(new Date(2024, 7, 15))).toBe(3); // Aug
      expect(getQuarter(new Date(2024, 8, 15))).toBe(3); // Sep
    });

    it('should return 4 for Q4 months (Oct-Dec)', () => {
      expect(getQuarter(new Date(2024, 9, 15))).toBe(4);  // Oct
      expect(getQuarter(new Date(2024, 10, 15))).toBe(4); // Nov
      expect(getQuarter(new Date(2024, 11, 15))).toBe(4); // Dec
    });

    it('should use current date when no argument provided', () => {
      const quarter = getQuarter();
      expect(quarter).toBeGreaterThanOrEqual(1);
      expect(quarter).toBeLessThanOrEqual(4);
    });
  });

  describe('formatDate', () => {
    it('should format date with default YYYY-MM-DD format', () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      expect(formatDate(date)).toBe('2024-06-15');
    });

    it('should format date with custom format', () => {
      const date = new Date(2024, 5, 15);
      expect(formatDate(date, 'YYYY/MM/DD')).toBe('2024/06/15');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(2024, 0, 5); // Jan 5, 2024
      expect(formatDate(date)).toBe('2024-01-05');
    });
  });

  describe('getCurrentWeekInfo', () => {
    it('should return valid WeekInfo object', () => {
      const info = getCurrentWeekInfo();

      expect(info).toHaveProperty('weekNumber');
      expect(info).toHaveProperty('year');
      expect(info).toHaveProperty('formattedWeek');
      expect(info).toHaveProperty('formattedDate');

      expect(info.weekNumber).toBeGreaterThanOrEqual(1);
      expect(info.weekNumber).toBeLessThanOrEqual(53);
      expect(info.year).toBeGreaterThanOrEqual(2020);
      expect(info.formattedWeek).toMatch(/^W\d+$/);
      expect(info.formattedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getCurrentQuarterInfo', () => {
    it('should return valid QuarterInfo object', () => {
      const info = getCurrentQuarterInfo();

      expect(info).toHaveProperty('quarter');
      expect(info).toHaveProperty('year');
      expect(info).toHaveProperty('formattedQuarter');
      expect(info).toHaveProperty('formattedDate');

      expect(info.quarter).toBeGreaterThanOrEqual(1);
      expect(info.quarter).toBeLessThanOrEqual(4);
      expect(info.year).toBeGreaterThanOrEqual(2020);
      expect(info.formattedQuarter).toMatch(/^Q[1-4]$/);
      expect(info.formattedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('parseDate', () => {
    it('should parse ISO format (YYYY-MM-DD)', () => {
      const result = parseDate('2024-06-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(5); // 0-indexed
      expect(result?.getDate()).toBe(15);
    });

    it('should parse MM/DD format', () => {
      const result = parseDate('6/15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getMonth()).toBe(5);
      expect(result?.getDate()).toBe(15);
    });

    it('should parse M/D format (single digits)', () => {
      const result = parseDate('1/5');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(5);
    });

    it('should return null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('abc123')).toBeNull();
    });
  });

  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 days ago
      expect(isOverdue(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
      expect(isOverdue(futureDate)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isOverdue(null)).toBe(false);
    });
  });

  describe('isThisWeek', () => {
    it('should return true for today', () => {
      expect(isThisWeek(new Date())).toBe(true);
    });

    it('should return false for dates far in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      expect(isThisWeek(pastDate)).toBe(false);
    });

    it('should return false for dates far in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      expect(isThisWeek(futureDate)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isThisWeek(null)).toBe(false);
    });
  });
});
