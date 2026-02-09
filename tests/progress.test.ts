/**
 * Unit tests for progress utilities
 */

import {
  ProgressReporter,
  ProgressStep,
  WEEKLY_REPORT_STEPS,
  QUARTERLY_REPORT_STEPS,
  FEATURE_REPORT_STEPS,
  BLOCKER_REPORT_STEPS,
} from '../src/utils/progress';

describe('ProgressReporter', () => {
  const testSteps: ProgressStep[] = [
    { label: 'Step 1', weight: 1 },
    { label: 'Step 2', weight: 2 },
    { label: 'Step 3', weight: 1 },
  ];

  describe('basic operations', () => {
    it('should initialize with steps', () => {
      const reporter = new ProgressReporter(testSteps);
      expect(reporter.getProgressPercentage()).toBe(0);
    });

    it('should start tracking', () => {
      const reporter = new ProgressReporter(testSteps);
      reporter.start();
      expect(reporter.getElapsedTime()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('progress tracking', () => {
    it('should track progress through steps', () => {
      const reporter = new ProgressReporter(testSteps);
      reporter.start();

      // Step 1 complete (weight: 1/4 = 25%)
      reporter.nextStep();
      expect(reporter.getProgressPercentage()).toBe(25);

      // Step 2 complete (weight: 3/4 = 75%)
      reporter.nextStep();
      expect(reporter.getProgressPercentage()).toBe(75);

      // Step 3 complete (weight: 4/4 = 100%)
      reporter.nextStep();
      expect(reporter.getProgressPercentage()).toBe(100);
    });

    it('should handle equal weight steps', () => {
      const equalSteps = [
        { label: 'A', weight: 1 },
        { label: 'B', weight: 1 },
        { label: 'C', weight: 1 },
        { label: 'D', weight: 1 },
      ];
      const reporter = new ProgressReporter(equalSteps);
      reporter.start();

      reporter.nextStep();
      expect(reporter.getProgressPercentage()).toBe(25);

      reporter.nextStep();
      expect(reporter.getProgressPercentage()).toBe(50);

      reporter.nextStep();
      expect(reporter.getProgressPercentage()).toBe(75);

      reporter.nextStep();
      expect(reporter.getProgressPercentage()).toBe(100);
    });
  });

  describe('elapsed time', () => {
    it('should track elapsed time', async () => {
      const reporter = new ProgressReporter(testSteps);
      reporter.start();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));

      const elapsed = reporter.getElapsedTime();
      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(elapsed).toBeLessThan(200); // Should not take too long
    });
  });

  describe('completion and error', () => {
    it('should complete without error', () => {
      const reporter = new ProgressReporter(testSteps);
      reporter.start();
      expect(() => reporter.complete('Done!')).not.toThrow();
    });

    it('should report error without throwing', () => {
      const reporter = new ProgressReporter(testSteps);
      reporter.start();
      expect(() => reporter.error('Something went wrong')).not.toThrow();
    });
  });

  describe('label updates', () => {
    it('should allow updating current step label', () => {
      const reporter = new ProgressReporter(testSteps);
      reporter.start();
      // Should not throw when updating label
      expect(() => reporter.updateLabel('New label')).not.toThrow();
    });
  });
});

describe('pre-defined step sets', () => {
  it('WEEKLY_REPORT_STEPS should have correct structure', () => {
    expect(WEEKLY_REPORT_STEPS.length).toBeGreaterThan(0);
    for (const step of WEEKLY_REPORT_STEPS) {
      expect(step).toHaveProperty('label');
      expect(step).toHaveProperty('weight');
      expect(typeof step.label).toBe('string');
      expect(typeof step.weight).toBe('number');
    }
  });

  it('QUARTERLY_REPORT_STEPS should have correct structure', () => {
    expect(QUARTERLY_REPORT_STEPS.length).toBeGreaterThan(0);
    for (const step of QUARTERLY_REPORT_STEPS) {
      expect(step).toHaveProperty('label');
      expect(step).toHaveProperty('weight');
    }
  });

  it('FEATURE_REPORT_STEPS should have correct structure', () => {
    expect(FEATURE_REPORT_STEPS.length).toBeGreaterThan(0);
    for (const step of FEATURE_REPORT_STEPS) {
      expect(step).toHaveProperty('label');
      expect(step).toHaveProperty('weight');
    }
  });

  it('BLOCKER_REPORT_STEPS should have correct structure', () => {
    expect(BLOCKER_REPORT_STEPS.length).toBeGreaterThan(0);
    for (const step of BLOCKER_REPORT_STEPS) {
      expect(step).toHaveProperty('label');
      expect(step).toHaveProperty('weight');
    }
  });
});

