/**
 * Chart Builder for Excel Reports
 * Provides methods to add various chart types to Excel worksheets
 */

import ExcelJS from 'exceljs';

/**
 * Chart configuration options
 */
export interface ChartConfig {
  title?: string;
  width?: number;
  height?: number;
  showLegend?: boolean;
  showDataLabels?: boolean;
}

/**
 * Pie chart data point
 */
export interface PieChartData {
  label: string;
  value: number;
  color?: string;
}

/**
 * Bar/Column chart data series
 */
export interface BarChartSeries {
  name: string;
  values: number[];
  color?: string;
}

/**
 * Line chart data series
 */
export interface LineChartSeries {
  name: string;
  values: number[];
  color?: string;
}

/**
 * ChartBuilder - Creates Excel charts using ExcelJS
 */
export class ChartBuilder {
  /**
   * Add a pie chart to a worksheet
   * Note: ExcelJS has limited native chart support, so we create a data table
   * and use conditional formatting to visualize. For full charts, we add
   * the data in a format that Excel can easily convert to a chart.
   */
  static addPieChartData(
    ws: ExcelJS.Worksheet,
    data: PieChartData[],
    startRow: number,
    startCol: number,
    config: ChartConfig = {}
  ): number {
    const { title = 'Distribution' } = config;

    // Title
    const titleCell = ws.getCell(startRow, startCol);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    ws.mergeCells(startRow, startCol, startRow, startCol + 2);

    let row = startRow + 1;

    // Headers
    ws.getCell(row, startCol).value = 'Category';
    ws.getCell(row, startCol + 1).value = 'Value';
    ws.getCell(row, startCol + 2).value = 'Percentage';

    // Style headers
    for (let col = startCol; col <= startCol + 2; col++) {
      const cell = ws.getCell(row, col);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    row++;

    // Calculate total
    const total = data.reduce((sum, d) => sum + d.value, 0);

    // Data rows with visual bars
    for (const item of data) {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;

      ws.getCell(row, startCol).value = item.label;
      ws.getCell(row, startCol + 1).value = item.value;
      ws.getCell(row, startCol + 2).value = `${percentage.toFixed(1)}%`;

      // Apply color to percentage cell based on value
      if (item.color) {
        ws.getCell(row, startCol + 2).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${item.color}` },
        };
      }

      // Add borders
      for (let col = startCol; col <= startCol + 2; col++) {
        ws.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      row++;
    }

    // Add visual bar representation
    row++;
    ws.getCell(row, startCol).value = 'Visual:';
    ws.getCell(row, startCol).font = { bold: true, size: 10 };
    row++;

    for (const item of data) {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const barLength = Math.round(percentage / 5); // Scale to ~20 chars max
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);

      ws.getCell(row, startCol).value = item.label;
      ws.getCell(row, startCol + 1).value = bar;
      ws.getCell(row, startCol + 1).font = { name: 'Consolas', size: 10 };
      ws.getCell(row, startCol + 2).value = `${percentage.toFixed(1)}%`;

      row++;
    }

    return row + 1;
  }

  /**
   * Add a horizontal bar chart visualization
   */
  static addBarChartData(
    ws: ExcelJS.Worksheet,
    categories: string[],
    series: BarChartSeries[],
    startRow: number,
    startCol: number,
    config: ChartConfig = {}
  ): number {
    const { title = 'Bar Chart' } = config;

    // Title
    const titleCell = ws.getCell(startRow, startCol);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    ws.mergeCells(startRow, startCol, startRow, startCol + series.length + 1);

    let row = startRow + 1;

    // Headers
    ws.getCell(row, startCol).value = 'Category';
    for (let i = 0; i < series.length; i++) {
      ws.getCell(row, startCol + 1 + i).value = series[i].name;
    }
    ws.getCell(row, startCol + series.length + 1).value = 'Visual';

    // Style headers
    for (let col = startCol; col <= startCol + series.length + 1; col++) {
      const cell = ws.getCell(row, col);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    row++;

    // Find max value for scaling
    let maxValue = 0;
    for (const s of series) {
      for (const v of s.values) {
        maxValue = Math.max(maxValue, v);
      }
    }

    // Data rows
    for (let i = 0; i < categories.length; i++) {
      ws.getCell(row, startCol).value = categories[i];

      // Series values
      let totalForRow = 0;
      for (let j = 0; j < series.length; j++) {
        const value = series[j].values[i] || 0;
        ws.getCell(row, startCol + 1 + j).value = value;
        totalForRow += value;
      }

      // Visual bar (based on first series or total)
      const barValue = series.length === 1 ? series[0].values[i] : totalForRow;
      const barLength = maxValue > 0 ? Math.round((barValue / maxValue) * 20) : 0;
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);

      ws.getCell(row, startCol + series.length + 1).value = bar;
      ws.getCell(row, startCol + series.length + 1).font = { name: 'Consolas', size: 10 };

      // Add borders
      for (let col = startCol; col <= startCol + series.length + 1; col++) {
        ws.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      row++;
    }

    return row + 1;
  }

  /**
   * Add a line chart visualization (trend data)
   */
  static addLineChartData(
    ws: ExcelJS.Worksheet,
    xLabels: string[],
    series: LineChartSeries[],
    startRow: number,
    startCol: number,
    config: ChartConfig = {}
  ): number {
    const { title = 'Trend Chart' } = config;

    // Title
    const titleCell = ws.getCell(startRow, startCol);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    ws.mergeCells(startRow, startCol, startRow, startCol + series.length);

    let row = startRow + 1;

    // Headers
    ws.getCell(row, startCol).value = 'Period';
    for (let i = 0; i < series.length; i++) {
      ws.getCell(row, startCol + 1 + i).value = series[i].name;
    }

    // Style headers
    for (let col = startCol; col <= startCol + series.length; col++) {
      const cell = ws.getCell(row, col);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    }

    row++;

    // Data rows
    for (let i = 0; i < xLabels.length; i++) {
      ws.getCell(row, startCol).value = xLabels[i];

      for (let j = 0; j < series.length; j++) {
        ws.getCell(row, startCol + 1 + j).value = series[j].values[i] || 0;
      }

      // Add borders
      for (let col = startCol; col <= startCol + series.length; col++) {
        ws.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      row++;
    }

    // Add sparkline-style visualization
    row++;
    ws.getCell(row, startCol).value = 'Trend Visualization:';
    ws.getCell(row, startCol).font = { bold: true, size: 10 };
    row++;

    for (const s of series) {
      // Find min/max for scaling
      const minVal = Math.min(...s.values);
      const maxVal = Math.max(...s.values);
      const range = maxVal - minVal || 1;

      // Create ASCII sparkline
      const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
      const sparkline = s.values.map(v => {
        const normalized = (v - minVal) / range;
        const index = Math.min(Math.floor(normalized * 8), 7);
        return sparkChars[index];
      }).join('');

      ws.getCell(row, startCol).value = s.name;
      ws.getCell(row, startCol + 1).value = sparkline;
      ws.getCell(row, startCol + 1).font = { name: 'Consolas', size: 12 };

      row++;
    }

    return row + 1;
  }

  /**
   * Add a progress bar with percentage
   */
  static addProgressBar(
    ws: ExcelJS.Worksheet,
    label: string,
    current: number,
    total: number,
    row: number,
    startCol: number,
    color?: string
  ): void {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    const barLength = Math.round(percentage / 5);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);

    ws.getCell(row, startCol).value = label;
    ws.getCell(row, startCol + 1).value = bar;
    ws.getCell(row, startCol + 1).font = { name: 'Consolas', size: 10 };
    ws.getCell(row, startCol + 2).value = `${current}/${total}`;
    ws.getCell(row, startCol + 3).value = `${percentage.toFixed(1)}%`;

    if (color) {
      ws.getCell(row, startCol + 3).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${color}` },
      };
    }
  }

