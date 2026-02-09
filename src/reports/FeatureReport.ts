/**
 * Feature Progress Report Generator
 * Generates 3-sheet report analyzing all feature files
 * v2.0 - Enhanced with ConfigManager for i18n
 */

import { App } from 'obsidian';
import { ExcelGenerator } from '../generators/ExcelGenerator';
import { DataAggregator } from '../services/DataAggregator';
import { ConfigManager } from '../services/ConfigManager';
import { ExcelAutomationSettings } from '../types/settings';
import { LocaleStrings } from '../types/config';
import { RoadmapData } from '../types/data';
import { Feature, Priority } from '../types/models';
import { formatDate } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import { isCompleted, isInProgress, isPending } from '../utils/statusUtils';
import { ChartBuilder } from '../generators/ChartBuilder';
import { getDefaultLocaleStrings } from '../config/presets';

export class FeatureReportGenerator extends ExcelGenerator {
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
   * Generate feature progress report with 3 sheets
   */
  async generate(): Promise<ArrayBuffer> {
    logger.info('Generating Feature Progress Report...');

    // Load roadmap data (which contains all features)
    const roadmap = await this.aggregator.loadRoadmapData();

    // Create workbook
    this.createWorkbook();

    // Generate 3 sheets
    logger.debug('Creating Sheet 1: All Features');
    this.createSheet1AllFeatures(roadmap);

    logger.debug('Creating Sheet 2: By Priority');
    this.createSheet2ByPriority(roadmap);

    logger.debug('Creating Sheet 3: By Cycle');
    this.createSheet3ByCycle(roadmap);

    logger.info('Feature report generated successfully');
    return this.generateBuffer();
  }

