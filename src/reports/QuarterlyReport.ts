/**
 * Quarterly Report Generator
 * Generates 4-sheet quarterly status report
 * Equivalent to Python reports/quarterly_report.py
 * v2.0 - Enhanced with ConfigManager for i18n
 */

import { App } from 'obsidian';
import { ExcelGenerator } from '../generators/ExcelGenerator';
import { DataAggregator } from '../services/DataAggregator';
import { ConfigManager } from '../services/ConfigManager';
import { MetricsCalculator } from '../services/MetricsCalculator';
import { ExcelAutomationSettings } from '../types/settings';
import { LocaleStrings } from '../types/config';
import { QuarterlyData, Metrics, TaskMasterData, CustomerRequestData } from '../types/data';
import { getCurrentQuarterInfo, formatDate, isOverdue } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import { isCompleted, isInProgress, isScheduled } from '../utils/statusUtils';
import { ChartBuilder } from '../generators/ChartBuilder';
import { getDefaultLocaleStrings } from '../config/presets';

export class QuarterlyReportGenerator extends ExcelGenerator {
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
    this.localeStrings = configManager?.getLocaleStrings() || getDefaultLocaleStrings();
  }

  /**
   * Generate quarterly report with 6 sheets
   */
  async generate(quarter?: number, year?: number): Promise<ArrayBuffer> {
    const quarterInfo = getCurrentQuarterInfo();
    const targetQuarter = quarter || quarterInfo.quarter;
    const targetYear = year || quarterInfo.year;

    logger.info(`Generating Quarterly Report for Q${targetQuarter} ${targetYear}...`);

    // Load all quarterly data in parallel
    const [q1Data, taskMaster, customerRequests] = await Promise.all([
      this.aggregator.loadQuarterlyData(targetQuarter),
      this.aggregator.loadTaskMasterData(targetQuarter),
      this.aggregator.loadCustomerRequestData(),
    ]);

    // Calculate metrics
    const metrics = MetricsCalculator.calculateQuarterlyMetrics(q1Data);

    // Create workbook
    this.createWorkbook();

    // Generate 6 sheets
    logger.debug('Creating Sheet 1: Overview');
    this.createSheet1Overview(q1Data, metrics as Metrics, targetQuarter, targetYear);

    logger.debug('Creating Sheet 2: P0 Tasks');
    this.createSheet2P0Tasks(q1Data);

    logger.debug('Creating Sheet 3: P1 Tasks');
    this.createSheet3P1Tasks(q1Data);

    logger.debug('Creating Sheet 4: Progress Analytics');
    this.createSheet4Analytics(q1Data, metrics as Metrics);

    logger.debug('Creating Sheet 5: Weekly Breakdown');
    this.createSheet5WeeklyBreakdown(taskMaster);

    logger.debug('Creating Sheet 6: Customer Requests');
    this.createSheet6CustomerRequests(customerRequests);

    logger.info('Quarterly report generated successfully');
    return this.generateBuffer();
  }

  /**
   * Sheet 1: Overview (Summary & KPIs)
   * Uses localized strings for labels
   */
  private createSheet1Overview(
    _data: QuarterlyData,
    metrics: Metrics,
    quarter: number,
    year: number
  ): void {
    const sheets = this.localeStrings.sheets;
    const kpiLabels = this.localeStrings.kpi;
    const cols = this.localeStrings.columns;
    const projectName = this.configManager?.getSources()?.projectName;
    const ws = this.addSheet(sheets.quarterlyOverview);
    const sm = this.getStyleManager();
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `${projectName ? projectName + ' ' : ''}Q${quarter} ${year} ${this.localeStrings.reports.quarterly}`);
    this.mergeCells(ws, row, 1, row, 6);
    this.setRowHeight(ws, row, 30);
    row++;

    // Date
    const dateCell = ws.getCell(row, 1);
    dateCell.value = `${cols.date}: ${formatDate(new Date())}`;
    dateCell.font = { size: 10, color: { argb: 'FF666666' } };
    row += 2;

    // KPI Boxes
    const kpis = [
      { label: kpiLabels.totalTasks, value: `${metrics.totalTasks}` },
      { label: kpiLabels.p0CompletionRate, value: `${Math.round(metrics.completionRate)}%` },
      { label: `${this.localeStrings.priority.p0} ${kpiLabels.completed}`, value: `${metrics.p0Completed}/${metrics.p0Total}` },
      { label: `${this.localeStrings.priority.p1} ${kpiLabels.completed}`, value: `${metrics.p1Completed}/${metrics.p1Total}` },
    ];

    row = this.addMetricBoxes(ws, kpis, row, 1, 4);
    row++;

    // Task Breakdown
    const breakdownHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(breakdownHeader, 'Task Breakdown by Priority');
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    const breakdownHeaders = ['Priority', 'Total', 'Completed', 'Completion %'];
    const breakdownData = [
      ['P0 (Critical)', metrics.p0Total, metrics.p0Completed, `${Math.round(metrics.p0CompletionRate)}%`],
      ['P1 (High)', metrics.p1Total, metrics.p1Completed, `${Math.round(metrics.p1CompletionRate)}%`],
      ['P2 (Normal)', metrics.p2Total, metrics.p2Completed, `${Math.round(metrics.p2CompletionRate)}%`],
    ];

    row = this.addTable(ws, breakdownHeaders, breakdownData, row, 1);
    row++;

    // Status Summary
    const statusHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(statusHeader, 'Status Summary');
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    const statusData: Record<string, string | number> = {
      'Total Tasks': metrics.totalTasks,
      'Completed': metrics.completedTasks,
      'In Progress': metrics.pendingTasks,
      'Completion Rate': `${Math.round(metrics.completionRate)}%`,
    };

    row = this.addSummarySection(ws, '', statusData, row, 1);

    sm.setColumnWidths(ws, { 1: 20, 2: 15, 3: 15, 4: 15 });
    this.setSheetProperties(ws, { freezePanes: false });
  }

  /**
   * Sheet 2: P0 Tasks (Critical tasks detail)
   * Uses localized strings for sheet name and labels
   */
  private createSheet2P0Tasks(data: QuarterlyData): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const status = this.localeStrings.status;
    const ws = this.addSheet(sheets.p0Tasks);
    const sm = this.getStyleManager();
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `${this.localeStrings.priority.p0} ${this.localeStrings.kpi.totalTasks}`);
    this.mergeCells(ws, row, 1, row, 6);
    this.setRowHeight(ws, row, 25);
    row += 2;

    const headers = [cols.id, cols.name, cols.status, cols.deadline, cols.category, cols.percentage];

    const tableData = data.p0Tasks.map((task, idx) => [
      `P0-${String(idx + 1).padStart(2, '0')}`,
      task.content,
      task.status ? status.completed : status.inProgress,
      task.dueDate ? formatDate(task.dueDate, 'MM/DD') : '-',
      task.tags.join(', ') || '-',
      task.status ? '100%' : '-',
    ]);

    row = this.addTable(ws, headers, tableData, row, 1, {
      alternateColors: true,
      applyStatusToColumn: 2,
    });

    // Apply status and overdue styling
    for (let i = 0; i < data.p0Tasks.length; i++) {
      const task = data.p0Tasks[i];
      const statusCell = ws.getCell(i + 4, 3); // row = header(3) + data row
      sm.applyStatusStyle(statusCell, task.status ? status.completed : status.inProgress);

      // Highlight overdue
      if (!task.status && isOverdue(task.dueDate)) {
        const dueDateCell = ws.getCell(i + 4, 4);
        dueDateCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' },
        };
      }
    }

    // Summary at bottom
    row++;
    const summaryData: Record<string, string | number> = {
      'Total P0 Tasks': data.p0Total,
      'Completed': data.p0Completed,
      'Remaining': data.p0Total - data.p0Completed,
      'Completion Rate': `${data.p0Total > 0 ? Math.round((data.p0Completed / data.p0Total) * 100) : 0}%`,
    };

    this.addSummarySection(ws, 'P0 Summary', summaryData, row, 1);

    this.setSheetProperties(ws, { autoFilter: true, filterRange: `A3:F${data.p0Tasks.length + 3}` });
  }

  /**
   * Sheet 3: P1 Tasks (High priority tasks detail)
   * Uses localized strings for sheet name and labels
   */
  private createSheet3P1Tasks(data: QuarterlyData): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const status = this.localeStrings.status;
    const ws = this.addSheet(sheets.p1Tasks);
    const sm = this.getStyleManager();
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `${this.localeStrings.priority.p1} ${this.localeStrings.kpi.totalTasks}`);
    this.mergeCells(ws, row, 1, row, 6);
    this.setRowHeight(ws, row, 25);
    row += 2;

    const headers = [cols.id, cols.name, cols.status, cols.deadline, cols.category, cols.percentage];

    const tableData = data.p1Tasks.map((task, idx) => [
      `P1-${String(idx + 1).padStart(2, '0')}`,
      task.content,
      task.status ? status.completed : status.inProgress,
      task.dueDate ? formatDate(task.dueDate, 'MM/DD') : '-',
      task.tags.join(', ') || '-',
      task.status ? '100%' : '-',
    ]);

    row = this.addTable(ws, headers, tableData, row, 1, {
      alternateColors: true,
      applyStatusToColumn: 2,
    });

    // Apply status styling
    for (let i = 0; i < data.p1Tasks.length; i++) {
      const task = data.p1Tasks[i];
      const statusCell = ws.getCell(i + 4, 3);
      sm.applyStatusStyle(statusCell, task.status ? status.completed : status.inProgress);

      // Highlight overdue
      if (!task.status && isOverdue(task.dueDate)) {
        const dueDateCell = ws.getCell(i + 4, 4);
        dueDateCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' },
        };
      }
    }

    // Summary at bottom
    row++;
    const summaryData: Record<string, string | number> = {
      'Total P1 Tasks': data.p1Total,
      'Completed': data.p1Completed,
      'Remaining': data.p1Total - data.p1Completed,
      'Completion Rate': `${data.p1Total > 0 ? Math.round((data.p1Completed / data.p1Total) * 100) : 0}%`,
    };

    this.addSummarySection(ws, 'P1 Summary', summaryData, row, 1);

    this.setSheetProperties(ws, { autoFilter: true, filterRange: `A3:F${data.p1Tasks.length + 3}` });
  }

  /**
   * Sheet 4: Progress Analytics
   * Uses localized strings for sheet name and labels
   */
  private createSheet4Analytics(_data: QuarterlyData, metrics: Metrics): void {
    const sheets = this.localeStrings.sheets;
    const ws = this.addSheet(sheets.progressAnalytics);
    const sm = this.getStyleManager();
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, sheets.progressAnalytics);
    this.mergeCells(ws, row, 1, row, 6);
    this.setRowHeight(ws, row, 25);
    row += 2;

    // KPI Dashboard
    const kpis = [
      { label: 'Total Tasks', value: metrics.totalTasks, color: 'D9E1F2' },
      { label: 'Completed', value: metrics.completedTasks, trend: 'up' as const, color: 'C6EFCE' },
      { label: 'Completion Rate', value: `${Math.round(metrics.completionRate)}%`, color: 'D9E1F2' },
      { label: 'P0 Progress', value: `${Math.round(metrics.p0CompletionRate)}%`, color: metrics.p0CompletionRate >= 50 ? 'C6EFCE' : 'FFC7CE' },
    ];

    row = ChartBuilder.addKPIBoxes(ws, kpis, row, 1, 4);
    row += 1;

    // Completion Pie Chart
    const pieData = [
      { label: 'Completed', value: metrics.completedTasks, color: 'C6EFCE' },
      { label: 'Pending', value: metrics.pendingTasks, color: 'FFC7CE' },
    ];

    row = ChartBuilder.addPieChartData(ws, pieData, row, 1, { title: 'Task Completion Status' });
    row += 1;

    // Priority Stacked Comparison
    const priorityItems = [
      { label: 'P0 (Critical)', completed: metrics.p0Completed, pending: metrics.p0Total - metrics.p0Completed },
      { label: 'P1 (High)', completed: metrics.p1Completed, pending: metrics.p1Total - metrics.p1Completed },
      { label: 'P2 (Normal)', completed: metrics.p2Completed, pending: metrics.p2Total - metrics.p2Completed },
    ];

    row = ChartBuilder.addStackedComparison(ws, 'Progress by Priority', priorityItems, row, 1);
    row += 1;

    // Priority Distribution Bar Chart
    const categories = ['P0', 'P1', 'P2'];
    const barSeries = [
      { name: 'Total', values: [metrics.p0Total, metrics.p1Total, metrics.p2Total] },
      { name: 'Completed', values: [metrics.p0Completed, metrics.p1Completed, metrics.p2Completed] },
    ];

    row = ChartBuilder.addBarChartData(ws, categories, barSeries, row, 1, { title: 'Task Distribution by Priority' });
    row += 1;

    // Completion Summary Table
    const completionHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(completionHeader, 'Detailed Completion Summary');
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    const completionHeaders = ['Category', 'Total', 'Completed', 'Rate'];
    const completionData = [
      ['All Tasks', metrics.totalTasks, metrics.completedTasks, `${Math.round(metrics.completionRate)}%`],
      ['P0 Tasks', metrics.p0Total, metrics.p0Completed, `${Math.round(metrics.p0CompletionRate)}%`],
      ['P1 Tasks', metrics.p1Total, metrics.p1Completed, `${Math.round(metrics.p1CompletionRate)}%`],
      ['P2 Tasks', metrics.p2Total, metrics.p2Completed, `${Math.round(metrics.p2CompletionRate)}%`],
    ];

    row = this.addTable(ws, completionHeaders, completionData, row, 1);

    sm.setColumnWidths(ws, { 1: 20, 2: 15, 3: 15, 4: 25, 5: 15, 6: 15 });
    this.setSheetProperties(ws, { freezePanes: false });
  }

  /**
   * Sheet 5: Weekly Breakdown from Task Master
   * Shows task progress per week within the quarter
   */
  private createSheet5WeeklyBreakdown(taskMaster: TaskMasterData): void {
    const wb5 = this.localeStrings.weeklyBreakdown;
    const ws = this.addSheet(wb5.sheetName);
    const sm = this.getStyleManager();
    const cols = this.localeStrings.columns;
    const status = this.localeStrings.status;
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `Q${taskMaster.quarter} ${wb5.title}`);
    this.mergeCells(ws, row, 1, row, 7);
    this.setRowHeight(ws, row, 30);
    row++;

    // Theme and target
    if (taskMaster.theme) {
      const themeCell = ws.getCell(row, 1);
      themeCell.value = `${wb5.theme}: ${taskMaster.theme} | ${wb5.targetAcceptance}: ${taskMaster.targetAcceptance}%`;
      themeCell.font = { size: 10, color: { argb: 'FF666666' }, italic: true };
      this.mergeCells(ws, row, 1, row, 7);
      row++;
    }
    row++;

    if (taskMaster.weeklyBreakdowns.length === 0) {
      ws.getCell(row, 1).value = this.localeStrings.messages.noData;
      ws.getCell(row, 1).font = { color: { argb: 'FF666666' } };
      sm.setColumnWidths(ws, { 1: 12, 2: 15, 3: 35, 4: 15, 5: 15, 6: 12, 7: 12 });
      this.setSheetProperties(ws, { freezePanes: false });
      return;
    }

    // Weekly Summary Table
    const summaryHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(summaryHeader, wb5.summary);
    this.mergeCells(ws, row, 1, row, 5);
    row++;

    const summaryHeaders = [cols.week, wb5.period, wb5.newTasks, wb5.dueTasks, wb5.milestone];
    const summaryData = taskMaster.weeklyBreakdowns.map(wb => [
      `W${String(wb.weekNumber).padStart(2, '0')}`,
      wb.weekRange,
      String(wb.newTasks.length),
      String(wb.dueTasks.length),
      wb.milestones.length > 0 ? wb.milestones.join(', ') : '-',
    ]);

    row = this.addTable(ws, summaryHeaders, summaryData, row, 1, { alternateColors: true });
    row += 2;

    // Detailed per-week sections
    for (const wb of taskMaster.weeklyBreakdowns) {
      // Week header
      const weekHeader = ws.getCell(row, 1);
      sm.applySubheaderStyle(weekHeader, `W${String(wb.weekNumber).padStart(2, '0')} (${wb.weekRange})`);
      this.mergeCells(ws, row, 1, row, 7);
      row++;

      // New tasks this week
      if (wb.newTasks.length > 0) {
        const newLabel = ws.getCell(row, 1);
        newLabel.value = '🚀 ' + wb5.newStart;
        newLabel.font = { bold: true, size: 10 };
        row++;

        const taskHeaders = [cols.name, 'JIRA', cols.priority, cols.owner, cols.deadline, cols.status];
        const taskData = wb.newTasks.map(t => [
          t.content,
          t.jiraId || '-',
          t.priority || 'P2',
          t.owner || '-',
          t.dueDate ? t.dueDate.toISOString().substring(5, 10).replace('-', '/') : '-',
          t.status ? status.completed : status.inProgress,
        ]);

        row = this.addTable(ws, taskHeaders, taskData, row, 1, { alternateColors: true });
        row++;
      }

      // Due tasks this week
      if (wb.dueTasks.length > 0) {
        const dueLabel = ws.getCell(row, 1);
        dueLabel.value = '📅 ' + wb5.dueUpcoming;
        dueLabel.font = { bold: true, size: 10 };
        row++;

        const taskHeaders = [cols.name, 'JIRA', cols.priority, cols.owner, cols.deadline, cols.status];
        const taskData = wb.dueTasks.map(t => [
          t.content,
          t.jiraId || '-',
          t.priority || 'P2',
          t.owner || '-',
          t.dueDate ? t.dueDate.toISOString().substring(5, 10).replace('-', '/') : '-',
          t.status ? status.completed : status.inProgress,
        ]);

        row = this.addTable(ws, taskHeaders, taskData, row, 1, { alternateColors: true });
        row++;
      }

      // Milestones
      if (wb.milestones.length > 0) {
        const msLabel = ws.getCell(row, 1);
        msLabel.value = '🎯 ' + wb5.milestoneLabel;
        msLabel.font = { bold: true, size: 10 };
        row++;

        for (const ms of wb.milestones) {
          ws.getCell(row, 1).value = `  • ${ms}`;
          row++;
        }
        row++;
      }

      row++; // Space between weeks
    }

    sm.setColumnWidths(ws, { 1: 30, 2: 12, 3: 10, 4: 12, 5: 12, 6: 10, 7: 10 });
    this.setSheetProperties(ws, { freezePanes: false });
  }

  /**
   * Sheet 6: Customer Request Tracking
   * Shows customer request fulfillment status
   */
  private createSheet6CustomerRequests(customerData: CustomerRequestData): void {
    const cr = this.localeStrings.customerRequests;
    const ws = this.addSheet(cr.trackingSheetName);
    const sm = this.getStyleManager();
    const cols = this.localeStrings.columns;
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `${cr.trackingTitle} - ${customerData.customer || 'N/A'}`);
    this.mergeCells(ws, row, 1, row, 6);
    this.setRowHeight(ws, row, 30);
    row++;

    // Summary
    const total = customerData.totalRequests;
    const completed = customerData.completedCount;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const metaCell = ws.getCell(row, 1);
    metaCell.value = `${cr.totalRequests}: ${total}${this.localeStrings.units.count} | ${this.localeStrings.kpi.completed}: ${completed}${this.localeStrings.units.count} (${rate}%)`;
    metaCell.font = { size: 10, color: { argb: 'FF666666' }, italic: true };
    this.mergeCells(ws, row, 1, row, 6);
    row += 2;

    // Completion ring
    row = ChartBuilder.addCompletionRing(ws, cr.completionRate, completed, total, row, 1);
    row += 2;

    if (customerData.requests.length === 0) {
      ws.getCell(row, 1).value = this.localeStrings.messages.noData;
      ws.getCell(row, 1).font = { color: { argb: 'FF666666' } };
      sm.setColumnWidths(ws, { 1: 8, 2: 30, 3: 15, 4: 12, 5: 12, 6: 20 });
      this.setSheetProperties(ws, { freezePanes: false });
      return;
    }

    // Priority breakdown summary
    const breakdownHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(breakdownHeader, cr.byPriorityStatus);
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    const priorityLabels: Record<number, string> = {
      1: cr.priorityRequired,
      2: cr.priorityImportant,
      3: cr.priorityNormal,
      4: cr.priorityDeferred,
    };

    const priorityItems = [1, 2, 3, 4]
      .map(p => {
        const reqs = customerData.byPriority[p] || [];
        const done = reqs.filter(r => isCompleted(r.status)).length;
        return {
          label: priorityLabels[p] || `P${p}`,
          completed: done,
          pending: reqs.length - done,
        };
      })
      .filter(item => item.completed + item.pending > 0);

    row = ChartBuilder.addStackedComparison(ws, '', priorityItems, row, 1);
    row += 2;

    // Full request table
    const tableHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(tableHeader, cr.allRequestsList);
    this.mergeCells(ws, row, 1, row, 6);
    row++;

    const headers = [cr.number, cr.requestContent, cols.priority, cols.quarter, cols.status, cr.linkedFeature];
    const tableData = customerData.requests.map(req => [
      req.id,
      req.title,
      priorityLabels[req.priority] || `P${req.priority}`,
      req.dueDate || '-',
      req.status,
      req.linkedFeature || '-',
    ]);

    row = this.addTable(ws, headers, tableData, row, 1, { alternateColors: true });

    // Apply status styling to table
    for (let i = 0; i < customerData.requests.length; i++) {
      const req = customerData.requests[i];
      const statusCell = ws.getCell(row - tableData.length + i - 1, 5);
      const statusStr = req.status;
      if (isInProgress(statusStr)) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
      } else if (isScheduled(statusStr)) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      } else if (statusStr.includes('⚠️')) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      } else if (isCompleted(statusStr)) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
      }
    }

    sm.setColumnWidths(ws, { 1: 8, 2: 30, 3: 15, 4: 12, 5: 12, 6: 20 });
    this.setSheetProperties(ws, { freezePanes: false });
  }
}