  /**
   * Add a completion donut/ring visualization
   */
  static addCompletionRing(
    ws: ExcelJS.Worksheet,
    title: string,
    completed: number,
    total: number,
    startRow: number,
    startCol: number
  ): number {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Title
    ws.getCell(startRow, startCol).value = title;
    ws.getCell(startRow, startCol).font = { bold: true, size: 11 };

    // Create ring visualization using Unicode
    const ring = this.createRingVisualization(percentage);

    let row = startRow + 1;
    for (const line of ring) {
      ws.getCell(row, startCol).value = line;
      ws.getCell(row, startCol).font = { name: 'Consolas', size: 10 };
      ws.getCell(row, startCol).alignment = { horizontal: 'center' };
      row++;
    }

    // Stats below ring
    ws.getCell(row, startCol).value = `${completed}/${total} (${percentage}%)`;
    ws.getCell(row, startCol).alignment = { horizontal: 'center' };

    return row + 2;
  }

  /**
   * Create a text-based ring/donut visualization
   */
  private static createRingVisualization(percentage: number): string[] {
    // Simple text representation of progress
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;

    return [
      `    ╭${'━'.repeat(6)}╮`,
      `  ╭─┤${percentage.toString().padStart(3)}% ├─╮`,
      `  │ ╰${'━'.repeat(6)}╯ │`,
      `  │${'█'.repeat(filled)}${'░'.repeat(empty)}│`,
      `  ╰${'─'.repeat(12)}╯`,
    ];
  }