  /**
   * Sheet 1: All Features (Master List)
   * Uses localized strings for sheet name and labels
   */
  private createSheet1AllFeatures(roadmap: RoadmapData): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const status = this.localeStrings.status;
    const kpiLabels = this.localeStrings.kpi;
    const ws = this.addSheet(sheets.allFeatures);
    const sm = this.getStyleManager();
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `${this.localeStrings.reports.feature} - ${sheets.allFeatures}`);
    this.mergeCells(ws, row, 1, row, 8);
    this.setRowHeight(ws, row, 30);
    row++;

    // Generated date
    const dateCell = ws.getCell(row, 1);
    dateCell.value = `${cols.date}: ${formatDate(new Date())}`;
    dateCell.font = { size: 10, color: { argb: 'FF666666' } };
    row += 2;

    // Calculate metrics - check both Korean and English status values
    const features = roadmap.features;
    const completed = features.filter(f => isCompleted(f.status)).length;
    const inProgress = features.filter(f => isInProgress(f.status)).length;
    const pending = features.filter(f => isPending(f.status)).length;
    const completionRate = features.length > 0 ? Math.round((completed / features.length) * 100) : 0;

    // KPI Dashboard Boxes
    const kpis = [
      { label: kpiLabels.totalFeatures, value: features.length, color: 'D9E1F2' },
      { label: kpiLabels.completed, value: completed, trend: 'up' as const, color: 'C6EFCE' },
      { label: kpiLabels.inProgress, value: inProgress, color: 'FFEB9C' },
      { label: kpiLabels.p0CompletionRate, value: `${completionRate}%`, color: completionRate >= 70 ? 'C6EFCE' : 'FFC7CE' },
    ];

    row = ChartBuilder.addKPIBoxes(ws, kpis, row, 1, 4);
    row++;

    // Completion Status Pie Chart
    const pieData = [
      { label: status.completed, value: completed, color: 'C6EFCE' },
      { label: status.inProgress, value: inProgress, color: 'FFEB9C' },
      { label: status.pending, value: pending, color: 'FFC7CE' },
    ];

    row = ChartBuilder.addPieChartData(ws, pieData, row, 1, { title: 'Feature Status Distribution' });
    row++;

    // Features table
    const featuresHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(featuresHeader, 'All Features List');
    this.mergeCells(ws, row, 1, row, 8);
    row++;

    const headers = [cols.id, cols.name, cols.priority, cols.status, cols.date, cols.deadline, cols.percentage, kpiLabels.blockers];

    const tableData = features.map(f => [
      f.id,
      f.name,
      f.priority,
      f.status,
      f.startDate || '-',
      f.completionDate || '-',
      `${f.progress}%`,
      f.blocker || '-',
    ]);

    row = this.addTable(ws, headers, tableData, row, 1, {
      alternateColors: true,
    });

    // Apply styling to specific columns
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const dataRow = row - features.length - 1 + i;

      // Priority column (3)
      sm.applyPriorityStyle(ws.getCell(dataRow, 3), feature.priority);

      // Status column (4)
      sm.applyStatusStyle(ws.getCell(dataRow, 4), feature.status);

      // Progress column - color based on percentage
      const progressCell = ws.getCell(dataRow, 7);
      if (feature.progress >= 80) {
        progressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
      } else if (feature.progress >= 50) {
        progressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
      } else if (feature.progress > 0) {
        progressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      }
    }

    sm.setColumnWidths(ws, { 1: 8, 2: 35, 3: 10, 4: 12, 5: 12, 6: 12, 7: 10, 8: 15 });
    this.setSheetProperties(ws, { autoFilter: true, filterRange: `A${row - features.length - 1}:H${row - 1}` });
  }

  /**
   * Sheet 2: By Priority (P0/P1/P2 Analysis)
   * Uses localized strings for sheet name and labels
   */
  private createSheet2ByPriority(roadmap: RoadmapData): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const kpiLabels = this.localeStrings.kpi;
    const priorityLabels = this.localeStrings.priority;
    const ws = this.addSheet(sheets.byPriority);
    const sm = this.getStyleManager();
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `${kpiLabels.totalFeatures} - ${sheets.byPriority}`);
    this.mergeCells(ws, row, 1, row, 6);
    this.setRowHeight(ws, row, 30);
    row += 2;

    // Priority summary table
    const priorityGroups: { priority: Priority; label: string }[] = [
      { priority: 'P0', label: `${priorityLabels.p0} (Critical)` },
      { priority: 'P1', label: `${priorityLabels.p1} (High)` },
      { priority: 'P2', label: `${priorityLabels.p2} (Normal)` },
    ];

    // Summary section
    const summaryHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(summaryHeader, `${cols.priority} Summary`);
    this.mergeCells(ws, row, 1, row, 5);
    row++;

    const summaryHeaders = [cols.priority, kpiLabels.totalTasks, kpiLabels.completed, kpiLabels.inProgress, cols.percentage];
    const summaryData = priorityGroups.map(({ priority, label }) => {
      const features = roadmap.featuresByPriority[priority] || [];
      const completedCount = features.filter(f => isCompleted(f.status)).length;
      const inProgressCount = features.filter(f => isInProgress(f.status)).length;
      const rate = features.length > 0 ? Math.round((completedCount / features.length) * 100) : 0;
      return [label, features.length, completedCount, inProgressCount, `${rate}%`];
    });

    row = this.addTable(ws, summaryHeaders, summaryData, row, 1);

    // Apply priority colors to summary
    for (let i = 0; i < priorityGroups.length; i++) {
      sm.applyPriorityStyle(ws.getCell(row - priorityGroups.length + i - 1, 1), priorityGroups[i].priority);
    }

    row += 2;

    // Stacked Comparison Chart
    const priorityItems = priorityGroups.map(({ priority, label }) => {
      const features = roadmap.featuresByPriority[priority] || [];
      const completedCount = features.filter(f => isCompleted(f.status)).length;
      return {
        label,
        completed: completedCount,
        pending: features.length - completedCount,
      };
    });

    row = ChartBuilder.addStackedComparison(ws, 'Progress by Priority Level', priorityItems, row, 1);
    row++;

    // Detailed sections for each priority
    for (const { priority, label } of priorityGroups) {
      const features = roadmap.featuresByPriority[priority] || [];
      if (features.length === 0) continue;

      // Section header
      const sectionHeader = ws.getCell(row, 1);
      sm.applySubheaderStyle(sectionHeader, `${label} Features`);
      sm.applyPriorityStyle(sectionHeader, priority);
      this.mergeCells(ws, row, 1, row, 6);
      row++;

      // Features table
      const featureHeaders = [cols.id, cols.name, cols.status, cols.percentage, cols.deadline, kpiLabels.blockers];
      const tableData = features.map(f => [
        f.id,
        f.name,
        f.status,
        `${f.progress}%`,
        f.completionDate || '-',
        f.blocker || '-',
      ]);

      row = this.addTable(ws, featureHeaders, tableData, row, 1, { alternateColors: true });

      // Apply status styling
      for (let i = 0; i < features.length; i++) {
        const dataRow = row - features.length - 1 + i;
        sm.applyStatusStyle(ws.getCell(dataRow, 3), features[i].status);
      }

      row += 2;
    }

    sm.setColumnWidths(ws, { 1: 8, 2: 35, 3: 12, 4: 10, 5: 12, 6: 15 });
    this.setSheetProperties(ws, { freezePanes: false });
  }

  /**
   * Sheet 3: By Cycle (C1/C2/C3 Timeline)
   * Uses localized strings for sheet name and labels
   */
  private createSheet3ByCycle(roadmap: RoadmapData): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const status = this.localeStrings.status;
    const kpiLabels = this.localeStrings.kpi;
    const ws = this.addSheet(sheets.byCycle);
    const sm = this.getStyleManager();
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `${kpiLabels.totalFeatures} - ${sheets.byCycle}`);
    this.mergeCells(ws, row, 1, row, 6);
    this.setRowHeight(ws, row, 30);
    row += 2;

    // Group features by cycle
    const cycleGroups: Record<string, Feature[]> = {};
    for (const feature of roadmap.features) {
      const cycle = feature.cycle || 'Unassigned';
      if (!cycleGroups[cycle]) {
        cycleGroups[cycle] = [];
      }
      cycleGroups[cycle].push(feature);
    }

    // Sort cycles (C1, C2, C3, then others)
    const sortedCycles = Object.keys(cycleGroups).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });

    // Cycle summary
    const summaryHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(summaryHeader, `${cols.cycle} Summary`);
    this.mergeCells(ws, row, 1, row, 5);
    row++;

    const summaryHeaders = [cols.cycle, kpiLabels.totalFeatures, kpiLabels.completed, cols.percentage, cols.status];
    const summaryData = sortedCycles.map(cycle => {
      const features = cycleGroups[cycle];
      const completedCount = features.filter(f => isCompleted(f.status)).length;
      const avgProgress = features.length > 0
        ? Math.round(features.reduce((sum, f) => sum + f.progress, 0) / features.length)
        : 0;
      const allComplete = completedCount === features.length;
      const cycleStatus = allComplete ? status.completed : completedCount > 0 ? status.inProgress : status.pending;
      return [cycle, features.length, completedCount, `${avgProgress}%`, cycleStatus];
    });

    row = this.addTable(ws, summaryHeaders, summaryData, row, 1);

    // Apply status styling to summary
    for (let i = 0; i < sortedCycles.length; i++) {
      const features = cycleGroups[sortedCycles[i]];
      const completedCount = features.filter(f => isCompleted(f.status)).length;
      const cycleStatus = completedCount === features.length ? status.completed : completedCount > 0 ? status.inProgress : status.pending;
      sm.applyStatusStyle(ws.getCell(row - sortedCycles.length + i - 1, 5), cycleStatus);
    }

    row += 2;

    // Cycle Progress Visualization
    const timelineHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(timelineHeader, `${cols.cycle} ${kpiLabels.inProgress}`);
    this.mergeCells(ws, row, 1, row, 6);
    row++;

    // Create progress bars for each cycle using ChartBuilder
    for (const cycle of sortedCycles) {
      if (cycle === 'Unassigned') continue;

      const features = cycleGroups[cycle];
      const completedCount = features.filter(f => isCompleted(f.status)).length;

      // Determine color based on completion percentage
      const percentage = features.length > 0 ? (completedCount / features.length) * 100 : 0;
      const color = percentage >= 80 ? 'C6EFCE' : percentage >= 50 ? 'FFEB9C' : 'FFC7CE';

      ChartBuilder.addProgressBar(ws, cycle, completedCount, features.length, row, 1, color);
      row++;
    }

    row += 2;

    // Cycle Completion Ring
    const totalByAllCycles = sortedCycles
      .filter(c => c !== 'Unassigned')
      .reduce((sum, cycle) => sum + cycleGroups[cycle].length, 0);
    const completedByAllCycles = sortedCycles
      .filter(c => c !== 'Unassigned')
      .reduce((sum, cycle) => {
        return sum + cycleGroups[cycle].filter(f => isCompleted(f.status)).length;
      }, 0);

    row = ChartBuilder.addCompletionRing(ws, 'Overall Cycle Progress', completedByAllCycles, totalByAllCycles, row, 1);
    row++;

    // Detailed cycle sections
    for (const cycle of sortedCycles) {
      const features = cycleGroups[cycle];
      if (features.length === 0) continue;

      // Section header
      const sectionHeader = ws.getCell(row, 1);
      sm.applySubheaderStyle(sectionHeader, `${cycle} Features`);
      this.mergeCells(ws, row, 1, row, 6);
      row++;

      // Features table
      const cycleHeaders = [cols.id, cols.name, cols.priority, cols.status, cols.percentage, cols.deadline];
      const tableData = features.map(f => [
        f.id,
        f.name,
        f.priority,
        f.status,
        `${f.progress}%`,
        f.completionDate || '-',
      ]);

      row = this.addTable(ws, cycleHeaders, tableData, row, 1, { alternateColors: true });

      // Apply styling
      for (let i = 0; i < features.length; i++) {
        const dataRow = row - features.length - 1 + i;
        sm.applyPriorityStyle(ws.getCell(dataRow, 3), features[i].priority);
        sm.applyStatusStyle(ws.getCell(dataRow, 4), features[i].status);
      }

      row += 2;
    }

    sm.setColumnWidths(ws, { 1: 12, 2: 35, 3: 10, 4: 12, 5: 10, 6: 12 });
    this.setSheetProperties(ws, { freezePanes: false });
  }
}
