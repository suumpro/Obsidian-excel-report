import { MetricsCalculator } from '../src/services/MetricsCalculator';
import {
  getPreset,
  getPresetNames,
  getPresetDisplayNames,
  isValidPreset,
  getDefaultPresetName,
} from '../src/config/presets/index';
import type { Task, Feature, Blocker } from '../src/types/models';
import type { FeatureStatus, BlockerStatus } from '../src/types/enums';
import {
  emptyDashboardData,
  emptyRoadmapData,
  emptyBlockerData,
  emptyQuarterlyData,
} from '../src/types/data';

// Helper function to create mock Task
function createTask(overrides: Partial<Task> = {}): Task {
  return {
    content: 'Test task',
    status: false,
    tags: [],
    priority: null,
    dueDate: null,
    category: null,
    owner: null,
    rawLine: '- [ ] Test task',
    ...overrides,
  };
}

// Helper function to create mock Feature
function createFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'F-001',
    name: 'Test Feature',
    priority: 'P1',
    status: '대기' as FeatureStatus,
    startDate: null,
    completionDate: null,
    progress: 0,
    cycle: null,
    blocker: null,
    ...overrides,
  };
}

// Helper function to create mock Blocker
function createBlocker(overrides: Partial<Blocker> = {}): Blocker {
  return {
    id: 'B-001',
    title: 'Test Blocker',
    priority: 'P1',
    status: '진행중' as BlockerStatus,
    owner: null,
    targetDate: null,
    impact: null,
    description: null,
    ...overrides,
  };
}

