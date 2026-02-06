/**
 * Metrics calculation service
 * Equivalent to Python aggregators/metrics_calculator.py
 */

import { Task } from '../types/models';
import { DashboardData, RoadmapData, BlockerData, QuarterlyData, Metrics, emptyMetrics } from '../types/data';
import { isOverdue, isThisWeek } from '../utils/dateUtils';

export class MetricsCalculator {
  /**
   * Calculate metrics from a list of tasks
   */
  static calculateTaskMetrics(tasks: Task[]): Partial<Metrics> {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status).length;
    const pending = total - completed;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: pending,
      completionRate,
    };
  }

  /**
   * Calculate metrics from dashboard data
   */
  static calculateDashboardMetrics(dashboard: DashboardData): Metrics {
    const metrics = emptyMetrics();

    // Overall task metrics
    const taskMetrics = this.calculateTaskMetrics(dashboard.allTasks);
    Object.assign(metrics, taskMetrics);

    // P0 metrics
    const p0Completed = dashboard.p0Tasks.filter(t => t.status).length;
    metrics.p0Total = dashboard.p0Tasks.length;
    metrics.p0Completed = p0Completed;
    metrics.p0CompletionRate = metrics.p0Total > 0
      ? (p0Completed / metrics.p0Total) * 100
      : 0;

    // P1 metrics
    const p1Completed = dashboard.p1Tasks.filter(t => t.status).length;
    metrics.p1Total = dashboard.p1Tasks.length;
    metrics.p1Completed = p1Completed;
    metrics.p1CompletionRate = metrics.p1Total > 0
      ? (p1Completed / metrics.p1Total) * 100
      : 0;

    // P2 metrics
    const p2Completed = dashboard.p2Tasks.filter(t => t.status).length;
    metrics.p2Total = dashboard.p2Tasks.length;
    metrics.p2Completed = p2Completed;
    metrics.p2CompletionRate = metrics.p2Total > 0
      ? (p2Completed / metrics.p2Total) * 100
      : 0;

    // Overdue and this week metrics
    metrics.overdueTasks = dashboard.allTasks.filter(t =>
      !t.status && isOverdue(t.dueDate)
    ).length;

    metrics.thisWeekTasks = dashboard.allTasks.filter(t =>
      isThisWeek(t.dueDate)
    ).length;

    return metrics;
  }

  /**
   * Calculate metrics from roadmap data
   */
  static calculateRoadmapMetrics(roadmap: RoadmapData): Partial<Metrics> {
    const features = roadmap.features;
    const total = features.length;

    const inProgress = features.filter(f =>
      f.status === '진행중' || f.status === 'In Progress'
    ).length;

    const completed = features.filter(f =>
      f.status === '완료' || f.status === 'Completed'
    ).length;

    const pending = features.filter(f =>
      f.status === '대기' || f.status === 'Pending'
    ).length;

    return {
      totalFeatures: total,
      featuresInProgress: inProgress,
      featuresCompleted: completed,
      featuresPending: pending,
    };
  }

  /**
   * Calculate metrics from blocker data
   */
  static calculateBlockerMetrics(blockerData: BlockerData): Partial<Metrics> {
    const blockers = blockerData.allBlockers;

    const resolved = blockers.filter(b =>
      b.status.includes('해결') || b.status.includes('Resolved') || b.status.includes('✅')
    ).length;

    return {
      totalBlockers: blockers.length,
      highPriorityBlockers: blockerData.highPriority.length,
      mediumPriorityBlockers: blockerData.mediumPriority.length,
      lowPriorityBlockers: blockerData.lowPriority.length,
      resolvedBlockers: resolved,
      activeBlockers: blockers.length - resolved,
    };
  }

  /**
   * Calculate metrics from quarterly data
   */
  static calculateQuarterlyMetrics(quarterly: QuarterlyData): Partial<Metrics> {
    return {
      totalTasks: quarterly.totalTasks,
      completedTasks: quarterly.completedTasks.length,
      pendingTasks: quarterly.pendingTasks.length,
      completionRate: quarterly.completionRate,
      p0Total: quarterly.p0Total,
      p0Completed: quarterly.p0Completed,
      p0CompletionRate: quarterly.p0Total > 0
        ? (quarterly.p0Completed / quarterly.p0Total) * 100
        : 0,
      p1Total: quarterly.p1Total,
      p1Completed: quarterly.p1Completed,
      p1CompletionRate: quarterly.p1Total > 0
        ? (quarterly.p1Completed / quarterly.p1Total) * 100
        : 0,
      p2Total: quarterly.p2Total,
      p2Completed: quarterly.p2Completed,
      p2CompletionRate: quarterly.p2Total > 0
        ? (quarterly.p2Completed / quarterly.p2Total) * 100
        : 0,
    };
  }

  /**
   * Calculate combined metrics from all data sources
   */
  static calculateCombinedMetrics(
    dashboard: DashboardData,
    roadmap: RoadmapData,
    blockerData: BlockerData,
    quarterly: QuarterlyData
  ): Metrics {
    const metrics = emptyMetrics();

    // Merge dashboard metrics
    const dashboardMetrics = this.calculateDashboardMetrics(dashboard);
    Object.assign(metrics, dashboardMetrics);

    // Merge roadmap metrics
    const roadmapMetrics = this.calculateRoadmapMetrics(roadmap);
    Object.assign(metrics, roadmapMetrics);

    // Merge blocker metrics
    const blockerMetrics = this.calculateBlockerMetrics(blockerData);
    Object.assign(metrics, blockerMetrics);

    return metrics;
  }

  /**
   * Format percentage with specified decimal places
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Get visual progress bar
   */
  static getProgressBar(current: number, total: number, width: number = 10): string {
    if (total === 0) return '░'.repeat(width);

    const percentage = current / total;
    const filled = Math.round(percentage * width);
    const empty = width - filled;

    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}
