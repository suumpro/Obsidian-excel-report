/**
 * Aggregated data containers
 * Equivalent to Python classes in aggregators/data_aggregator.py
 */

import { Task, Feature, Blocker, Priority } from './models';

/**
 * Coordination item for Lawson協議 sheet
 */
export interface CoordinationItem {
  /** Category: 긴급확인, 데이터, 시스템 */
  category: string;
  /** Content of coordination */
  content: string;
  /** Priority: 높음, 중간, 낮음 */
  priority: string;
  /** Owner/담당 */
  owner: string;
  /** Deadline/기한 */
  deadline: string;
  /** Status: 대기, 협의중, 완료 */
  status: string;
}

/**
 * Milestone item for 마일스톤 sheet
 */
export interface MilestoneItem {
  /** Date string */
  date: string;
  /** Milestone name */
  name: string;
  /** Target/goal */
  target: string;
  /** Status */
  status: string;
  /** Risk level: 높음, 중간, 낮음 */
  risk: string;
}

/**
 * Playbook progress item for 플레이북진척 sheet
 */
export interface PlaybookItem {
  /** Item name */
  name: string;
  /** Target count */
  target: number;
  /** Current count */
  current: number;
  /** Percentage complete */
  percentage: number;
  /** Status */
  status: string;
}

/**
 * Container for PM Dashboard data
 */
export interface DashboardData {
  /** Current week number */
  currentWeek: number;
  /** Current product cycle (C1, C2, C3) */
  currentCycle: string;
  /** Current date string */
  currentDate: string;
  /** P0 (critical) priority tasks */
  p0Tasks: Task[];
  /** P1 (high) priority tasks */
  p1Tasks: Task[];
  /** P2 (normal) priority tasks */
  p2Tasks: Task[];
  /** All tasks combined */
  allTasks: Task[];
  /** Frontmatter metadata */
  metadata: Record<string, unknown>;
  /** Coordination items (optional, for extended data) */
  coordination?: CoordinationItem[];
  /** Milestone items (optional, for extended data) */
  milestones?: MilestoneItem[];
  /** Playbook items (optional, for extended data) */
  playbook?: PlaybookItem[];
}

/**
 * Container for roadmap feature data
 */
export interface RoadmapData {
  /** All features */
  features: Feature[];
  /** Features grouped by priority */
  featuresByPriority: Record<Priority, Feature[]>;
  /** Features grouped by status */
  featuresByStatus: Record<string, Feature[]>;
  /** Q1 features */
  q1Features: Feature[];
  /** Q2 features */
  q2Features: Feature[];
  /** Q3 features */
  q3Features: Feature[];
  /** Q4 features */
  q4Features: Feature[];
}

/**
 * Container for blocker tracking data
 */
export interface BlockerData {
  /** All blockers */
  allBlockers: Blocker[];
  /** High priority blockers */
  highPriority: Blocker[];
  /** Medium priority blockers */
  mediumPriority: Blocker[];
  /** Low priority blockers */
  lowPriority: Blocker[];
  /** Blockers grouped by owner */
  byOwner: Record<string, Blocker[]>;
}

/**
 * Container for quarterly status data
 */
export interface QuarterlyData {
  /** Quarter number (1-4) */
  quarter: number;
  /** P0 tasks for this quarter */
  p0Tasks: Task[];
  /** P1 tasks for this quarter */
  p1Tasks: Task[];
  /** P2 tasks for this quarter */
  p2Tasks: Task[];
  /** Completed tasks */
  completedTasks: Task[];
  /** Pending tasks */
  pendingTasks: Task[];
  /** Total task count */
  totalTasks: number;
  /** Overall completion rate (0-100) */
  completionRate: number;

  // P0 breakdown
  p0Total: number;
  p0Completed: number;
  p0InProgress: number;
  p0Pending: number;

  // P1 breakdown
  p1Total: number;
  p1Completed: number;
  p1InProgress: number;
  p1Pending: number;

  // P2 breakdown
  p2Total: number;
  p2Completed: number;
  p2InProgress: number;
  p2Pending: number;
}

/**
 * Calculated metrics container
 * Equivalent to Python Metrics in aggregators/metrics_calculator.py
 */
export interface Metrics {
  // Task metrics
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;

  // P0 breakdown
  p0Total: number;
  p0Completed: number;
  p0CompletionRate: number;

  // P1 breakdown
  p1Total: number;
  p1Completed: number;
  p1CompletionRate: number;

  // P2 breakdown
  p2Total: number;
  p2Completed: number;
  p2CompletionRate: number;

  // Feature metrics
  totalFeatures: number;
  featuresInProgress: number;
  featuresCompleted: number;
  featuresPending: number;

  // Blocker metrics
  totalBlockers: number;
  highPriorityBlockers: number;
  mediumPriorityBlockers: number;
  lowPriorityBlockers: number;
  resolvedBlockers: number;

  // Additional metrics
  overdueTasks: number;
  thisWeekTasks: number;
  activeBlockers: number;
}

/**
 * Create empty DashboardData
 */
