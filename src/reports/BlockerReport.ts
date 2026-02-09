/**
 * Blocker Tracking Report Generator
 * Generates 2-sheet report tracking blockers and their impact
 * v2.0 - Enhanced with ConfigManager for i18n
 */

import { App } from 'obsidian';
import { ExcelGenerator } from '../generators/ExcelGenerator';
import { DataAggregator } from '../services/DataAggregator';
import { ConfigManager } from '../services/ConfigManager';
import { ExcelAutomationSettings } from '../types/settings';
import { LocaleStrings } from '../types/config';
import { BlockerData, RoadmapData } from '../types/data';
import { Blocker, Feature } from '../types/models';
import { formatDate } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import { isResolved as isResolvedStatus } from '../utils/statusUtils';
import { getDefaultLocaleStrings } from '../config/presets';

export class BlockerReportGenerator extends ExcelGenerator {
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
   * Generate blocker tracking report with 2 sheets
   */
  async generate(): Promise<ArrayBuffer> {
    logger.info('Generating Blocker Tracking Report...');

    // Load blocker and roadmap data in parallel for better performance
    const [blockerData, roadmapData] = await Promise.all([
      this.aggregator.loadBlockerData(),
      this.aggregator.loadRoadmapData(),
    ]);

    // Create workbook
    this.createWorkbook();

    // Generate 2 sheets
    logger.debug('Creating Sheet 1: Active Blockers');
    this.createSheet1ActiveBlockers(blockerData, roadmapData);

    logger.debug('Creating Sheet 2: Blocker History');
    this.createSheet2BlockerHistory(blockerData);

    logger.info('Blocker report generated successfully');
    return this.generateBuffer();
  }