describe('MetricsCalculator', () => {
  describe('calculateTaskMetrics', () => {
    it('should handle empty array', () => {
      const result = MetricsCalculator.calculateTaskMetrics([]);
      expect(result).toEqual({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        completionRate: 0,
      });
    });

    it('should handle all completed tasks', () => {
      const tasks = [
        createTask({ status: true }),
        createTask({ status: true }),
        createTask({ status: true }),
      ];
      const result = MetricsCalculator.calculateTaskMetrics(tasks);
      expect(result).toEqual({
        totalTasks: 3,
        completedTasks: 3,
        pendingTasks: 0,
        completionRate: 100,
      });
    });

    it('should handle all pending tasks', () => {
      const tasks = [
        createTask({ status: false }),
        createTask({ status: false }),
      ];
      const result = MetricsCalculator.calculateTaskMetrics(tasks);
      expect(result).toEqual({
        totalTasks: 2,
        completedTasks: 0,
        pendingTasks: 2,
        completionRate: 0,
      });
    });

    it('should handle mixed tasks', () => {
      const tasks = [
        createTask({ status: true }),
        createTask({ status: false }),
        createTask({ status: true }),
        createTask({ status: false }),
      ];
      const result = MetricsCalculator.calculateTaskMetrics(tasks);
      expect(result).toEqual({
        totalTasks: 4,
        completedTasks: 2,
        pendingTasks: 2,
        completionRate: 50,
      });
    });
  });

  describe('calculateDashboardMetrics', () => {
    it('should calculate metrics with P0/P1/P2 tasks', () => {
      const dashboard = emptyDashboardData();
      dashboard.p0Tasks = [
        createTask({ status: true, priority: 'P0' }),
        createTask({ status: false, priority: 'P0' }),
      ];
      dashboard.p1Tasks = [
        createTask({ status: true, priority: 'P1' }),
        createTask({ status: true, priority: 'P1' }),
        createTask({ status: false, priority: 'P1' }),
      ];
      dashboard.p2Tasks = [
        createTask({ status: true, priority: 'P2' }),
        createTask({ status: false, priority: 'P2' }),
        createTask({ status: false, priority: 'P2' }),
      ];
      dashboard.allTasks = [
        ...dashboard.p0Tasks,
        ...dashboard.p1Tasks,
        ...dashboard.p2Tasks,
      ];

      const result = MetricsCalculator.calculateDashboardMetrics(dashboard);
      expect(result.totalTasks).toBe(8);
      expect(result.completedTasks).toBe(4);
      expect(result.pendingTasks).toBe(4);
      expect(result.completionRate).toBe(50);
      expect(result.p0Total).toBe(2);
      expect(result.p0Completed).toBe(1);
      expect(result.p0CompletionRate).toBe(50);
      expect(result.p1Total).toBe(3);
      expect(result.p1Completed).toBe(2);
      expect(result.p1CompletionRate).toBeCloseTo(66.7, 1);
      expect(result.p2Total).toBe(3);
      expect(result.p2Completed).toBe(1);
      expect(result.p2CompletionRate).toBeCloseTo(33.3, 1);
    });

    it('should handle empty dashboard', () => {
      const dashboard = emptyDashboardData();
      const result = MetricsCalculator.calculateDashboardMetrics(dashboard);
      expect(result.totalTasks).toBe(0);
      expect(result.completedTasks).toBe(0);
      expect(result.pendingTasks).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.p0Total).toBe(0);
      expect(result.p0Completed).toBe(0);
      expect(result.p0CompletionRate).toBe(0);
      expect(result.p1Total).toBe(0);
      expect(result.p1Completed).toBe(0);
      expect(result.p1CompletionRate).toBe(0);
      expect(result.p2Total).toBe(0);
      expect(result.p2Completed).toBe(0);
      expect(result.p2CompletionRate).toBe(0);
    });
  });

  describe('calculateRoadmapMetrics', () => {
    it('should calculate metrics with Korean feature statuses', () => {
      const roadmap = emptyRoadmapData();
      roadmap.features = [
        createFeature({ status: '진행중' as FeatureStatus }),
        createFeature({ status: '진행중' as FeatureStatus }),
        createFeature({ status: '완료' as FeatureStatus }),
        createFeature({ status: '완료' as FeatureStatus }),
        createFeature({ status: '완료' as FeatureStatus }),
        createFeature({ status: '대기' as FeatureStatus }),
      ];

      const result = MetricsCalculator.calculateRoadmapMetrics(roadmap);
      expect(result.totalFeatures).toBe(6);
      expect(result.featuresInProgress).toBe(2);
      expect(result.featuresCompleted).toBe(3);
      expect(result.featuresPending).toBe(1);
    });

    it('should calculate metrics with English feature statuses', () => {
      const roadmap = emptyRoadmapData();
      roadmap.features = [
        createFeature({ status: 'In Progress' as FeatureStatus }),
        createFeature({ status: 'Completed' as FeatureStatus }),
        createFeature({ status: 'Pending' as FeatureStatus }),
      ];

      const result = MetricsCalculator.calculateRoadmapMetrics(roadmap);
      expect(result.totalFeatures).toBe(3);
      expect(result.featuresInProgress).toBe(1);
      expect(result.featuresCompleted).toBe(1);
      expect(result.featuresPending).toBe(1);
    });

    it('should handle empty roadmap', () => {
      const roadmap = emptyRoadmapData();
      const result = MetricsCalculator.calculateRoadmapMetrics(roadmap);
      expect(result.totalFeatures).toBe(0);
      expect(result.featuresInProgress).toBe(0);
      expect(result.featuresCompleted).toBe(0);
      expect(result.featuresPending).toBe(0);
    });
  });

  describe('calculateBlockerMetrics', () => {
    it('should calculate metrics with resolved blockers', () => {
      const blockerData = emptyBlockerData();
      const p0Resolved = createBlocker({ status: '✅ 해결' as BlockerStatus, priority: 'P0' });
      const p0Active = createBlocker({ status: '진행중' as BlockerStatus, priority: 'P0' });
      const p1Resolved = createBlocker({ status: 'Resolved' as BlockerStatus, priority: 'P1' });
      const p1Active = createBlocker({ status: '진행중' as BlockerStatus, priority: 'P1' });
      const p2Active = createBlocker({ status: '진행중' as BlockerStatus, priority: 'P2' });

      blockerData.allBlockers = [p0Resolved, p0Active, p1Resolved, p1Active, p2Active];
      blockerData.highPriority = [p0Resolved, p0Active];
      blockerData.mediumPriority = [p1Resolved, p1Active];
      blockerData.lowPriority = [p2Active];

      const result = MetricsCalculator.calculateBlockerMetrics(blockerData);
      expect(result.totalBlockers).toBe(5);
      expect(result.resolvedBlockers).toBe(2);
      expect(result.highPriorityBlockers).toBe(2);
      expect(result.mediumPriorityBlockers).toBe(2);
      expect(result.lowPriorityBlockers).toBe(1);
    });

    it('should handle empty blocker data', () => {
      const blockerData = emptyBlockerData();
      const result = MetricsCalculator.calculateBlockerMetrics(blockerData);
      expect(result.totalBlockers).toBe(0);
      expect(result.resolvedBlockers).toBe(0);
      expect(result.highPriorityBlockers).toBe(0);
      expect(result.mediumPriorityBlockers).toBe(0);
      expect(result.lowPriorityBlockers).toBe(0);
    });
  });

  describe('calculateQuarterlyMetrics', () => {
    it('should calculate metrics with P0/P1/P2 breakdowns', () => {
      const quarterly = emptyQuarterlyData(1);
      quarterly.totalTasks = 6;
      quarterly.completedTasks = [
        createTask({ status: true, priority: 'P0' }),
        createTask({ status: true, priority: 'P1' }),
        createTask({ status: true, priority: 'P1' }),
        createTask({ status: true, priority: 'P2' }),
      ];
      quarterly.pendingTasks = [
        createTask({ status: false, priority: 'P0' }),
        createTask({ status: false, priority: 'P1' }),
      ];
      quarterly.p0Total = 2;
      quarterly.p0Completed = 1;
      quarterly.p1Total = 3;
      quarterly.p1Completed = 2;
      quarterly.p2Total = 1;
      quarterly.p2Completed = 1;
      quarterly.completionRate = (4 / 6) * 100;

      const result = MetricsCalculator.calculateQuarterlyMetrics(quarterly);
      expect(result.totalTasks).toBe(6);
      expect(result.completedTasks).toBe(4);
      expect(result.pendingTasks).toBe(2);
      expect(result.p0Total).toBe(2);
      expect(result.p1Total).toBe(3);
      expect(result.p2Total).toBe(1);
      expect(result.p0CompletionRate).toBe(50); // 1/2
      expect(result.p1CompletionRate).toBeCloseTo(66.7, 1); // 2/3
      expect(result.p2CompletionRate).toBe(100); // 1/1
    });

    it('should handle zero goals for priority level', () => {
      const quarterly = emptyQuarterlyData(1);
      quarterly.totalTasks = 1;
      quarterly.completedTasks = [createTask({ status: true, priority: 'P0' })];
      quarterly.p0Total = 1;
      quarterly.p0Completed = 1;
      quarterly.completionRate = 100;

      const result = MetricsCalculator.calculateQuarterlyMetrics(quarterly);
      expect(result.totalTasks).toBe(1);
      expect(result.p0Total).toBe(1);
      expect(result.p1Total).toBe(0);
      expect(result.p2Total).toBe(0);
      expect(result.p0CompletionRate).toBe(100);
      expect(result.p1CompletionRate).toBe(0);
      expect(result.p2CompletionRate).toBe(0);
    });
  });

  describe('formatPercentage', () => {
    it('should format with default 1 decimal place', () => {
      expect(MetricsCalculator.formatPercentage(50)).toBe('50.0%');
      expect(MetricsCalculator.formatPercentage(66.666)).toBe('66.7%');
      expect(MetricsCalculator.formatPercentage(33.333)).toBe('33.3%');
    });

    it('should format with custom decimal places', () => {
      expect(MetricsCalculator.formatPercentage(50, 0)).toBe('50%');
      expect(MetricsCalculator.formatPercentage(66.666, 2)).toBe('66.67%');
      expect(MetricsCalculator.formatPercentage(33.333, 3)).toBe('33.333%');
    });

    it('should handle edge values', () => {
      expect(MetricsCalculator.formatPercentage(0)).toBe('0.0%');
      expect(MetricsCalculator.formatPercentage(100)).toBe('100.0%');
      expect(MetricsCalculator.formatPercentage(0.1)).toBe('0.1%');
    });
  });

  describe('getProgressBar', () => {
    it('should show 0% progress', () => {
      const bar = MetricsCalculator.getProgressBar(0, 10);
      expect(bar).toBe('░░░░░░░░░░');
      expect(bar.length).toBe(10);
    });

    it('should show 50% progress', () => {
      const bar = MetricsCalculator.getProgressBar(5, 10);
      expect(bar).toBe('█████░░░░░');
      expect(bar.length).toBe(10);
    });

    it('should show 100% progress', () => {
      const bar = MetricsCalculator.getProgressBar(10, 10);
      expect(bar).toBe('██████████');
      expect(bar.length).toBe(10);
    });

    it('should handle total=0', () => {
      const bar = MetricsCalculator.getProgressBar(0, 0);
      expect(bar).toBe('░░░░░░░░░░');
    });

    it('should respect custom width', () => {
      const bar = MetricsCalculator.getProgressBar(3, 6, 6);
      expect(bar).toBe('███░░░');
      expect(bar.length).toBe(6);
    });

    it('should handle partial progress', () => {
      const bar = MetricsCalculator.getProgressBar(3, 10);
      expect(bar).toBe('███░░░░░░░');
    });
  });
});

