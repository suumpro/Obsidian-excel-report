/**
 * Unit tests for TaskParser
 */

import { TaskParser } from '../src/services/parsers/TaskParser';
import { DEFAULT_PARSING_RULES } from '../src/services/parsers/types';
import { RegexCache } from '../src/utils/RegexCache';

describe('TaskParser', () => {
  let parser: TaskParser;
  let cache: RegexCache;

  beforeEach(() => {
    cache = new RegexCache();
    parser = new TaskParser(DEFAULT_PARSING_RULES, cache);
  });

  describe('extractInlineFields', () => {
    it('should extract dataview-style inline fields', () => {
      // Bracket-wrapped format is excluded by regex [^\n\]]+? — use bare format
      const text = 'owner:: @john due:: 2026-03-01';
      const fields = parser.extractInlineFields(text);

      expect(fields['owner']).toBe('@john');
      expect(fields['due']).toBe('2026-03-01');
    });

    it('should return empty object for no fields', () => {
      const fields = parser.extractInlineFields('Just a regular text');
      expect(fields).toEqual({});
    });

    it('should handle multiple fields on one line', () => {
      const text = 'priority:: high status:: done area:: backend';
      const fields = parser.extractInlineFields(text);

      expect(fields['priority']).toBe('high');
      expect(fields['status']).toBe('done');
    });
  });

  describe('extractEstimatedTime', () => {
    it('should extract emoji time estimate', () => {
      expect(parser.extractEstimatedTime('Task ⏱️ 2h')).toBe('2h');
      expect(parser.extractEstimatedTime('Task ⏱️ 30m')).toBe('30m');
      expect(parser.extractEstimatedTime('Task ⏱️ 1d')).toBe('1d');
    });

    it('should extract inline field time estimate and normalize', () => {
      expect(parser.extractEstimatedTime('estimate:: 3 hours')).toBe('3h');
      expect(parser.extractEstimatedTime('estimate:: 30 mins')).toBe('30m');
      expect(parser.extractEstimatedTime('estimate:: 2 days')).toBe('2d');
      expect(parser.extractEstimatedTime('estimate:: 45 minutes')).toBe('45m');
    });

    it('should return undefined for no estimate', () => {
      expect(parser.extractEstimatedTime('Regular task')).toBeUndefined();
    });
  });

  describe('extractRecurrence', () => {
    it('should extract emoji recurrence', () => {
      const result = parser.extractRecurrence('Task 🔁 weekly');
      expect(result).toEqual({ frequency: 'weekly' });
    });

    it('should extract inline field recurrence', () => {
      const result = parser.extractRecurrence('repeat:: monthly');
      expect(result).toEqual({ frequency: 'monthly' });
    });

    it('should handle all frequency types', () => {
      expect(parser.extractRecurrence('🔁 daily')?.frequency).toBe('daily');
      expect(parser.extractRecurrence('🔁 yearly')?.frequency).toBe('yearly');
    });

    it('should return undefined for no recurrence', () => {
      expect(parser.extractRecurrence('Regular task')).toBeUndefined();
    });
  });

  describe('extractContext', () => {
    it('should extract context tags', () => {
      expect(parser.extractContext('Task @work')).toBe('@work');
      expect(parser.extractContext('Fix @home issue')).toBe('@home');
      expect(parser.extractContext('Call @phone')).toBe('@phone');
    });

    it('should return undefined for no context', () => {
      expect(parser.extractContext('Regular task')).toBeUndefined();
    });
  });

  describe('extractTaskExtensions', () => {
    it('should extract JIRA ID', () => {
      const ext = parser.extractTaskExtensions('🔗 SA-123 task');
      expect(ext.jiraId).toBe('SA-123');
    });

    it('should extract start date', () => {
      const ext = parser.extractTaskExtensions('🛠️ 2026-03-01 task');
      expect(ext.startDate).toBe('2026-03-01');
    });

    it('should extract quarter tag', () => {
      const ext = parser.extractTaskExtensions('#q1/p0 task');
      expect(ext.quarterTag).toBe('q1/p0');
    });

    it('should return empty for no extensions', () => {
      const ext = parser.extractTaskExtensions('plain task');
      expect(ext.jiraId).toBeUndefined();
      expect(ext.startDate).toBeUndefined();
    });
  });

  describe('extractTasks with filters', () => {
    it('should filter by in_progress status', () => {
      const content = `
- [/] In progress task
- [x] Completed task
- [ ] Pending task
`;

      const inProgress = parser.extractTasks(content, { status: 'in_progress' });
      expect(inProgress).toHaveLength(1);
      expect(inProgress[0].status).toBe('in_progress');
    });
  });
});
