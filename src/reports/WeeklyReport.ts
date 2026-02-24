/**
 * Weekly Report Generator
 * Generates 9-sheet weekly status report
 * Equivalent to Python reports/weekly_report.py
 * v2.0 - Enhanced with ConfigManager for i18n
 * v3.0 - Added Executive Summary dashboard as first sheet
 */

import { App } from 'obsidian';
import { ExcelGenerator } from '../generators/ExcelGenerator';
import { DataAggregator } from '../services/DataAggregator';
import { ConfigManager } from '../services/ConfigManager';
import { MetricsCalculator } from '../services/MetricsCalculator';
import { ExcelAutomationSettings } from '../types/settings';
import { LocaleStrings } from '../types/config';
import { getDefaultLocaleStrings } from '../config/presets';
import { DashboardData, RoadmapData, BlockerData, QuarterlyData, Metrics, CoordinationItem, MilestoneItem, PlaybookItem, TaskMasterData, CustomerRequestData } from '../types/data';
import { WeekInfo, Priority, Blocker } from '../types/models';
import { getCurrentWeekInfo, formatDate, getWeekRange } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import { isResolved, isInProgress, isScheduled, isBlocker, isCompleted } from '../utils/statusUtils';
import { ChartBuilder } from '../generators/ChartBuilder';
import { ExecutiveSummary } from '../types/parsing';

export class WeeklyReportGenerator extends ExcelGenerator {
  private aggregator: DataAggregator;
  private localeStrings: LocaleStrings;

  constructor(
    app: App,
    settings: ExcelAutomationSettings,
    aggregator?: DataAggregator,
    configManager?: ConfigManager
  ) {
    super(settings, configManager);
    this.aggregator = aggregator || new DataAggregator(app, settings, configManager);
    // Get locale strings or use defaults
    this.localeStrings = configManager?.getLocaleStrings() || getDefaultLocaleStrings();
  }

  /**
   * Generate weekly report with 9 sheets (including Executive Summary)
   */
  async generate(weekInfo?: WeekInfo): Promise<ArrayBuffer> {
    const week = weekInfo || getCurrentWeekInfo();
    logger.info(`Generating Weekly Report for ${week.formattedWeek}...`);

    // Load all data in parallel for better performance
    logger.debug('Loading data from Obsidian files (parallel)...');
    const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
    const [dashboard, roadmap, blockers, quarterData, taskMaster, customerRequests] = await Promise.all([
      this.aggregator.loadDashboardData(),
      this.aggregator.loadRoadmapData(),
      this.aggregator.loadBlockerData(),
      this.aggregator.loadQuarterlyData(currentQuarter),
      this.aggregator.loadTaskMasterData(currentQuarter),
      this.aggregator.loadCustomerRequestData(),
    ]);

    // Calculate metrics
    const metrics = MetricsCalculator.calculateCombinedMetrics(
      dashboard,
      roadmap,
      blockers,
      quarterData
    );

    // Build executive summary data
    const executiveSummary = this.buildExecutiveSummary(
      dashboard,
      roadmap,
      blockers,
      metrics,
      week
    );

    // Create workbook
    this.createWorkbook();

    // Generate 9 sheets using localized sheet names
    const sheets = this.localeStrings.sheets;

    // Sheet 1: Executive Summary (NEW in v3)
    logger.debug('Creating Sheet 1: Executive Summary');
    this.createExecutiveSummarySheet(executiveSummary, week);

    logger.debug(`Creating Sheet 2: ${sheets.weeklySummary}`);
    this.createSheet1WeeklySummary(dashboard, metrics, week);

    logger.debug(`Creating Sheet 3: ${sheets.roadmapProgress}`);
    this.createSheet2RoadmapProgress(roadmap);

    logger.debug(`Creating Sheet 4: ${sheets.taskDetails}`);
    this.createSheet3Q1Tasks(quarterData, taskMaster);

    logger.debug(`Creating Sheet 5: ${sheets.blockerTracking}`);
    this.createSheet4Blockers(blockers);

    logger.debug(`Creating Sheet 6: ${sheets.coordination}`);
    this.createSheet5Coordination(dashboard.coordination || []);

    logger.debug(`Creating Sheet 7: ${sheets.milestones}`);
    this.createSheet6Milestones(dashboard.milestones || []);

    logger.debug(`Creating Sheet 8: ${sheets.playbookProgress}`);
    this.createSheet7PlaybookProgress(dashboard.playbook || []);

    logger.debug(`Creating Sheet 9: ${this.localeStrings.customerRequests.sheetName}`);
    this.createSheet8CustomerRequests(customerRequests);

    logger.info('Weekly report generated successfully with Executive Summary');
    return this.generateBuffer();
  }