  /**
   * Sheet 1: Active Blockers (Current Issues)
   * Uses localized strings for sheet name and labels
   */
  private createSheet1ActiveBlockers(blockerData: BlockerData, roadmapData: RoadmapData): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const kpiLabels = this.localeStrings.kpi;
    const priority = this.localeStrings.priority;
    const ws = this.addSheet(sheets.activeBlockers);
    const sm = this.getStyleManager();
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, `${this.localeStrings.reports.blocker} - ${sheets.activeBlockers}`);
    this.mergeCells(ws, row, 1, row, 8);
    this.setRowHeight(ws, row, 30);
    row++;

    // Generated date
    const dateCell = ws.getCell(row, 1);
    dateCell.value = `${cols.date}: ${formatDate(new Date())}`;
    dateCell.font = { size: 10, color: { argb: 'FF666666' } };
    row += 2;

    // Summary metrics
    const summaryHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(summaryHeader, `${kpiLabels.blockers} Summary`);
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    const allBlockers = blockerData.allBlockers;
    const activeBlockers = allBlockers.filter(b => !this.isResolved(b));
    const resolvedBlockers = allBlockers.filter(b => this.isResolved(b));

    const summaryHeaders = [cols.name, cols.current];
    const summaryData = [
      [kpiLabels.blockers, allBlockers.length],
      [kpiLabels.activeBlockers, activeBlockers.length],
      [kpiLabels.resolvedBlockers, resolvedBlockers.length],
      [`${priority.high} ${cols.priority}`, blockerData.highPriority.filter(b => !this.isResolved(b)).length],
      [`${priority.medium} ${cols.priority}`, blockerData.mediumPriority.filter(b => !this.isResolved(b)).length],
      [`${priority.low} ${cols.priority}`, blockerData.lowPriority.filter(b => !this.isResolved(b)).length],
    ];

    row = this.addTable(ws, summaryHeaders, summaryData, row, 1);
    row += 2;

    // Priority breakdown
    const priorityHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(priorityHeader, sheets.byPriority);
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    const priorityData = [
      { label: priority.high, blockers: blockerData.highPriority, color: 'P0' },
      { label: priority.medium, blockers: blockerData.mediumPriority, color: 'P1' },
      { label: priority.low, blockers: blockerData.lowPriority, color: 'P2' },
    ];

    const priorityHeaders = [cols.priority, kpiLabels.activeBlockers, kpiLabels.resolvedBlockers, kpiLabels.totalTasks];
    const priorityTableData = priorityData.map(({ label, blockers }) => {
      const active = blockers.filter(b => !this.isResolved(b)).length;
      const resolved = blockers.filter(b => this.isResolved(b)).length;
      return [label, active, resolved, blockers.length];
    });

    row = this.addTable(ws, priorityHeaders, priorityTableData, row, 1);

    // Apply priority colors
    for (let i = 0; i < priorityData.length; i++) {
      sm.applyPriorityStyle(ws.getCell(row - priorityData.length + i - 1, 1), priorityData[i].color);
    }

    row += 2;

    // Active blockers detail table
    if (activeBlockers.length > 0) {
      const activeHeader = ws.getCell(row, 1);
      sm.applySubheaderStyle(activeHeader, `${kpiLabels.activeBlockers} Detail`);
      this.mergeCells(ws, row, 1, row, 8);
      row++;

      const headers = [cols.id, cols.name, cols.priority, cols.status, cols.owner, cols.deadline, cols.impact, cols.date];

      const tableData = activeBlockers.map(b => {
        const daysOpen = this.calculateDaysOpen(b);
        return [
          b.id,
          b.title,
          b.priority,
          b.status,
          b.owner || '-',
          b.targetDate || '-',
          b.impact || '-',
          daysOpen >= 0 ? `${daysOpen} days` : '-',
        ];
      });

      row = this.addTable(ws, headers, tableData, row, 1, { alternateColors: true });

      // Apply styling
      for (let i = 0; i < activeBlockers.length; i++) {
        const blocker = activeBlockers[i];
        const dataRow = row - activeBlockers.length - 1 + i;

        // Priority column
        sm.applyPriorityStyle(ws.getCell(dataRow, 3), this.mapBlockerPriority(blocker.priority));

        // Status column
        sm.applyStatusStyle(ws.getCell(dataRow, 4), blocker.status);

        // Highlight overdue (> 7 days for high priority)
        const daysOpen = this.calculateDaysOpen(blocker);
        if (daysOpen > 7 && this.isHighPriority(blocker)) {
          ws.getCell(dataRow, 8).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' },
          };
        }
      }

      row += 2;
    }

    // Affected features section
    const affectedFeatures = this.getAffectedFeatures(blockerData, roadmapData);
    if (affectedFeatures.length > 0) {
      const affectedHeader = ws.getCell(row, 1);
      sm.applySubheaderStyle(affectedHeader, 'Features Affected by Blockers');
      this.mergeCells(ws, row, 1, row, 6);
      row++;

      const affectedHeaders = ['Feature ID', 'Feature Name', 'Blocker ID', 'Blocker Title', 'Blocker Priority'];
      const affectedData = affectedFeatures.map(({ feature, blocker }) => [
        feature.id,
        feature.name,
        blocker.id,
        blocker.title,
        blocker.priority,
      ]);

      row = this.addTable(ws, affectedHeaders, affectedData, row, 1, { alternateColors: true });
    }

    sm.setColumnWidths(ws, { 1: 8, 2: 30, 3: 12, 4: 12, 5: 12, 6: 12, 7: 20, 8: 10 });
    this.setSheetProperties(ws, { autoFilter: true, filterRange: 'A1:H' + row });
  }

  /**
   * Sheet 2: Blocker History (Resolved & Trends)
   * Uses localized strings for sheet name and labels
   */
  private createSheet2BlockerHistory(blockerData: BlockerData): void {
    const sheets = this.localeStrings.sheets;
    const cols = this.localeStrings.columns;
    const kpiLabels = this.localeStrings.kpi;
    const ws = this.addSheet(sheets.blockerHistory);
    const sm = this.getStyleManager();
    let row = 1;

    // Title
    const titleCell = ws.getCell(row, 1);
    sm.applyTitleStyle(titleCell, sheets.blockerHistory);
    this.mergeCells(ws, row, 1, row, 6);
    this.setRowHeight(ws, row, 30);
    row += 2;

    // Resolved blockers section
    const resolvedBlockers = blockerData.allBlockers.filter(b => this.isResolved(b));

    const resolvedHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(resolvedHeader, kpiLabels.resolvedBlockers);
    this.mergeCells(ws, row, 1, row, 6);
    row++;

    if (resolvedBlockers.length > 0) {
      const headers = [cols.id, cols.name, cols.priority, cols.owner, cols.deadline, cols.status];
      const tableData = resolvedBlockers.map(b => [
        b.id,
        b.title,
        b.priority,
        b.owner || '-',
        b.targetDate || '-',
        b.status,
      ]);

      row = this.addTable(ws, headers, tableData, row, 1, { alternateColors: true });

      // Apply styling
      for (let i = 0; i < resolvedBlockers.length; i++) {
        const blocker = resolvedBlockers[i];
        const dataRow = row - resolvedBlockers.length - 1 + i;
        sm.applyPriorityStyle(ws.getCell(dataRow, 3), this.mapBlockerPriority(blocker.priority));
        sm.applyStatusStyle(ws.getCell(dataRow, 6), blocker.status);
      }
    } else {
      ws.getCell(row, 1).value = this.localeStrings.messages.noData;
      row++;
    }

    row += 2;

    // Owner summary section
    const ownerHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(ownerHeader, `${kpiLabels.blockers} by ${cols.owner}`);
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    const ownerData: [string, number, number, number][] = [];
    for (const [owner, blockers] of Object.entries(blockerData.byOwner)) {
      const active = blockers.filter(b => !this.isResolved(b)).length;
      const resolved = blockers.filter(b => this.isResolved(b)).length;
      ownerData.push([owner, blockers.length, active, resolved]);
    }

    if (ownerData.length > 0) {
      const ownerHeaders = [cols.owner, kpiLabels.totalTasks, kpiLabels.activeBlockers, kpiLabels.resolvedBlockers];
      row = this.addTable(ws, ownerHeaders, ownerData, row, 1, { alternateColors: true });
    } else {
      ws.getCell(row, 1).value = this.localeStrings.messages.noData;
      row++;
    }

    row += 2;

    // Metrics section
    const metricsHeader = ws.getCell(row, 1);
    sm.applySubheaderStyle(metricsHeader, `${kpiLabels.blockers} Metrics`);
    this.mergeCells(ws, row, 1, row, 4);
    row++;

    const allBlockers = blockerData.allBlockers;
    const activeBlockers = allBlockers.filter(b => !this.isResolved(b));
    const resolutionRate = allBlockers.length > 0
      ? Math.round((resolvedBlockers.length / allBlockers.length) * 100)
      : 0;

    // Calculate average days open for active blockers
    let avgDaysOpen = 0;
    const daysOpenValues = activeBlockers.map(b => this.calculateDaysOpen(b)).filter(d => d >= 0);
    if (daysOpenValues.length > 0) {
      avgDaysOpen = Math.round(daysOpenValues.reduce((sum, d) => sum + d, 0) / daysOpenValues.length);
    }

    const metricsData: Record<string, string | number> = {
      [kpiLabels.blockers]: allBlockers.length,
      [kpiLabels.activeBlockers]: activeBlockers.length,
      [kpiLabels.resolvedBlockers]: resolvedBlockers.length,
      [`${cols.percentage}`]: `${resolutionRate}%`,
      [`Avg ${cols.date}`]: avgDaysOpen > 0 ? `${avgDaysOpen} days` : 'N/A',
      [`${this.localeStrings.priority.high} ${kpiLabels.activeBlockers}`]: blockerData.highPriority.filter(b => !this.isResolved(b)).length,
    };

    this.addSummarySection(ws, '', metricsData, row, 1);

    sm.setColumnWidths(ws, { 1: 20, 2: 30, 3: 12, 4: 12, 5: 12, 6: 12 });
    this.setSheetProperties(ws, { freezePanes: false });
  }

  /**
   * Check if a blocker is resolved
   * Supports both localized and hardcoded values for backward compatibility
   */
  private isResolved(blocker: Blocker): boolean {
    return isResolvedStatus(blocker.status);
  }

  /**
   * Check if a blocker is high priority
   * Supports both localized and hardcoded values for backward compatibility
   */
  private isHighPriority(blocker: Blocker): boolean {
    const highPriority = this.localeStrings.priority.high;
    return blocker.priority === highPriority ||
      blocker.priority === '높음' ||
      blocker.priority === 'High';
  }

  /**
   * Map blocker priority to styling priority
   * Supports both localized and hardcoded values for backward compatibility
   */
  private mapBlockerPriority(priority: string): string {
    const priorityLabels = this.localeStrings.priority;
    if (priority === priorityLabels.high || priority === '높음' || priority === 'High') return 'P0';
    if (priority === priorityLabels.medium || priority === '중간' || priority === 'Medium') return 'P1';
    return 'P2';
  }

  /**
   * Calculate days open for a blocker
   */
  private calculateDaysOpen(blocker: Blocker): number {
    // If we had a created date, we could calculate this properly
    // For now, estimate based on target date
    if (!blocker.targetDate) return -1;

    try {
      const targetDate = new Date(blocker.targetDate);
      const today = new Date();
      const diffTime = today.getTime() - targetDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return -1;
    }
  }

  /**
   * Get features affected by blockers
   */
  private getAffectedFeatures(
    blockerData: BlockerData,
    roadmapData: RoadmapData
  ): { feature: Feature; blocker: Blocker }[] {
    const affected: { feature: Feature; blocker: Blocker }[] = [];

    for (const feature of roadmapData.features) {
      if (feature.blocker) {
        // Find matching blocker
        const blocker = blockerData.allBlockers.find(b =>
          feature.blocker?.includes(b.id) || feature.blocker?.includes(b.title)
        );
        if (blocker && !this.isResolved(blocker)) {
          affected.push({ feature, blocker });
        }
      }
    }

    return affected;
  }
}