describe('Presets', () => {
  describe('getPreset', () => {
    it('should return preset by preset name', () => {
      const preset = getPreset('korean-default');
      expect(preset).toBeDefined();
      expect(preset.locale).toBe('ko');
      expect(preset.version).toBe('2.0');
    });

    it('should map locale code "ko" to korean-default', () => {
      const preset = getPreset('ko');
      expect(preset.locale).toBe('ko');
    });

    it('should map locale code "en" to english-default', () => {
      const preset = getPreset('en');
      expect(preset.locale).toBe('en');
    });

    it('should map locale code "ja" to japanese-default', () => {
      const preset = getPreset('ja');
      expect(preset.locale).toBe('ja');
    });

    it('should map "custom" to minimal', () => {
      const preset = getPreset('custom');
      expect(preset.locale).toBe('en');
      expect(preset.version).toBe('2.0');
    });

    it('should fallback to korean-default for unknown preset', () => {
      const preset = getPreset('unknown-preset');
      expect(preset.locale).toBe('ko');
    });

    it('should return deep copy (mutation does not affect original)', () => {
      const preset1 = getPreset('korean-default');
      const preset2 = getPreset('korean-default');

      // Mutate preset1
      preset1.localeStrings.reports.weekly = 'MODIFIED';

      // preset2 should be unaffected
      expect(preset2.localeStrings.reports.weekly).not.toBe('MODIFIED');
    });
  });

  describe('getPresetNames', () => {
    it('should return all 4 preset names', () => {
      const names = getPresetNames();
      expect(names).toEqual([
        'korean-default',
        'english-default',
        'japanese-default',
        'minimal',
      ]);
    });
  });

  describe('getPresetDisplayNames', () => {
    it('should return display name record', () => {
      const displayNames = getPresetDisplayNames();
      expect(displayNames['korean-default']).toBeDefined();
      expect(displayNames['english-default']).toBeDefined();
      expect(displayNames['japanese-default']).toBeDefined();
      expect(displayNames['minimal']).toBeDefined();
    });
  });

  describe('isValidPreset', () => {
    it('should return true for valid preset names', () => {
      expect(isValidPreset('korean-default')).toBe(true);
      expect(isValidPreset('english-default')).toBe(true);
      expect(isValidPreset('japanese-default')).toBe(true);
      expect(isValidPreset('minimal')).toBe(true);
    });

    it('should return false for invalid preset names', () => {
      expect(isValidPreset('unknown')).toBe(false);
      expect(isValidPreset('ko')).toBe(false);
      expect(isValidPreset('en')).toBe(false);
      expect(isValidPreset('')).toBe(false);
    });
  });

  describe('getDefaultPresetName', () => {
    it('should return korean-default', () => {
      expect(getDefaultPresetName()).toBe('korean-default');
    });
  });
});
