/**
 * Base Excel generator class
 * Equivalent to Python generators/excel_generator.py
 * v2.0 - Enhanced with ConfigManager for i18n
 */

import ExcelJS from 'exceljs';
import { StyleManager } from './StyleManager';
import { ExcelAutomationSettings } from '../types/settings';
import { ConfigManager } from '../services/ConfigManager';
import { StyleConfig } from '../types/config';

/**
 * Base class for Excel workbook generation
 */
export class ExcelGenerator {
  protected workbook: ExcelJS.Workbook | null = null;
  protected styleManager: StyleManager;
  protected configManager?: ConfigManager;

  constructor(protected settings: ExcelAutomationSettings, configManager?: ConfigManager) {
    this.configManager = configManager;

    // Use style config from ConfigManager if available
    if (configManager) {
      const styleConfig = configManager.getStyle();
      this.styleManager = new StyleManager(this.convertStyleConfig(styleConfig));
    } else {
      this.styleManager = new StyleManager(settings.styling);
    }
  }

  /**
   * Convert v2 StyleConfig to legacy StylingOptions format
   */
  private convertStyleConfig(styleConfig: StyleConfig): ExcelAutomationSettings['styling'] {
    return {
      headerColor: styleConfig.colors.headerBackground,
      subheaderColor: styleConfig.colors.subheaderBackground,
      priorityColors: {
        P0: styleConfig.colors.priority.p0,
        P1: styleConfig.colors.priority.p1,
        P2: styleConfig.colors.priority.p2,
      },
      statusColors: styleConfig.colors.status,
    };
  }

  /**
   * Create a new workbook
   */
  createWorkbook(): ExcelJS.Workbook {
    this.workbook = new ExcelJS.Workbook();

    // Set workbook metadata
    this.workbook.creator = 'Obsidian Excel Automation';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();

    return this.workbook;
  }

  /**
   * Get current workbook (creates one if not exists)
   */
  getWorkbook(): ExcelJS.Workbook {
    if (!this.workbook) {
      this.createWorkbook();
    }
    return this.workbook!;
  }

  /**
   * Add a new worksheet
   */
  addSheet(title: string, index?: number): ExcelJS.Worksheet {
    const wb = this.getWorkbook();

    const ws = wb.addWorksheet(title, {
      properties: {
        tabColor: { argb: 'FF4472C4' },
      },
    });

    // Set default row height
    ws.properties.defaultRowHeight = 20;

    return ws;
  }

  /**
   * Add a table with headers and data
   */
  addTable(
    ws: ExcelJS.Worksheet,
    headers: string[],
    data: (string | number | null | undefined)[][],
    startRow: number,
    startCol: number = 1,
    options?: {
      alternateColors?: boolean;
      applyPriorityToColumn?: number;
      applyStatusToColumn?: number;
    }
  ): number {
    // Add header row
    headers.forEach((header, idx) => {
      const cell = ws.getCell(startRow, startCol + idx);
      this.styleManager.applyHeaderStyle(cell, header);
    });

    // Add data rows
    let currentRow = startRow + 1;
    data.forEach((rowData, rowIdx) => {
      const alternate = options?.alternateColors && rowIdx % 2 === 1;

      rowData.forEach((value, colIdx) => {
        const cell = ws.getCell(currentRow, startCol + colIdx);
        const displayValue = value !== null && value !== undefined ? String(value) : '-';
        this.styleManager.applyNormalStyle(cell, displayValue);

        if (alternate) {
          this.styleManager.applyAlternateStyle(cell);
        }

        // Apply priority styling if configured
        if (options?.applyPriorityToColumn === colIdx && value) {
          this.styleManager.applyPriorityStyle(cell, String(value));
        }

        // Apply status styling if configured
        if (options?.applyStatusToColumn === colIdx && value) {
          this.styleManager.applyStatusStyle(cell, String(value));
        }
      });

      currentRow++;
    });

    return currentRow + 1;
  }

  /**
   * Add a summary section with key-value pairs
   */
  addSummarySection(
    ws: ExcelJS.Worksheet,
    title: string,
    data: Record<string, string | number>,
    startRow: number,
    startCol: number = 1
  ): number {
    // Title row
    const titleCell = ws.getCell(startRow, startCol);
    this.styleManager.applySubheaderStyle(titleCell, title);
    ws.mergeCells(startRow, startCol, startRow, startCol + 1);

    let currentRow = startRow + 1;

    // Key-value pairs
    for (const [key, value] of Object.entries(data)) {
      const keyCell = ws.getCell(currentRow, startCol);
      keyCell.value = key;
      keyCell.font = { bold: true, size: 10 };
      keyCell.border = this.getBorder();

      const valueCell = ws.getCell(currentRow, startCol + 1);
      valueCell.value = value;
      valueCell.font = { size: 10 };
      valueCell.border = this.getBorder();

      currentRow++;
    }

    return currentRow + 1;
  }

  /**
   * Add metric boxes in a grid layout
   */
  addMetricBoxes(
    ws: ExcelJS.Worksheet,
    metrics: { label: string; value: string | number }[],
    startRow: number,
    startCol: number = 1,
    boxesPerRow: number = 4
  ): number {
    let currentRow = startRow;
    let currentCol = startCol;

    metrics.forEach((metric, idx) => {
      // Label cell
      const labelCell = ws.getCell(currentRow, currentCol);
      this.styleManager.applySubheaderStyle(labelCell, metric.label);

      // Value cell (below label)
      const valueCell = ws.getCell(currentRow + 1, currentCol);
      valueCell.value = metric.value;
      valueCell.font = { bold: true, size: 14 };
      valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
      valueCell.border = this.getBorder();

      currentCol++;

      // Move to next row if needed
      if ((idx + 1) % boxesPerRow === 0) {
        currentRow += 3; // Skip row for spacing
        currentCol = startCol;
      }
    });

    // Calculate final row
    const totalRows = Math.ceil(metrics.length / boxesPerRow);
    return startRow + totalRows * 3;
  }

  /**
   * Merge cells in a range
   */
  mergeCells(
    ws: ExcelJS.Worksheet,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): void {
    ws.mergeCells(startRow, startCol, endRow, endCol);
  }

  /**
   * Set row height
   */
  setRowHeight(ws: ExcelJS.Worksheet, row: number, height: number): void {
    ws.getRow(row).height = height;
  }

  /**
   * Set sheet properties
   */
  setSheetProperties(
    ws: ExcelJS.Worksheet,
    options?: {
      freezePanes?: boolean;
      freezeRow?: number;
      autoFilter?: boolean;
      filterRange?: string;
    }
  ): void {
    if (options?.freezePanes !== false) {
      this.styleManager.freezePanes(ws, options?.freezeRow || 1);
    }

    if (options?.autoFilter && options?.filterRange) {
      ws.autoFilter = options.filterRange;
    }

    // Auto-adjust column widths
    this.styleManager.autoAdjustColumnWidths(ws);
  }

  /**
   * Generate Excel buffer (for saving/downloading)
   */
  async generateBuffer(): Promise<ArrayBuffer> {
    if (!this.workbook) {
      throw new Error('No workbook to save. Call createWorkbook() first.');
    }

    const buffer = await this.workbook.xlsx.writeBuffer();
    return buffer as ArrayBuffer;
  }

  /**
   * Get standard border style
   */
  protected getBorder(): Partial<ExcelJS.Borders> {
    return {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  }

  /**
   * Get style manager for custom styling
   */
  getStyleManager(): StyleManager {
    return this.styleManager;
  }
}
