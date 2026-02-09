/**
 * Excel cell styling manager
 * Equivalent to Python generators/style_manager.py
 */

import ExcelJS from 'exceljs';
import { StylingOptions } from '../types/settings';
import { isCompleted, isInProgress, isPending } from '../utils/statusUtils';

/**
 * Manages cell styling for Excel generation
 */
export class StyleManager {
  private headerFill: ExcelJS.Fill;
  private subheaderFill: ExcelJS.Fill;
  private p0Fill: ExcelJS.Fill;
  private p1Fill: ExcelJS.Fill;
  private p2Fill: ExcelJS.Fill;
  private completedFill: ExcelJS.Fill;
  private inProgressFill: ExcelJS.Fill;
  private pendingFill: ExcelJS.Fill;
  private alternateFill: ExcelJS.Fill;
  private border: Partial<ExcelJS.Borders>;

  constructor(styling: StylingOptions) {
    // Initialize fills with colors from settings
    this.headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${styling.headerColor}` },
    };

    this.subheaderFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${styling.subheaderColor}` },
    };

    this.p0Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${styling.priorityColors.P0}` },
    };

    this.p1Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${styling.priorityColors.P1}` },
    };

    this.p2Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${styling.priorityColors.P2}` },
    };

    this.completedFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${styling.statusColors.completed}` },
    };

    this.inProgressFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${styling.statusColors.inProgress}` },
    };

    this.pendingFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${styling.statusColors.pending}` },
    };

    this.alternateFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' },
    };

    this.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  }

  /**
   * Apply header style to a cell
   */
  applyHeaderStyle(cell: ExcelJS.Cell, text?: string): void {
    if (text !== undefined) cell.value = text;

    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 12,
    };
    cell.fill = this.headerFill;
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = this.border;
  }

  /**
   * Apply subheader style to a cell
   */
  applySubheaderStyle(cell: ExcelJS.Cell, text?: string): void {
    if (text !== undefined) cell.value = text;

    cell.font = {
      bold: true,
      size: 11,
    };
    cell.fill = this.subheaderFill;
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = this.border;
  }

  /**
   * Apply normal cell style
   */
  applyNormalStyle(
    cell: ExcelJS.Cell,
    text?: string,
    options?: { bold?: boolean; centered?: boolean }
  ): void {
    if (text !== undefined) cell.value = text;

    cell.font = {
      size: 10,
      bold: options?.bold || false,
    };
    cell.alignment = {
      horizontal: options?.centered ? 'center' : 'left',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = this.border;
  }

  /**
   * Apply priority-based style to a cell
   */
  applyPriorityStyle(cell: ExcelJS.Cell, priority: string): void {
    const upperPriority = priority.toUpperCase();

    if (upperPriority.includes('P0') || upperPriority.includes('높음') || upperPriority.includes('HIGH')) {
      cell.fill = this.p0Fill;
    } else if (upperPriority.includes('P1') || upperPriority.includes('중간') || upperPriority.includes('MEDIUM')) {
      cell.fill = this.p1Fill;
    } else {
      cell.fill = this.p2Fill;
    }

    cell.border = this.border;
  }

  /**
   * Apply status-based style to a cell
   */
  applyStatusStyle(cell: ExcelJS.Cell, status: string): void {
    if (isCompleted(status)) {
      cell.fill = this.completedFill;
    } else if (isInProgress(status)) {
      cell.fill = this.inProgressFill;
    } else if (isPending(status) || status.includes('⚠️')) {
      cell.fill = this.pendingFill;
    }

    cell.border = this.border;
  }

  /**
   * Apply alternating row color
   */
  applyAlternateStyle(cell: ExcelJS.Cell): void {
    cell.fill = this.alternateFill;
    cell.border = this.border;
  }

  /**
   * Apply title style (large, bold, no border)
   */
  applyTitleStyle(cell: ExcelJS.Cell, text?: string): void {
    if (text !== undefined) cell.value = text;

    cell.font = {
      bold: true,
      size: 14,
      color: { argb: 'FF000000' },
    };
    cell.alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };
  }

  /**
   * Format a row as header
   */
  formatHeaderRow(ws: ExcelJS.Worksheet, row: number, startCol: number, endCol: number): void {
    for (let col = startCol; col <= endCol; col++) {
      const cell = ws.getCell(row, col);
      this.applyHeaderStyle(cell);
    }
  }

  /**
   * Format a row as data with optional alternating
   */
  formatDataRow(ws: ExcelJS.Worksheet, row: number, startCol: number, endCol: number, alternate: boolean = false): void {
    for (let col = startCol; col <= endCol; col++) {
      const cell = ws.getCell(row, col);
      this.applyNormalStyle(cell);
      if (alternate) {
        this.applyAlternateStyle(cell);
      }
    }
  }

  /**
   * Auto-adjust column widths based on content
   */
  autoAdjustColumnWidths(ws: ExcelJS.Worksheet, minWidth: number = 10, maxWidth: number = 50): void {
    ws.columns.forEach(column => {
      let maxLength = minWidth;

      column.eachCell?.({ includeEmpty: true }, cell => {
        const cellValue = cell.value?.toString() || '';
        // Account for Korean characters (wider)
        const koreanChars = (cellValue.match(/[\uAC00-\uD7AF]/g) || []).length;
        const adjustedLength = cellValue.length + koreanChars * 0.5;
        maxLength = Math.max(maxLength, Math.min(adjustedLength + 2, maxWidth));
      });

      column.width = maxLength;
    });
  }

  /**
   * Set specific column widths
   */
  setColumnWidths(ws: ExcelJS.Worksheet, widths: Record<number, number>): void {
    for (const [col, width] of Object.entries(widths)) {
      const column = ws.getColumn(parseInt(col));
      column.width = width;
    }
  }

  /**
   * Freeze panes at specified row and column
   */
  freezePanes(ws: ExcelJS.Worksheet, row: number = 1, col: number = 0): void {
    ws.views = [
      {
        state: 'frozen',
        xSplit: col,
        ySplit: row,
        topLeftCell: this.getCellAddress(row + 1, col + 1),
        activeCell: this.getCellAddress(row + 1, col + 1),
      },
    ];
  }

  /**
   * Get cell address from row and column numbers
   */
  private getCellAddress(row: number, col: number): string {
    const colLetter = this.getColumnLetter(col);
    return `${colLetter}${row}`;
  }

  /**
   * Convert column number to letter (1 = A, 2 = B, etc.)
   */
  private getColumnLetter(col: number): string {
    let letter = '';
    while (col > 0) {
      const mod = (col - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      col = Math.floor((col - 1) / 26);
    }
    return letter || 'A';
  }
}
