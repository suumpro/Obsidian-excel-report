/**
 * Progress notification utilities
 * Provides step-based progress feedback during report generation
 */

import { Notice } from 'obsidian';

/**
 * Progress step definition
 */
export interface ProgressStep {
  /** Display label for this step */
  label: string;
  /** Optional weight for weighted progress calculation */
  weight?: number;
}

/**
 * Progress reporter for long-running operations
 * Shows real-time progress to users with step indicators
 */
export class ProgressReporter {
  private notice: Notice | null = null;
  private steps: ProgressStep[];
  private currentStep: number = 0;
  private startTime: number = 0;
  private totalWeight: number = 0;
  private completedWeight: number = 0;

  constructor(steps: ProgressStep[]) {
    this.steps = steps;
    this.totalWeight = steps.reduce((sum, s) => sum + (s.weight ?? 1), 0);
  }

  /**
   * Start progress tracking
   */
  start(): void {
    this.startTime = Date.now();
    this.currentStep = 0;
    this.completedWeight = 0;
    this.updateNotice();
  }

  /**
   * Move to the next step
   */
  nextStep(): void {
    if (this.currentStep < this.steps.length) {
      this.completedWeight += this.steps[this.currentStep].weight ?? 1;
    }
    this.currentStep++;
    if (this.currentStep < this.steps.length) {
      this.updateNotice();
    }
  }

  /**
   * Update current step label (for dynamic messages)
   */
  updateLabel(label: string): void {
    if (this.currentStep < this.steps.length) {
      this.steps[this.currentStep].label = label;
      this.updateNotice();
    }
  }

  /**
   * Mark progress as complete
   */
  complete(message?: string): void {
    const elapsed = Date.now() - this.startTime;
    this.hideNotice();
    new Notice(message || `Done! (${this.formatTime(elapsed)})`, 3000);
  }

  /**
   * Mark progress as failed
   */
  error(message: string): void {
    this.hideNotice();
    new Notice(message, 5000);
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get current progress percentage
   */
  getProgressPercentage(): number {
    if (this.totalWeight === 0) return 0;
    return Math.round((this.completedWeight / this.totalWeight) * 100);
  }

  /**
   * Hide the notice
   */
  private hideNotice(): void {
    if (this.notice) {
      this.notice.hide();
      this.notice = null;
    }
  }

  /**
   * Update the progress notice
   */
  private updateNotice(): void {
    const step = this.steps[this.currentStep];
    const stepNum = this.currentStep + 1;
    const totalSteps = this.steps.length;
    const percentage = this.getProgressPercentage();

    const message = `${step.label} (${stepNum}/${totalSteps}) ${percentage}%`;

    if (this.notice) {
      this.notice.setMessage(message);
    } else {
      this.notice = new Notice(message, 0); // 0 = don't auto-hide
    }
  }

  /**
   * Format time in human-readable format
   */
  private formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 100) / 10;
    return `${seconds}s`;
  }
}

/**
 * Pre-defined step sets for common operations
 */

export const WEEKLY_REPORT_STEPS: ProgressStep[] = [
  { label: 'Loading data...', weight: 2 },
  { label: 'Sheet 1: Weekly Summary...', weight: 1 },
  { label: 'Sheet 2: Roadmap Progress...', weight: 1 },
  { label: 'Sheet 3: Task Details...', weight: 1 },
  { label: 'Sheet 4: Blocker Tracking...', weight: 1 },
  { label: 'Sheet 5-7: Additional sheets...', weight: 1 },
  { label: 'Saving file...', weight: 1 },
];

export const QUARTERLY_REPORT_STEPS: ProgressStep[] = [
  { label: 'Loading data...', weight: 2 },
  { label: 'Sheet 1: Overview...', weight: 1 },
  { label: 'Sheet 2: P0 Tasks...', weight: 1 },
  { label: 'Sheet 3: P1 Tasks...', weight: 1 },
  { label: 'Sheet 4: Analytics...', weight: 1 },
  { label: 'Saving file...', weight: 1 },
];

export const FEATURE_REPORT_STEPS: ProgressStep[] = [
  { label: 'Loading data...', weight: 2 },
  { label: 'Sheet 1: All Features...', weight: 1 },
  { label: 'Sheet 2: By Priority...', weight: 1 },
  { label: 'Sheet 3: By Cycle...', weight: 1 },
  { label: 'Saving file...', weight: 1 },
];

export const BLOCKER_REPORT_STEPS: ProgressStep[] = [
  { label: 'Loading data...', weight: 2 },
  { label: 'Sheet 1: Active Blockers...', weight: 1 },
  { label: 'Sheet 2: Blocker History...', weight: 1 },
  { label: 'Saving file...', weight: 1 },
];