export function emptyDashboardData(): DashboardData {
  return {
    currentWeek: 0,
    currentCycle: 'C1',
    currentDate: '',
    p0Tasks: [],
    p1Tasks: [],
    p2Tasks: [],
    allTasks: [],
    metadata: {},
    coordination: [],
    milestones: [],
    playbook: [],
  };
}

/**
 * Create empty RoadmapData
 */
export function emptyRoadmapData(): RoadmapData {
  return {
    features: [],
    featuresByPriority: { P0: [], P1: [], P2: [] },
    featuresByStatus: {},
    q1Features: [],
    q2Features: [],
    q3Features: [],
    q4Features: [],
  };
}

/**
 * Create empty BlockerData
 */
export function emptyBlockerData(): BlockerData {
  return {
    allBlockers: [],
    highPriority: [],
    mediumPriority: [],
    lowPriority: [],
    byOwner: {},
  };
}

/**
 * Create empty QuarterlyData
 */
export function emptyQuarterlyData(quarter: number): QuarterlyData {
  return {
    quarter,
    p0Tasks: [],
    p1Tasks: [],
    p2Tasks: [],
    completedTasks: [],
    pendingTasks: [],
    totalTasks: 0,
    completionRate: 0,
    p0Total: 0,
    p0Completed: 0,
    p0InProgress: 0,
    p0Pending: 0,
    p1Total: 0,
    p1Completed: 0,
    p1InProgress: 0,
    p1Pending: 0,
    p2Total: 0,
    p2Completed: 0,
    p2InProgress: 0,
    p2Pending: 0,
  };
}

/**
 * Create empty Metrics
 */
export function emptyMetrics(): Metrics {
  return {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    completionRate: 0,
    p0Total: 0,
    p0Completed: 0,
    p0CompletionRate: 0,
    p1Total: 0,
    p1Completed: 0,
    p1CompletionRate: 0,
    p2Total: 0,
    p2Completed: 0,
    p2CompletionRate: 0,
    totalFeatures: 0,
    featuresInProgress: 0,
    featuresCompleted: 0,
    featuresPending: 0,
    totalBlockers: 0,
    highPriorityBlockers: 0,
    mediumPriorityBlockers: 0,
    lowPriorityBlockers: 0,
    resolvedBlockers: 0,
    overdueTasks: 0,
    thisWeekTasks: 0,
    activeBlockers: 0,
  };
}

// ============================================
// TASK MASTER DATA
// ============================================

/** Q1-Q4 Task Master data with weekly breakdowns */
export interface TaskMasterData {
  quarter: number;
  theme: string;
  targetAcceptance: number;
  weeklyBreakdowns: WeeklyBreakdown[];
  allTasks: Task[];
  p0Tasks: Task[];
  p1Tasks: Task[];
  milestones: MilestoneItem[];
  frontmatter: Record<string, unknown>;
}

/** Weekly breakdown within a Task Master */
export interface WeeklyBreakdown {
  weekNumber: number;
  weekRange: string;
  newTasks: Task[];
  dueTasks: Task[];
  milestones: string[];
}

// ============================================
// CUSTOMER REQUEST DATA
// ============================================

/** Customer request tracking data */
export interface CustomerRequestData {
  customer: string;
  totalRequests: number;
  byPriority: Record<number, CustomerRequest[]>;
  completedCount: number;
  requests: CustomerRequest[];
}

/** Individual customer request */
export interface CustomerRequest {
  id: string;
  title: string;
  priority: number;
  status: string;
  linkedFeature?: string;
  dueDate?: string;
  description?: string;
}

// ============================================
// ANNUAL MASTER DATA
// ============================================

/** Annual master index data with Gantt timeline */
export interface AnnualMasterData {
  year: number;
  quarterSummaries: QuarterSummary[];
  ganttItems: GanttItem[];
}

/** Quarter summary in annual master */
export interface QuarterSummary {
  quarter: number;
  period: string;
  theme: string;
  target: string;
  status: string;
}

/** Gantt chart item */
export interface GanttItem {
  name: string;
  section: string;
  status: 'done' | 'active' | 'planned' | 'milestone';
  startDate: string;
  endDate: string;
}

/**
 * Create empty TaskMasterData
 */
export function emptyTaskMasterData(quarter = 1): TaskMasterData {
  return {
    quarter,
    theme: '',
    targetAcceptance: 0,
    weeklyBreakdowns: [],
    allTasks: [],
    p0Tasks: [],
    p1Tasks: [],
    milestones: [],
    frontmatter: {},
  };
}

/**
 * Create empty CustomerRequestData
 */
export function emptyCustomerRequestData(): CustomerRequestData {
  return {
    customer: '',
    totalRequests: 0,
    byPriority: {},
    completedCount: 0,
    requests: [],
  };
}

/**
 * Create empty AnnualMasterData
 */
export function emptyAnnualMasterData(): AnnualMasterData {
  return {
    year: new Date().getFullYear(),
    quarterSummaries: [],
    ganttItems: [],
  };
}