  /**
   * Add a stacked bar comparison
   */
  static addStackedComparison(
    ws: ExcelJS.Worksheet,
    title: string,
    items: { label: string; completed: number; pending: number }[],
    startRow: number,
    startCol: number
  ): number {
    // Title
    ws.getCell(startRow, startCol).value = title;
    ws.getCell(startRow, startCol).font = { bold: true, size: 12 };
    ws.mergeCells(startRow, startCol, startRow, startCol + 3);

    let row = startRow + 1;

    // Headers
    const headers = ['Category', 'Completed', 'Pending', 'Progress'];
    headers.forEach((h, i) => {
      const cell = ws.getCell(row, startCol + i);
      cell.value = h;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    row++;

    // Data rows
    for (const item of items) {
      const total = item.completed + item.pending;
      const completedBars = total > 0 ? Math.round((item.completed / total) * 20) : 0;
      const pendingBars = 20 - completedBars;
      const progressBar = '█'.repeat(completedBars) + '░'.repeat(pendingBars);

      ws.getCell(row, startCol).value = item.label;
      ws.getCell(row, startCol + 1).value = item.completed;
      ws.getCell(row, startCol + 1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC6EFCE' },
      };
      ws.getCell(row, startCol + 2).value = item.pending;
      ws.getCell(row, startCol + 2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC7CE' },
      };
      ws.getCell(row, startCol + 3).value = progressBar;
      ws.getCell(row, startCol + 3).font = { name: 'Consolas', size: 10 };

      // Add borders
      for (let col = startCol; col <= startCol + 3; col++) {
        ws.getCell(row, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      row++;
    }

    return row + 1;
  }

  /**
   * Add KPI dashboard boxes
   */
  static addKPIBoxes(
    ws: ExcelJS.Worksheet,
    kpis: { label: string; value: string | number; trend?: 'up' | 'down' | 'neutral'; color?: string }[],
    startRow: number,
    startCol: number,
    boxesPerRow: number = 4
  ): number {
    let row = startRow;
    let col = startCol;

    for (let i = 0; i < kpis.length; i++) {
      const kpi = kpis[i];

      // Label
      const labelCell = ws.getCell(row, col);
      labelCell.value = kpi.label;
      labelCell.font = { size: 9, color: { argb: 'FF666666' } };
      labelCell.alignment = { horizontal: 'center' };

      // Value with trend
      const valueCell = ws.getCell(row + 1, col);
      const trendSymbol = kpi.trend === 'up' ? ' ↑' : kpi.trend === 'down' ? ' ↓' : '';
      valueCell.value = `${kpi.value}${trendSymbol}`;
      valueCell.font = { bold: true, size: 14 };
      valueCell.alignment = { horizontal: 'center', vertical: 'middle' };

      if (kpi.color) {
        valueCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${kpi.color}` },
        };
      }

      // Border around both cells
      for (let r = row; r <= row + 1; r++) {
        ws.getCell(r, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      col++;

      // Move to next row if needed
      if ((i + 1) % boxesPerRow === 0) {
        row += 3;
        col = startCol;
      }
    }

    // Calculate final row
    const totalRows = Math.ceil(kpis.length / boxesPerRow);
    return startRow + totalRows * 3;
  }
}