  /**
   * Build Executive Summary data from all sources
   */
  private buildExecutiveSummary(
    dashboard: DashboardData,
    roadmap: RoadmapData,
    blockers: BlockerData,
    metrics: Metrics,
    week: WeekInfo
  ): ExecutiveSummary {
    const weekRange = getWeekRange(week.weekNumber, week.year);

    // Calculate priority breakdown
    const p0Total = metrics.p0Total;
    const p0Completed = metrics.p0Completed;
    const p1Total = metrics.p1Total;
    const p1Completed = metrics.p1Completed;
    const p2Total = metrics.p2Total;
    const p2Completed = metrics.p2Completed;

    // Get top blockers (unresolved, sorted by priority)
    const topBlockers = blockers.allBlockers
      .filter(b => !isResolved(b.status))
      .slice(0, 5)
      .map(b => ({
        id: b.id,
        title: b.title,
        priority: b.priority,
        daysOpen: this.calculateDaysOpen(b),
      }));

    // Get upcoming deadlines (tasks due within 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = dashboard.allTasks
      .filter(t => t.dueDate && t.status !== 'completed' && t.dueDate <= sevenDaysFromNow && t.dueDate >= now)
      .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
      .slice(0, 5)
      .map(t => ({
        task: t.content,
        dueDate: t.dueDate!,
        owner: t.owner || undefined,
        priority: t.priority || 'P2' as Priority,
      }));

    // Calculate team workload
    const ownerTaskMap = new Map<string, { total: number; completed: number }>();
    for (const task of dashboard.allTasks) {
      const owner = task.owner || 'Unassigned';
      const current = ownerTaskMap.get(owner) || { total: 0, completed: 0 };
      current.total++;
      if (task.status === 'completed') current.completed++;
      ownerTaskMap.set(owner, current);
    }
    const teamWorkload = Array.from(ownerTaskMap.entries())
      .map(([owner, stats]) => ({
        owner,
        taskCount: stats.total,
        completedCount: stats.completed,
      }))
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 5);

