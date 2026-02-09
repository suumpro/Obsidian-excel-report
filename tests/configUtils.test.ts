/**
 * Unit tests for configUtils
 */

import {
  deepMerge,
  validateConfig,
  createSafeRegex,
  matchesAny,
  cloneConfig,
} from '../src/utils/configUtils';
import type { PluginConfig } from '../src/types/config';

describe('configUtils', () => {
  describe('deepMerge', () => {
    it('should merge simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should merge nested objects', () => {
      const target = { a: { x: 1, y: 2 }, b: 3 };
      const source = { a: { y: 4, z: 5 }, c: 6 };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: { x: 1, y: 4, z: 5 }, b: 3, c: 6 });
    });

    it('should apply overrides parameter', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const overrides = { a: 10, d: 5 };
      const result = deepMerge(target, source, overrides);
      expect(result).toEqual({ a: 10, b: 3, c: 4, d: 5 });
    });

    it('should skip undefined values in source', () => {
      const target = { a: 1, b: 2 };
      const source = { b: undefined, c: 3 };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should skip undefined values in overrides', () => {
      const target = { a: 1, b: 2 };
      const source = { c: 3 };
      const overrides = { b: undefined, d: 4 };
      const result = deepMerge(target, source, overrides);
      expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    });
  });

  describe('validateConfig', () => {
    const createValidConfig = (): PluginConfig => ({
      version: '2.0',
      locale: 'ko',
      localeStrings: {
        reports: {
          weekly: '주간 리포트',
          quarterly: '분기 리포트',
          feature: '피처 리포트',
          blocker: '블로커 리포트',
        },
        sheets: {
          weeklySummary: '주간현황',
          roadmapProgress: '로드맵진척',
          taskDetails: '작업상세',
          blockerTracking: '블로커추적',
          coordination: '협의사항',
          milestones: '마일스톤',
          playbookProgress: '플레이북진척',
        },
        columns: {
          id: 'ID',
          name: '작업명',
          owner: '담당자',
          status: '상태',
        },
        kpi: {
          totalTasks: '전체 작업',
          completed: '완료',
        },
        status: {
          completed: '완료',
          inProgress: '진행중',
          pending: '대기',
        },
        priority: {
          p0: 'P0',
          p1: 'P1',
          p2: 'P2',
        },
      },
      parsing: {
        task: {
          priorityIndicators: {
            p0: ['⏫', '#P0'],
            p1: ['🔼', '#P1'],
            p2: ['🔽', '#P2'],
          },
          statusIndicators: {
            completed: ['[x]', '✅'],
            pending: ['[ ]', '⬜'],
            inProgress: ['[/]', '🔄'],
          },
        },
      },
      reports: {
        weekly: { enabled: true },
      },
      style: {
        colors: {
          headerBackground: '#4472C4',
          subheaderBackground: '#8FAADC',
        },
      },
    });

    it('should validate a valid config', () => {
      const config = createValidConfig();
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject non-object config', () => {
      const result = validateConfig(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Config must be an object');
    });

    it('should reject config missing version', () => {
      const config = createValidConfig();
      delete (config as any).version;
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing version field');
    });

    it('should reject invalid locale', () => {
      const config = createValidConfig();
      (config as any).locale = 'invalid';
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid locale: invalid');
    });

    it('should reject config missing localeStrings', () => {
      const config = createValidConfig();
      delete (config as any).localeStrings;
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing localeStrings');
    });

    it('should reject config missing localeStrings sections', () => {
      const config = createValidConfig();
      delete (config as any).localeStrings.reports;
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing localeStrings.reports');
    });

    it('should reject config missing parsing', () => {
      const config = createValidConfig();
      delete (config as any).parsing;
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing parsing configuration');
    });

    it('should reject config missing task priority indicators', () => {
      const config = createValidConfig();
      delete (config as any).parsing.task.priorityIndicators;
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing task priority indicators');
    });

    it('should reject config missing task status indicators', () => {
      const config = createValidConfig();
      delete (config as any).parsing.task.statusIndicators;
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing task status indicators');
    });

    it('should reject config missing reports', () => {
      const config = createValidConfig();
      delete (config as any).reports;
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing reports configuration');
    });

    it('should reject invalid hex color in style', () => {
      const config = createValidConfig();
      (config as any).style.colors.headerBackground = 'invalid';
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid hex color for headerBackground: invalid');
    });

    it('should warn about missing locale', () => {
      const config = createValidConfig();
      delete (config as any).locale;
      const result = validateConfig(config);
      expect(result.warnings).toContain('Missing locale, will use default');
    });

    it('should warn about missing style', () => {
      const config = createValidConfig();
      delete (config as any).style;
      const result = validateConfig(config);
      expect(result.warnings).toContain('Missing style configuration, will use defaults');
    });

    it('should warn about missing sources', () => {
      const config = createValidConfig();
      const result = validateConfig(config);
      expect(result.warnings).toContain('Missing sources configuration');
    });
  });

  describe('createSafeRegex', () => {
    it('should create valid regex', () => {
      const regex = createSafeRegex('test');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex?.test('test')).toBe(true);
    });

    it('should create regex with flags', () => {
      const regex = createSafeRegex('test', 'i');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex?.test('TEST')).toBe(true);
    });

    it('should return null for invalid regex', () => {
      const regex = createSafeRegex('[invalid');
      expect(regex).toBeNull();
    });

    it('should handle complex patterns', () => {
      const regex = createSafeRegex('📅 (\\d{4}-\\d{2}-\\d{2})');
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex?.test('📅 2024-06-15')).toBe(true);
    });
  });

  describe('matchesAny', () => {
    it('should match simple string patterns (case insensitive)', () => {
      expect(matchesAny('Task is done', ['done'])).toBe(true);
      expect(matchesAny('Task is DONE', ['done'])).toBe(true);
      expect(matchesAny('Task is pending', ['done'])).toBe(false);
    });

    it('should match multiple patterns', () => {
      expect(matchesAny('Task is complete', ['done', 'complete', 'finished'])).toBe(true);
      expect(matchesAny('Task is done', ['done', 'complete', 'finished'])).toBe(true);
      expect(matchesAny('Task is pending', ['done', 'complete', 'finished'])).toBe(false);
    });

    it('should match regex patterns (prefixed with /)', () => {
      expect(matchesAny('Task-123', ['/Task-\\d+/'])).toBe(true);
      expect(matchesAny('Bug-456', ['/Task-\\d+/'])).toBe(false);
    });

    it('should handle case insensitivity for regex', () => {
      expect(matchesAny('DONE', ['/done/'])).toBe(true);
      expect(matchesAny('done', ['/DONE/'])).toBe(true);
    });

    it('should handle mixed string and regex patterns', () => {
      expect(matchesAny('complete', ['done', '/comp.*/'])).toBe(true);
      expect(matchesAny('finished', ['done', '/finish.*/'])).toBe(true);
      expect(matchesAny('pending', ['done', '/comp.*/'])).toBe(false);
    });

    it('should handle invalid regex gracefully', () => {
      expect(matchesAny('test', ['/[invalid/'])).toBe(false);
    });
  });

  describe('cloneConfig', () => {
    it('should create a deep copy', () => {
      const original = {
        a: 1,
        b: { c: 2, d: { e: 3 } },
        f: [4, 5, 6],
      };
      const cloned = cloneConfig(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should ensure independence of nested objects', () => {
      const original = { a: { b: { c: 1 } } };
      const cloned = cloneConfig(original);
      cloned.a.b.c = 2;
      expect(original.a.b.c).toBe(1);
      expect(cloned.a.b.c).toBe(2);
    });

    it('should ensure independence of arrays', () => {
      const original = { arr: [1, 2, 3] };
      const cloned = cloneConfig(original);
      cloned.arr.push(4);
      expect(original.arr).toEqual([1, 2, 3]);
      expect(cloned.arr).toEqual([1, 2, 3, 4]);
    });
  });

});
