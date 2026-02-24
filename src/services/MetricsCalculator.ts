/**
 * Metrics calculation service
 * Equivalent to Python aggregators/metrics_calculator.py
 */

import { Task } from '../types/models';
import { DashboardData, RoadmapData, BlockerData, QuarterlyData, Metrics, emptyMetrics } from '../types/data';
import { isOverdue, isThisWeek } from '../utils/dateUtils';
import { isCompleted, isInProgress, isPending, isResolved } from '../utils/statusUtils';

export class MetricsCalculator {
  /**
   * Calculate metrics from a list of tasks
   */
  static calculateTaskMetrics(tasks: Task[]): Partial<Metrics> {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
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

    // Single-pass: count all metrics from allTasks
    let totalCompleted = 0, totalPending = 0;
    let p0Completed = 0, p1Completed = 0, p2Completed = 0;
    let overdueTasks = 0, thisWeekTasks = 0;

    for (const t of dashboard.allTasks) {
      if (t.status === 'completed') {
        totalCompleted++;
        if (t.priority === 'P0') p0Completed++;
        else if (t.priority === 'P1') p1Completed++;
        else if (t.priority === 'P2') p2Completed++;
      } else {
        totalPending++;
        if (isOverdue(t.dueDate)) overdueTasks++;
      }
      if (isThisWeek(t.dueDate)) thisWeekTasks++;
    }

    const total = dashboard.allTasks.length;
    metrics.totalTasks = total;
    metrics.completedTasks = totalCompleted;
    metrics.pendingTasks = totalPending;
    metrics.completionRate = total > 0 ? (totalCompleted / total) * 100 : 0;

    metrics.p0Total = dashboard.p0Tasks.length;
    metrics.p0Completed = p0Completed;
    metrics.p0CompletionRate = metrics.p0Total > 0
      ? (p0Completed / metrics.p0Total) * 100
      : 0;

    metrics.p1Total = dashboard.p1Tasks.length;
    metrics.p1Completed = p1Completed;
    metrics.p1CompletionRate = metrics.p1Total > 0
      ? (p1Completed / metrics.p1Total) * 100
      : 0;

    metrics.p2Total = dashboard.p2Tasks.length;
    metrics.p2Completed = p2Completed;
    metrics.p2CompletionRate = metrics.p2Total > 0
      ? (p2Completed / metrics.p2Total) * 100
      : 0;

    metrics.overdueTasks = overdueTasks;
    metrics.thisWeekTasks = thisWeekTasks;

    return metrics;
  }

  /**
   * Calculate metrics from roadmap data
   */
  static calculateRoadmapMetrics(roadmap: RoadmapData): Partial<Metrics> {
    const features = roadmap.features;
    const total = features.length;

    let inProgress = 0, completed = 0, pending = 0;
    for (const f of features) {
      if (isCompleted(f.status)) completed++;
      else if (isInProgress(f.status)) inProgress++;
      else if (isPending(f.status)) pending++;
    }

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
      isResolved(b.status)
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
    _quarterly: QuarterlyData
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

}