    return {
      reportTitle: `${this.localeStrings.reports.weekly} - ${week.formattedWeek}`,
      dateRange: weekRange,
      generatedAt: new Date(),
      kpis: {
        totalTasks: metrics.totalTasks,
        completedTasks: metrics.completedTasks,
        activeBlockers: blockers.allBlockers.filter(b => !isResolved(b.status)).length,
        totalFeatures: roadmap.features.length,
        completionRate: metrics.completionRate,
      },
      priorityBreakdown: {
        p0: { total: p0Total, completed: p0Completed },
        p1: { total: p1Total, completed: p1Completed },
        p2: { total: p2Total, completed: p2Completed },
      },
      topBlockers,
      upcomingDeadlines,
      teamWorkload,
    };
  }

  /**
   * Calculate how many days a blocker has been open
   */
  private calculateDaysOpen(blocker: Blocker): number {
    // If blocker has a target date, calculate from that
    // Otherwise, default to 0 (unknown)
    if (blocker.targetDate) {
      const targetDate = new Date(blocker.targetDate);
      if (!isNaN(targetDate.getTime())) {
        const now = new Date();
        const diffTime = now.getTime() - targetDate.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
    }
    return 0;
  }

  /**
   * Create Executive Summary Sheet (Sheet 1)
   * Single-page dashboard with KPIs, progress, blockers, and deadlines
   */
  private createExecutiveSummarySheet(summary: ExecutiveSummary, week: WeekInfo): void {
    const ws = this.addSheet('Executive Summary');
    const sm = this.getStyleManager();
    const kpi = this.localeStrings.kpi;
    const cols = this.localeStrings.columns;
    const priority = this.localeStrings.priority;
    let row = 1;

    // ===== HEADER SECTION =====
    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, 'EXECUTIVE SUMMARY');
    this.mergeCells(ws, row, 1, row, 8);
    this.setRowHeight(ws, row, 35);
    row++;

    // Date range and generation info
    const dateRangeStr = `${formatDate(summary.dateRange.start, 'MMM DD')} - ${formatDate(summary.dateRange.end, 'MMM DD, YYYY')}`;
    const metaCell = ws.getCell(row, 1);
    metaCell.value = `${week.formattedWeek} (${dateRangeStr}) | Generated: ${formatDate(summary.generatedAt, 'YYYY-MM-DD HH:mm')}`;
    metaCell.font = { size: 10, color: { argb: 'FF666666' }, italic: true };
    this.mergeCells(ws, row, 1, row, 8);
    row += 2;

    // ===== KPI BOXES SECTION =====
    const kpiBoxes = [
      { label: kpi.totalTasks, value: summary.kpis.totalTasks, color: 'D9E1F2' },
      { label: kpi.completed, value: summary.kpis.completedTasks, trend: 'up' as const, color: 'C6EFCE' },
      { label: kpi.activeBlockers || 'Blockers', value: summary.kpis.activeBlockers, color: summary.kpis.activeBlockers > 0 ? 'FFC7CE' : 'C6EFCE' },
      { label: kpi.totalFeatures || 'Features', value: summary.kpis.totalFeatures, color: 'E2EFDA' },
    ];

    row = ChartBuilder.addKPIBoxes(ws, kpiBoxes, row, 1, 4);
    row++;

    // ===== COMPLETION PROGRESS =====
    const completionHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(completionHeader, 'COMPLETION PROGRESS');
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    // Overall completion ring
    row = ChartBuilder.addCompletionRing(ws, 'Overall', summary.kpis.completedTasks, summary.kpis.totalTasks, row, 1);
    row++;

    // ===== PRIORITY BREAKDOWN =====
    const priorityHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(priorityHeader, 'PRIORITY BREAKDOWN');
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    const priorityItems = [
      { label: priority.p0 || 'P0', completed: summary.priorityBreakdown.p0.completed, pending: summary.priorityBreakdown.p0.total - summary.priorityBreakdown.p0.completed },
      { label: priority.p1 || 'P1', completed: summary.priorityBreakdown.p1.completed, pending: summary.priorityBreakdown.p1.total - summary.priorityBreakdown.p1.completed },
      { label: priority.p2 || 'P2', completed: summary.priorityBreakdown.p2.completed, pending: summary.priorityBreakdown.p2.total - summary.priorityBreakdown.p2.completed },
    ];

    row = ChartBuilder.addStackedComparison(ws, '', priorityItems, row, 1);
    row++;

    // ===== TOP BLOCKERS SECTION =====
    const blockersHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(blockersHeader, 'TOP BLOCKERS');
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    if (summary.topBlockers.length > 0) {
      // Headers
      const blockerHeaders = [cols.id, cols.name, cols.priority, 'Days Open'];
      for (let i = 0; i < blockerHeaders.length; i++) {
        const cell = ws.getCell(row, i + 1);
        cell.value = blockerHeaders[i];
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
      row++;

      // Blocker rows
      for (const blocker of summary.topBlockers) {
        ws.getCell(row, 1).value = blocker.id;
        ws.getCell(row, 2).value = blocker.title.substring(0, 40) + (blocker.title.length > 40 ? '...' : '');
        ws.getCell(row, 3).value = blocker.priority;
        ws.getCell(row, 4).value = blocker.daysOpen > 0 ? `${blocker.daysOpen}d` : '-';

        // Apply borders
        for (let col = 1; col <= 4; col++) {
          ws.getCell(row, col).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }
        row++;
      }
    } else {
      ws.getCell(row, 1).value = '✅ No active blockers';
      ws.getCell(row, 1).font = { color: { argb: 'FF006600' } };
      row++;
    }
    row++;

    // ===== UPCOMING DEADLINES SECTION =====
    const deadlinesHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(deadlinesHeader, 'UPCOMING DEADLINES (7 days)');
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    if (summary.upcomingDeadlines.length > 0) {
      // Headers
      const deadlineHeaders = [cols.name, cols.deadline, cols.owner, cols.priority];
      for (let i = 0; i < deadlineHeaders.length; i++) {
        const cell = ws.getCell(row, i + 1);
        cell.value = deadlineHeaders[i];
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
      row++;

      // Deadline rows
      for (const deadline of summary.upcomingDeadlines) {
        ws.getCell(row, 1).value = deadline.task.substring(0, 40) + (deadline.task.length > 40 ? '...' : '');
        ws.getCell(row, 2).value = formatDate(deadline.dueDate, 'MMM DD');
        ws.getCell(row, 3).value = deadline.owner || '-';
        ws.getCell(row, 4).value = deadline.priority;

        // Apply borders
        for (let col = 1; col <= 4; col++) {
          ws.getCell(row, col).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }
        row++;
      }
    } else {
      ws.getCell(row, 1).value = '📅 No deadlines in next 7 days';
      ws.getCell(row, 1).font = { color: { argb: 'FF666666' } };
      row++;
    }
    row++;

    // ===== TEAM WORKLOAD SECTION =====
    const workloadHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(workloadHeader, 'TEAM WORKLOAD');
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    if (summary.teamWorkload.length > 0) {
      for (const member of summary.teamWorkload) {
        const completionRate = member.taskCount > 0 ? Math.round((member.completedCount / member.taskCount) * 100) : 0;
        ChartBuilder.addProgressBar(
          ws,
          member.owner,
          member.completedCount,
          member.taskCount,
          row,
          1,
          completionRate >= 70 ? 'C6EFCE' : completionRate >= 40 ? 'FFEB9C' : 'FFC7CE'
        );
        row++;
      }
    } else {
      ws.getCell(row, 1).value = '👥 No assigned tasks';
      ws.getCell(row, 1).font = { color: { argb: 'FF666666' } };
      row++;
    }

    // Set column widths
    sm.setColumnWidths(ws, { 1: 25, 2: 30, 3: 15, 4: 12, 5: 12, 6: 12, 7: 12, 8: 12 });
    this.setSheetProperties(ws, { freezePanes: false });
  }

  /**
   * Sheet 1: Weekly Summary
   * Uses localized strings for all labels
   */
  private createSheet1WeeklySummary(
    dashboard: DashboardData,
    metrics: Metrics,
    weekInfo: WeekInfo
  ): void {
    const sheets = this.localeStrings.sheets;
    const kpi = this.localeStrings.kpi;
    const ws = this.addSheet(sheets.weeklySummary);
    const sm = this.getStyleManager();
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `${this.localeStrings.reports.weekly} - ${weekInfo.formattedWeek}`);
    this.mergeCells(ws, row, 1, row, 7);
    this.setRowHeight(ws, row, 30);
    row++;

    // Metadata
    const metaCell = ws.getCell(row, 1);
    metaCell.value = `${this.localeStrings.columns.date}: ${weekInfo.formattedDate}`;
    metaCell.font = { size: 10, color: { argb: 'FF666666' } };
    row += 2;

    // KPI Dashboard Boxes
    const kpiBoxes = [
      { label: kpi.totalTasks, value: metrics.totalTasks, color: 'D9E1F2' },
      { label: kpi.completed, value: metrics.completedTasks, trend: 'up' as const, color: 'C6EFCE' },
      { label: kpi.p0CompletionRate, value: `${Math.round(metrics.p0CompletionRate)}%`, color: metrics.p0CompletionRate >= 50 ? 'C6EFCE' : 'FFC7CE' },
      { label: kpi.blockers, value: metrics.activeBlockers || 0, color: metrics.activeBlockers > 0 ? 'FFC7CE' : 'C6EFCE' },
    ];

    row = ChartBuilder.addKPIBoxes(ws, kpiBoxes, row, 1, 4);
    row++;

    // Progress Completion Ring
    row = ChartBuilder.addCompletionRing(ws, kpi.totalTasks, metrics.completedTasks, metrics.totalTasks, row, 1);
    row++;

    // Key metrics section
    const cols = this.localeStrings.columns;
    const status = this.localeStrings.status;
    const kpiHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(kpiHeader, `${kpi.totalTasks} Details`);
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    // KPI table with localized headers
    const kpiHeaders = [cols.name, cols.target, cols.current, cols.percentage];
    const kpiData = [
      [`${this.localeStrings.priority.p0} ${kpi.completed}`, `${metrics.p0Total}`, `${metrics.p0Completed}`, `${Math.round(metrics.p0CompletionRate)}%`],
      [`${this.localeStrings.priority.p1} ${kpi.completed}`, `${metrics.p1Total}`, `${metrics.p1Completed}`, `${Math.round(metrics.p1CompletionRate)}%`],
    ];
    row = this.addTable(ws, kpiHeaders, kpiData, row, 1);
    row++;

    // Completed tasks section
    const completedHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(completedHeader, `${status.completed} ${kpi.totalTasks}`);
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    const completedTasks = dashboard.allTasks.filter(t => t.status === 'completed').slice(0, 5);
    if (completedTasks.length > 0) {
      for (const task of completedTasks) {
        const cell = ws.getCell(row, 1);
        cell.value = `- ${task.content}`;
        row++;
      }
    } else {
      ws.getCell(row, 1).value = `- (${this.localeStrings.messages.noData})`;
      row++;
    }
    row++;

    // Pending tasks section
    const planHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(planHeader, `${status.pending} ${kpi.totalTasks}`);
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    const pendingTasks = dashboard.p0Tasks.filter(t => t.status !== 'completed').slice(0, 5);
    if (pendingTasks.length > 0) {
      for (const task of pendingTasks) {
        const cell = ws.getCell(row, 1);
        cell.value = `- ${task.content}`;
        row++;
      }
    } else {
      ws.getCell(row, 1).value = `- (${this.localeStrings.messages.noData})`;
      row++;
    }

    // Set column widths
    sm.setColumnWidths(ws, { 1: 30, 2: 15, 3: 15, 4: 15 });
    this.setSheetProperties(ws, { freezePanes: false });
  }

  /**
   * Sheet 2: Roadmap Progress
   * Uses localized strings for sheet name and headers
   */
  private createSheet2RoadmapProgress(roadmap: RoadmapData): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const ws = this.addSheet(sheets.roadmapProgress);
    const sm = this.getStyleManager();

    const headers = [cols.id, cols.name, cols.priority, cols.status, cols.date, cols.deadline, cols.percentage];

    const data = roadmap.features.map(f => [
      f.id,
      f.name,
      f.priority,
      f.status,
      f.startDate || '-',
      f.completionDate || '-',
      f.progress ? `${f.progress}%` : '-',
    ]);

    this.addTable(ws, headers, data, 1, 1, {
      alternateColors: true,
      applyPriorityToColumn: 2,
      applyStatusToColumn: 3,
    });

    // Apply additional styling for priority and status columns
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const priority = roadmap.features[rowIdx]?.priority;
      const status = roadmap.features[rowIdx]?.status;

      if (priority) {
        sm.applyPriorityStyle(ws.getCell(rowIdx + 2, 3), priority);
      }
      if (status) {
        sm.applyStatusStyle(ws.getCell(rowIdx + 2, 4), status);
      }
    }

    this.setSheetProperties(ws, { autoFilter: true, filterRange: 'A1:G' + (data.length + 1) });
  }

  /**
   * Sheet 3: Task Details (Q1 Tasks)
   * Uses localized strings for sheet name and headers
   */
  private createSheet3Q1Tasks(quarterData: QuarterlyData, taskMaster?: TaskMasterData): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const status = this.localeStrings.status;
    const ws = this.addSheet(sheets.taskDetails);
    const sm = this.getStyleManager();

    const headers = [cols.category, cols.name, 'JIRA', cols.priority, cols.owner, cols.date, cols.deadline, 'Est.', cols.status];

    // Combine P0 and P1 tasks, prefer Task Master data if available
    const sourceTasks = taskMaster && taskMaster.allTasks.length > 0
      ? taskMaster.allTasks
      : [...quarterData.p0Tasks, ...quarterData.p1Tasks];

    const statusLabel = (s: string) =>
      s === 'completed' ? status.completed :
      s === 'in_progress' ? status.inProgress : status.pending;

    const data = sourceTasks.map(task => [
      task.category || task.areaTag || '-',
      task.content,
      task.jiraId || '-',
      task.priority || '-',
      task.owner || '-',
      task.startDate ? formatDate(task.startDate, 'MM/DD') : '-',
      task.dueDate ? formatDate(task.dueDate, 'MM/DD') : '-',
      task.estimatedTime || '-',
      statusLabel(task.status),
    ]);

    this.addTable(ws, headers, data, 1, 1, {
      alternateColors: true,
      applyPriorityToColumn: 3,
      applyStatusToColumn: 8,
    });

    // Apply styling
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const task = sourceTasks[rowIdx];
      if (task?.priority) {
        sm.applyPriorityStyle(ws.getCell(rowIdx + 2, 4), task.priority);
      }
      const statusCell = ws.getCell(rowIdx + 2, 9);
      sm.applyStatusStyle(statusCell, statusLabel(task?.status));
    }

    this.setSheetProperties(ws, { autoFilter: true, filterRange: 'A1:I' + (data.length + 1) });
  }

  /**
   * Sheet 4: Blocker Tracking
   * Uses localized strings for sheet name and headers
   */
  private createSheet4Blockers(blockerData: BlockerData): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const ws = this.addSheet(sheets.blockerTracking);
    const sm = this.getStyleManager();

    const headers = [cols.id, cols.name, cols.priority, cols.owner, cols.deadline, cols.impact, cols.status];

    const data = blockerData.allBlockers.map(b => [
      b.id,
      b.title,
      b.priority,
      b.owner,
      b.targetDate,
      b.impact,
      b.status,
    ]);

    this.addTable(ws, headers, data, 1, 1, {
      alternateColors: true,
      applyPriorityToColumn: 2,
      applyStatusToColumn: 6,
    });

    // Apply styling
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const blocker = blockerData.allBlockers[rowIdx];
      if (blocker) {
        sm.applyPriorityStyle(ws.getCell(rowIdx + 2, 3), blocker.priority);
        sm.applyStatusStyle(ws.getCell(rowIdx + 2, 7), blocker.status);
      }
    }

    this.setSheetProperties(ws, { autoFilter: true, filterRange: 'A1:G' + (data.length + 1) });
  }

  /**
   * Sheet 5: Coordination Items
   * Uses localized strings for sheet name and headers
   */
  private createSheet5Coordination(coordination: CoordinationItem[]): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const ws = this.addSheet(sheets.coordination);

    const headers = [cols.category, cols.content, cols.priority, cols.owner, cols.deadline, cols.status];

    // Use parsed data or fallback to default
    const data = coordination.length > 0
      ? coordination.map(c => [c.category, c.content, c.priority, c.owner, c.deadline, c.status])
      : this.getDefaultCoordinationData();

    this.addTable(ws, headers, data, 1, 1, { alternateColors: true });
    this.setSheetProperties(ws);
  }

  /**
   * Default coordination data when no parsed data available
   * Uses localized strings for status and priority values
   */
  private getDefaultCoordinationData(): string[][] {
    return [];
  }

  /**
   * Sheet 6: Milestones
   * Uses localized strings for sheet name and headers
   */
  private createSheet6Milestones(milestones: MilestoneItem[]): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const ws = this.addSheet(sheets.milestones);

    const headers = [cols.date, cols.name, cols.target, cols.status, cols.risk];

    // Use parsed data or fallback to default
    const data = milestones.length > 0
      ? milestones.map(m => [m.date, m.name, m.target, m.status, m.risk])
      : this.getDefaultMilestoneData();

    this.addTable(ws, headers, data, 1, 1, { alternateColors: true });
    this.setSheetProperties(ws);
  }

  /**
   * Default milestone data when no parsed data available
   * Uses localized strings for status and risk values
   */
  private getDefaultMilestoneData(): string[][] {
    return [];
  }

  /**
   * Sheet 7: Playbook Progress
   * Uses localized strings for sheet name and headers
   */
  private createSheet7PlaybookProgress(playbook: PlaybookItem[]): void {
    const sheets = this.localeStrings.sheets;
    const kpi = this.localeStrings.kpi;
    const ws = this.addSheet(sheets.playbookProgress);
    const sm = this.getStyleManager();
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `${sheets.playbookProgress} Dashboard`);
    this.mergeCells(ws, row, 1, row, 5);
    this.setRowHeight(ws, row, 25);
    row += 2;

    // Visual Progress Section
    const progressHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(progressHeader, `${kpi.inProgress} Overview`);
    this.mergeCells(ws, row, 1, row, 5);
    row++;

    // Use parsed data or fallback to default
    const progressItems = playbook.length > 0
      ? playbook.map(p => ({
          label: p.name,
          current: p.current,
          total: p.target,
          color: this.getProgressColor(p.percentage),
        }))
      : this.getDefaultPlaybookProgressItems();

    for (const item of progressItems) {
      ChartBuilder.addProgressBar(ws, item.label, item.current, item.total, row, 1, item.color);
      row++;
    }

    row += 2;

    // Detail Table Section
    const cols = this.localeStrings.columns;
    const detailHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(detailHeader, `${cols.description} Breakdown`);
    this.mergeCells(ws, row, 1, row, 5);
    row++;

    const headers = [cols.name, cols.target, cols.current, cols.percentage, cols.status];

    const data = playbook.length > 0
      ? playbook.map(p => [
          p.name,
          `${p.target}${this.localeStrings.units.items}`,
          `${p.current}${this.localeStrings.units.items}`,
          `${p.percentage}%`,
          p.status,
        ])
      : this.getDefaultPlaybookTableData();

    row = this.addTable(ws, headers, data, row, 1, { alternateColors: true });

    // Apply status coloring
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const status = data[rowIdx][4];
      sm.applyStatusStyle(ws.getCell(row - data.length + rowIdx - 1, 5), status);
    }

    sm.setColumnWidths(ws, { 1: 20, 2: 15, 3: 15, 4: 10, 5: 10 });
    this.setSheetProperties(ws);
  }

  /**
   * Get color based on progress percentage
   */
  private getProgressColor(percentage: number): string {
    if (percentage >= 100) return 'C6EFCE'; // Green - complete
    if (percentage >= 50) return 'FFEB9C';  // Yellow - in progress
    return 'FFC7CE';                         // Red - low progress
  }

  /**
   * Default playbook progress items when no parsed data available
   */
  private getDefaultPlaybookProgressItems(): { label: string; current: number; total: number; color: string }[] {
    return [];
  }

  /**
   * Default playbook table data when no parsed data available
   * Uses localized strings for status values
   */
  private getDefaultPlaybookTableData(): string[][] {
    return [];
  }

  /**
   * Sheet 9: Customer Requests Status
   * Shows customer request tracking with priority breakdown
   */
  private createSheet8CustomerRequests(customerData: CustomerRequestData): void {
    const ws = this.addSheet(this.localeStrings.customerRequests.sheetName);
    const sm = this.getStyleManager();
    const cols = this.localeStrings.columns;
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `${this.localeStrings.customerRequests.title} - ${customerData.customer || 'N/A'}`);
    this.mergeCells(ws, row, 1, row, 7);
    this.setRowHeight(ws, row, 30);
    row++;

    // Summary KPI
    const total = customerData.totalRequests;
    const completed = customerData.completedCount;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const metaCell = ws.getCell(row, 1);
    metaCell.value = `${this.localeStrings.customerRequests.totalRequests}: ${total}${this.localeStrings.units.count} | ${this.localeStrings.kpi.completed}: ${completed}${this.localeStrings.units.count} (${rate}%)`;
    metaCell.font = { size: 10, color: { argb: 'FF666666' }, italic: true };
    this.mergeCells(ws, row, 1, row, 7);
    row += 2;

    // KPI Boxes
    const kpiBoxes = [
      { label: this.localeStrings.customerRequests.totalRequests, value: total, color: 'D9E1F2' },
      { label: this.localeStrings.kpi.completed, value: completed, color: 'C6EFCE' },
      { label: this.localeStrings.kpi.inProgress, value: total - completed, color: completed < total ? 'FFEB9C' : 'C6EFCE' },
      { label: this.localeStrings.customerRequests.completionRate, value: `${rate}%`, color: rate >= 50 ? 'C6EFCE' : 'FFC7CE' },
    ];
    row = ChartBuilder.addKPIBoxes(ws, kpiBoxes, row, 1, 4);
    row += 2;

    if (customerData.requests.length === 0) {
      ws.getCell(row, 1).value = this.localeStrings.messages.noData;
      ws.getCell(row, 1).font = { color: { argb: 'FF666666' } };
      sm.setColumnWidths(ws, { 1: 15, 2: 30, 3: 15, 4: 12, 5: 15, 6: 12, 7: 20 });
      this.setSheetProperties(ws, { freezePanes: false });
      return;
    }

    // Priority sections
    const cr = this.localeStrings.customerRequests;
    const priorityLabels: Record<number, string> = {
      1: cr.priorityRequired,
      2: cr.priorityImportant,
      3: cr.priorityNormal,
      4: cr.priorityDeferred,
    };

    const priorityColors: Record<number, string> = {
      1: 'FFC7CE',  // Red
      2: 'FFEB9C',  // Yellow
      3: 'D9E1F2',  // Blue
      4: 'E2EFDA',  // Green
    };

    for (const priority of [1, 2, 3, 4]) {
      const requests = customerData.byPriority[priority] || [];
      if (requests.length === 0) continue;

      // Section header
      const sectionHeader = ws.getCell(row, 1);
      sm.applySubheaderStyle(sectionHeader, priorityLabels[priority] || `P${priority}`);
      this.mergeCells(ws, row, 1, row, 7);
      row++;

      // Table headers
      const headers = [cr.number, cr.requestContent, cr.linkedFeature, cols.quarter, cols.status, cr.linkedTask];
      for (let i = 0; i < headers.length; i++) {
        const cell = ws.getCell(row, i + 1);
        cell.value = headers[i];
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (priorityColors[priority] || 'D9E1F2') } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
      row++;

      // Data rows
      for (const req of requests) {
        ws.getCell(row, 1).value = req.id;
        ws.getCell(row, 2).value = req.title;
        ws.getCell(row, 3).value = req.linkedFeature || '-';
        ws.getCell(row, 4).value = req.dueDate || '-';
        ws.getCell(row, 5).value = req.status;
        ws.getCell(row, 6).value = req.description || '-';

        // Apply borders and status colors
        for (let col = 1; col <= 6; col++) {
          ws.getCell(row, col).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        }

        // Color status cell
        const statusStr = req.status;
        if (isInProgress(statusStr)) {
          ws.getCell(row, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
        } else if (isScheduled(statusStr)) {
          ws.getCell(row, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        } else if (isBlocker(statusStr)) {
          ws.getCell(row, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
        } else if (isCompleted(statusStr)) {
          ws.getCell(row, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
        }
        row++;
      }
      row++; // Space between priority sections
    }

    sm.setColumnWidths(ws, { 1: 8, 2: 35, 3: 18, 4: 12, 5: 12, 6: 25 });
    this.setSheetProperties(ws, { freezePanes: false });
  }
}
