# Design Document: Plugin Optimization v3

**Feature ID**: plugin-optimization-v3
**Plan Reference**: [plugin-optimization-v3.plan.md](../../01-plan/features/plugin-optimization-v3.plan.md)
**Created**: 2026-02-05
**Status**: Draft

---

## 1. Overview

This document defines the technical design for optimizing the Obsidian Excel Automation plugin with:
1. Regex caching for faster parsing
2. Enhanced task detection with Dataview field support
3. Error handling with user feedback
4. Executive Summary dashboard sheet (first sheet)

---

## 2. Type Definitions

### 2.1 New Types

**File**: `src/types/parsing.ts`

```typescript
/**
 * Parsing Result Wrapper with Error Tracking
 */
export interface ParseResult<T> {
  data: T;
  errors: ParseError[];
  warnings: ParseWarning[];
  stats: ParseStats;
}

export interface ParseError {
  type: ParseErrorType;
  message: string;
  line?: number;
  column?: number;
  source?: string;
  suggestion?: string;
}

export type ParseErrorType =
  | 'invalid_regex'
  | 'malformed_date'
  | 'malformed_task'
  | 'missing_file'
  | 'invalid_priority'
  | 'unknown_field';

export interface ParseWarning {
  type: ParseWarningType;
  message: string;
  line?: number;
}

export type ParseWarningType =
  | 'ambiguous_priority'
  | 'past_due_date'
  | 'missing_owner'
  | 'duplicate_task';

export interface ParseStats {
  totalLines: number;
  tasksFound: number;
  parseTime: number;
  cacheHit: boolean;
}
```

### 2.2 Enhanced Task Interface

**File**: `src/types/data.ts` (update existing)

```typescript
export interface Task {
  // === Existing Fields ===
  content: string;
  status: boolean;           // true = completed
  priority: Priority;
  dueDate?: Date;
  owner?: string;
  tags: string[];
  rawLine: string;

  // === New Fields (v3) ===
  estimatedTime?: string;    // "2h", "30m", "1d"
  recurrence?: Recurrence;   // Repeat pattern
  context?: string;          // @work, @home, @errands
  startDate?: Date;          // Scheduled start
  completedDate?: Date;      // When marked [x]
  lineNumber: number;        // For error reporting
  project?: string;          // Extracted from nested tags

  // === Dataview Fields ===
  inlineFields: Record<string, string>;  // All field::value pairs
}

export interface Recurrence {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval?: number;         // Every N days/weeks/etc
  daysOfWeek?: number[];     // For weekly: [1,3,5] = Mon, Wed, Fri
}

export type Priority = 'P0' | 'P1' | 'P2' | 'none';
```

### 2.3 Executive Summary Data

**File**: `src/types/summary.ts` (new)

```typescript
export interface ExecutiveSummary {
  // Header
  reportTitle: string;
  dateRange: { start: Date; end: Date };
  generatedAt: Date;

  // KPIs
  kpis: {
    totalTasks: number;
    completedTasks: number;
    activeBlockers: number;
    totalFeatures: number;
    completionRate: number;
  };

  // Priority Breakdown
  priorityBreakdown: {
    p0: { total: number; completed: number };
    p1: { total: number; completed: number };
    p2: { total: number; completed: number };
  };

  // Top Blockers (max 5)
  topBlockers: Array<{
    id: string;
    title: string;
    priority: string;
    daysOpen: number;
  }>;

  // Upcoming Deadlines (next 7 days)
  upcomingDeadlines: Array<{
    task: string;
    dueDate: Date;
    owner?: string;
    priority: Priority;
  }>;

  // Team Workload
  teamWorkload: Array<{
    owner: string;
    taskCount: number;
    completedCount: number;
  }>;
}
```

---

## 3. Component Design

### 3.1 RegexCache Utility

**File**: `src/utils/RegexCache.ts` (new)

```typescript
/**
 * RegexCache - Pre-compiles and caches regex patterns
 *
 * Benefits:
 * - Avoids recompiling same pattern multiple times
 * - Catches invalid patterns at load time
 * - Provides fallback for invalid user patterns
 */
export class RegexCache {
  private cache: Map<string, RegExp> = new Map();
  private errors: Map<string, string> = new Map();

  /**
   * Get or compile a regex pattern
   * @param pattern - Regex pattern string
   * @param flags - Regex flags (default: 'g')
   * @returns Compiled RegExp or null if invalid
   */
  get(pattern: string, flags: string = 'g'): RegExp | null {
    const key = `${pattern}:::${flags}`;

    // Return cached regex
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Return null for known bad patterns
    if (this.errors.has(key)) {
      return null;
    }

    // Try to compile
    try {
      const regex = new RegExp(pattern, flags);
      this.cache.set(key, regex);
      return regex;
    } catch (e) {
      this.errors.set(key, (e as Error).message);
      console.warn(`Invalid regex pattern: ${pattern}`, e);
      return null;
    }
  }

  /**
   * Pre-compile multiple patterns at once
   * @param patterns - Array of {pattern, flags} objects
   * @returns Number of successfully compiled patterns
   */
  precompile(patterns: Array<{ pattern: string; flags?: string }>): number {
    let success = 0;
    for (const { pattern, flags } of patterns) {
      if (this.get(pattern, flags)) success++;
    }
    return success;
  }

  /**
   * Get all compilation errors
   */
  getErrors(): Map<string, string> {
    return new Map(this.errors);
  }

  /**
   * Clear cache (e.g., when config changes)
   */
  clear(): void {
    this.cache.clear();
    this.errors.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { cached: number; errors: number } {
    return {
      cached: this.cache.size,
      errors: this.errors.size,
    };
  }
}

// Singleton instance
export const regexCache = new RegexCache();
```

### 3.2 Enhanced MarkdownParser

**File**: `src/services/MarkdownParser.ts` (modifications)

```typescript
import { regexCache } from '../utils/RegexCache';
import { ParseResult, ParseError, ParseWarning, ParseStats } from '../types/parsing';

export class MarkdownParser {
  private config: ConfigManager;
  private parsingRules: ParsingConfig;

  constructor(config: ConfigManager) {
    this.config = config;
    this.parsingRules = config.getParsing();

    // Pre-compile all patterns on initialization
    this.precompilePatterns();
  }

  /**
   * Pre-compile all regex patterns from config
   */
  private precompilePatterns(): void {
    const patterns: Array<{ pattern: string; flags?: string }> = [];

    // Task patterns
    patterns.push({ pattern: this.parsingRules.task.checkboxPattern, flags: 'gm' });

    // Due date patterns
    for (const p of this.parsingRules.task.dueDatePatterns) {
      patterns.push({ pattern: p });
    }

    // Owner patterns
    for (const p of this.parsingRules.task.ownerPatterns) {
      patterns.push({ pattern: p });
    }

    // Feature ID pattern
    patterns.push({ pattern: this.parsingRules.feature.idPattern });

    // Dataview field pattern (new)
    patterns.push({ pattern: '([\\w-]+)::\\s*(.+?)(?=\\s+[\\w-]+::|$)', flags: 'g' });

    const compiled = regexCache.precompile(patterns);
    console.log(`RegexCache: Pre-compiled ${compiled}/${patterns.length} patterns`);
  }

  /**
   * Extract tasks with full error tracking
   */
  extractTasksWithErrors(content: string): ParseResult<Task[]> {
    const startTime = performance.now();
    const tasks: Task[] = [];
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];

    const lines = content.split('\n');
    const checkboxRegex = regexCache.get(
      this.parsingRules.task.checkboxPattern,
      'gm'
    );

    if (!checkboxRegex) {
      errors.push({
        type: 'invalid_regex',
        message: 'Invalid checkbox pattern in config',
        suggestion: 'Reset to default pattern: ^\\s*-\\s*\\[([ xX])\\]\\s*(.+)$',
      });
      return { data: [], errors, warnings, stats: this.createStats(0, 0, startTime, false) };
    }

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;

      // Reset regex lastIndex for fresh match
      checkboxRegex.lastIndex = 0;
      const match = checkboxRegex.exec(line);

      if (match) {
        try {
          const task = this.parseTaskLine(line, match, lineNumber);
          tasks.push(task);

          // Add warnings for potential issues
          if (task.dueDate && task.dueDate < new Date()) {
            warnings.push({
              type: 'past_due_date',
              message: `Task "${task.content.substring(0, 30)}..." has past due date`,
              line: lineNumber,
            });
          }

          if (task.priority === 'P0' && !task.owner) {
            warnings.push({
              type: 'missing_owner',
              message: `P0 task "${task.content.substring(0, 30)}..." has no owner`,
              line: lineNumber,
            });
          }
        } catch (e) {
          errors.push({
            type: 'malformed_task',
            message: `Failed to parse task: ${(e as Error).message}`,
            line: lineNumber,
            source: line,
          });
        }
      }
    }

    return {
      data: tasks,
      errors,
      warnings,
      stats: this.createStats(lines.length, tasks.length, startTime, false),
    };
  }

  /**
   * Parse single task line with enhanced detection
   */
  private parseTaskLine(line: string, match: RegExpExecArray, lineNumber: number): Task {
    const checkMark = match[1];
    const contentPart = match[2] || line;

    // Extract Dataview inline fields FIRST (field::value)
    const inlineFields = this.extractInlineFields(contentPart);

    // Extract priority (emoji, tag, or inline field)
    const priority = this.extractPriority(contentPart, inlineFields);

    // Extract due date (emoji, inline field, or natural date)
    const dueDate = this.extractDueDate(contentPart, inlineFields);

    // Extract owner (emoji, @mention, or inline field)
    const owner = this.extractOwner(contentPart, inlineFields);

    // Extract tags (including nested tags like #project/subtask)
    const tags = this.extractTags(contentPart);

    // Extract project from nested tags
    const project = this.extractProject(tags);

    // Extract estimated time
    const estimatedTime = this.extractEstimatedTime(contentPart, inlineFields);

    // Extract recurrence
    const recurrence = this.extractRecurrence(contentPart, inlineFields);

    // Extract context (@work, @home, etc.)
    const context = this.extractContext(contentPart);

    // Clean content (remove all metadata)
    const content = this.cleanTaskContent(contentPart);

    return {
      content,
      status: checkMark.toLowerCase() === 'x',
      priority,
      dueDate,
      owner,
      tags,
      rawLine: line,
      lineNumber,
      inlineFields,
      project,
      estimatedTime,
      recurrence,
      context,
    };
  }

  /**
   * Extract Dataview-style inline fields (field::value)
   */
  private extractInlineFields(content: string): Record<string, string> {
    const fields: Record<string, string> = {};
    const regex = regexCache.get('([\\w-]+)::\\s*([^\\s]+(?:\\s+[^:\\s]+)*?)(?=\\s+[\\w-]+::|\\s*$)', 'g');

    if (regex) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const key = match[1].toLowerCase();
        const value = match[2].trim();
        fields[key] = value;
      }
    }

    return fields;
  }

  /**
   * Extract priority with multiple pattern support
   */
  private extractPriority(content: string, inlineFields: Record<string, string>): Priority {
    // Check inline field first
    if (inlineFields.priority) {
      const val = inlineFields.priority.toLowerCase();
      if (val.includes('0') || val === 'critical' || val === 'highest') return 'P0';
      if (val.includes('1') || val === 'high') return 'P1';
      if (val.includes('2') || val === 'medium' || val === 'normal') return 'P2';
    }

    const rules = this.parsingRules.task.priorityIndicators;

    // Check configured patterns
    for (const indicator of rules.p0) {
      if (content.includes(indicator)) return 'P0';
    }
    for (const indicator of rules.p1) {
      if (content.includes(indicator)) return 'P1';
    }
    for (const indicator of rules.p2) {
      if (content.includes(indicator)) return 'P2';
    }

    // Check additional patterns: [!], !!, (P0)
    if (content.includes('[!]') || content.includes('!!') || /\(P0\)/i.test(content)) {
      return 'P0';
    }
    if (/\(P1\)/i.test(content)) return 'P1';
    if (/\(P2\)/i.test(content)) return 'P2';

    return 'none';
  }

  /**
   * Extract due date with multiple format support
   */
  private extractDueDate(content: string, inlineFields: Record<string, string>): Date | undefined {
    // Check inline fields: due::, deadline::, date::
    const dateFields = ['due', 'deadline', 'date', 'scheduled'];
    for (const field of dateFields) {
      if (inlineFields[field]) {
        const parsed = this.parseDate(inlineFields[field]);
        if (parsed) return parsed;
      }
    }

    // Check configured patterns
    for (const pattern of this.parsingRules.task.dueDatePatterns) {
      const regex = regexCache.get(pattern);
      if (regex) {
        const match = regex.exec(content);
        if (match && match[1]) {
          const parsed = this.parseDate(match[1]);
          if (parsed) return parsed;
        }
      }
    }

    return undefined;
  }

  /**
   * Parse date string (supports ISO and common formats)
   */
  private parseDate(dateStr: string): Date | undefined {
    // ISO format: 2026-02-10
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }

    // Slash format: 02/10/2026 or 10/02/2026
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      return new Date(dateStr);
    }

    // Try native parsing as fallback
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return undefined;
  }

  /**
   * Extract owner with multiple format support
   */
  private extractOwner(content: string, inlineFields: Record<string, string>): string | undefined {
    // Check inline fields: owner::, assignee::, assigned::
    const ownerFields = ['owner', 'assignee', 'assigned', 'who'];
    for (const field of ownerFields) {
      if (inlineFields[field]) {
        return inlineFields[field].replace(/^@/, '');
      }
    }

    // Check configured patterns
    for (const pattern of this.parsingRules.task.ownerPatterns) {
      const regex = regexCache.get(pattern);
      if (regex) {
        const match = regex.exec(content);
        if (match && match[1]) {
          return match[1];
        }
      }
    }

    return undefined;
  }

  /**
   * Extract estimated time
   */
  private extractEstimatedTime(content: string, inlineFields: Record<string, string>): string | undefined {
    // Inline field
    if (inlineFields.estimate || inlineFields.time || inlineFields.duration) {
      return inlineFields.estimate || inlineFields.time || inlineFields.duration;
    }

    // Emoji pattern: ⏱️ 2h or ⏱ 30m
    const timeEmoji = /[⏱️⏰]\s*(\d+[hmd](?:\s*\d+[hmd])?)/i.exec(content);
    if (timeEmoji) return timeEmoji[1];

    return undefined;
  }

  /**
   * Extract recurrence pattern
   */
  private extractRecurrence(content: string, inlineFields: Record<string, string>): Recurrence | undefined {
    // Inline field
    const repeatValue = inlineFields.repeat || inlineFields.recurrence || inlineFields.every;
    if (repeatValue) {
      return this.parseRecurrence(repeatValue);
    }

    // Emoji pattern: 🔁 weekly
    const repeatEmoji = /🔁\s*(\w+)/i.exec(content);
    if (repeatEmoji) {
      return this.parseRecurrence(repeatEmoji[1]);
    }

    return undefined;
  }

  private parseRecurrence(value: string): Recurrence | undefined {
    const lower = value.toLowerCase();
    if (lower === 'daily' || lower === 'day') return { type: 'daily' };
    if (lower === 'weekly' || lower === 'week') return { type: 'weekly' };
    if (lower === 'monthly' || lower === 'month') return { type: 'monthly' };
    if (lower === 'yearly' || lower === 'year') return { type: 'yearly' };
    return undefined;
  }

  /**
   * Extract context (@work, @home, etc. - NOT @mentions)
   */
  private extractContext(content: string): string | undefined {
    // Match @context but not @username patterns
    const contexts = ['work', 'home', 'office', 'errands', 'phone', 'computer', 'anywhere'];
    for (const ctx of contexts) {
      if (content.toLowerCase().includes(`@${ctx}`)) {
        return ctx;
      }
    }
    return undefined;
  }

  /**
   * Extract tags including nested tags
   */
  private extractTags(content: string): string[] {
    const tags: string[] = [];
    const tagRegex = regexCache.get('#([\\w/-]+)', 'g');

    if (tagRegex) {
      let match;
      while ((match = tagRegex.exec(content)) !== null) {
        tags.push(match[1]);
      }
    }

    return tags;
  }

  /**
   * Extract project from nested tags (e.g., #project/task -> project)
   */
  private extractProject(tags: string[]): string | undefined {
    for (const tag of tags) {
      if (tag.includes('/')) {
        return tag.split('/')[0];
      }
    }
    return undefined;
  }

  /**
   * Clean task content by removing all metadata
   */
  private cleanTaskContent(content: string): string {
    let cleaned = content;

    // Remove inline fields
    cleaned = cleaned.replace(/[\w-]+::\s*[^\s]+(?:\s+[^:\s]+)*(?=\s+[\w-]+::|\s*$)/g, '');

    // Remove tags
    cleaned = cleaned.replace(/#[\w/-]+/g, '');

    // Remove priority indicators
    cleaned = cleaned.replace(/[⏫🔼🔽🔴🟡🟢]/g, '');
    cleaned = cleaned.replace(/\[P[012]\]/gi, '');
    cleaned = cleaned.replace(/\(P[012]\)/gi, '');
    cleaned = cleaned.replace(/\[!\]/g, '');
    cleaned = cleaned.replace(/!!/g, '');

    // Remove date indicators
    cleaned = cleaned.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '');

    // Remove owner indicators
    cleaned = cleaned.replace(/👤\s*\w+/g, '');
    cleaned = cleaned.replace(/@\w+/g, '');

    // Remove time/recurrence
    cleaned = cleaned.replace(/[⏱️⏰🔁]\s*[\w\d]+/g, '');

    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  private createStats(lines: number, tasks: number, startTime: number, cacheHit: boolean): ParseStats {
    return {
      totalLines: lines,
      tasksFound: tasks,
      parseTime: performance.now() - startTime,
      cacheHit,
    };
  }
}
```

### 3.3 Executive Summary Generator

**File**: `src/reports/ExecutiveSummarySheet.ts` (new)

```typescript
import { Worksheet } from 'exceljs';
import { ExecutiveSummary } from '../types/summary';
import { ChartBuilder } from '../generators/ChartBuilder';
import { StyleManager } from '../generators/StyleManager';
import { LocaleStrings } from '../types/config';

export class ExecutiveSummarySheet {
  private chartBuilder: ChartBuilder;
  private styleManager: StyleManager;
  private locale: LocaleStrings;

  constructor(styleManager: StyleManager, chartBuilder: ChartBuilder, locale: LocaleStrings) {
    this.styleManager = styleManager;
    this.chartBuilder = chartBuilder;
    this.locale = locale;
  }

  /**
   * Create Executive Summary sheet
   */
  create(sheet: Worksheet, summary: ExecutiveSummary): void {
    sheet.properties.tabColor = { argb: 'FF4472C4' };

    // Set column widths
    sheet.columns = [
      { width: 3 },   // A: margin
      { width: 18 },  // B
      { width: 18 },  // C
      { width: 18 },  // D
      { width: 18 },  // E
      { width: 3 },   // F: divider
      { width: 25 },  // G
      { width: 20 },  // H
      { width: 3 },   // I: margin
    ];

    let row = 1;

    // === Header Section ===
    row = this.addHeader(sheet, summary, row);

    // === KPI Boxes ===
    row = this.addKPIBoxes(sheet, summary, row);

    // === Completion Progress Bar ===
    row = this.addCompletionBar(sheet, summary, row);

    // === Two-Column Layout ===
    row = this.addTwoColumnSection(sheet, summary, row);

    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: 3 }];
  }

  private addHeader(sheet: Worksheet, summary: ExecutiveSummary, startRow: number): number {
    // Title
    const titleCell = sheet.getCell(`B${startRow}`);
    titleCell.value = 'EXECUTIVE SUMMARY';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF4472C4' } };
    sheet.mergeCells(`B${startRow}:E${startRow}`);

    // Date range
    const dateCell = sheet.getCell(`B${startRow + 1}`);
    const startDate = summary.dateRange.start.toLocaleDateString();
    const endDate = summary.dateRange.end.toLocaleDateString();
    dateCell.value = `${startDate} - ${endDate}`;
    dateCell.font = { size: 11, color: { argb: 'FF666666' } };

    // Generated timestamp
    const genCell = sheet.getCell(`G${startRow}`);
    genCell.value = `Generated: ${summary.generatedAt.toLocaleString()}`;
    genCell.font = { size: 9, color: { argb: 'FF999999' } };
    genCell.alignment = { horizontal: 'right' };
    sheet.mergeCells(`G${startRow}:H${startRow}`);

    return startRow + 3;
  }

  private addKPIBoxes(sheet: Worksheet, summary: ExecutiveSummary, startRow: number): number {
    const kpis = [
      { label: 'Total Tasks', value: summary.kpis.totalTasks, color: 'FF4472C4' },
      { label: 'Completed', value: summary.kpis.completedTasks, color: 'FF69DB7C' },
      { label: 'Blockers', value: summary.kpis.activeBlockers, color: 'FFFF6B6B' },
      { label: 'Features', value: summary.kpis.totalFeatures, color: 'FFFFE066' },
    ];

    const cols = ['B', 'C', 'D', 'E'];

    kpis.forEach((kpi, index) => {
      const col = cols[index];

      // Value cell
      const valueCell = sheet.getCell(`${col}${startRow}`);
      valueCell.value = kpi.value;
      valueCell.font = { size: 28, bold: true };
      valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
      valueCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: kpi.color },
      };

      // Label cell
      const labelCell = sheet.getCell(`${col}${startRow + 1}`);
      labelCell.value = kpi.label;
      labelCell.font = { size: 10, color: { argb: 'FF666666' } };
      labelCell.alignment = { horizontal: 'center' };
    });

    // Set row heights
    sheet.getRow(startRow).height = 45;
    sheet.getRow(startRow + 1).height = 20;

    return startRow + 3;
  }

  private addCompletionBar(sheet: Worksheet, summary: ExecutiveSummary, startRow: number): number {
    const rate = summary.kpis.completionRate;

    // Label
    const labelCell = sheet.getCell(`B${startRow}`);
    labelCell.value = 'OVERALL COMPLETION';
    labelCell.font = { size: 11, bold: true };

    // Percentage
    const pctCell = sheet.getCell(`E${startRow}`);
    pctCell.value = `${rate}%`;
    pctCell.font = { size: 14, bold: true, color: { argb: rate >= 70 ? 'FF69DB7C' : 'FFFF6B6B' } };
    pctCell.alignment = { horizontal: 'right' };

    // Progress bar (using cell background)
    const barRow = startRow + 1;
    const filledCells = Math.round(rate / 25); // 4 cells = 100%
    const cols = ['B', 'C', 'D', 'E'];

    cols.forEach((col, index) => {
      const cell = sheet.getCell(`${col}${barRow}`);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: index < filledCells ? 'FF69DB7C' : 'FFE0E0E0' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: index === 0 ? { style: 'thin', color: { argb: 'FFCCCCCC' } } : undefined,
        right: index === 3 ? { style: 'thin', color: { argb: 'FFCCCCCC' } } : undefined,
      };
    });

    sheet.getRow(barRow).height = 15;

    return startRow + 3;
  }

  private addTwoColumnSection(sheet: Worksheet, summary: ExecutiveSummary, startRow: number): number {
    // === Left Column: Priority Breakdown ===
    let leftRow = this.addPriorityBreakdown(sheet, summary, startRow, 'B');

    // === Right Column: Top Blockers ===
    let rightRow = this.addTopBlockers(sheet, summary, startRow, 'G');

    const maxRow = Math.max(leftRow, rightRow);

    // === Second Row: Upcoming Deadlines & Team Workload ===
    leftRow = this.addUpcomingDeadlines(sheet, summary, maxRow + 1, 'B');
    rightRow = this.addTeamWorkload(sheet, summary, maxRow + 1, 'G');

    return Math.max(leftRow, rightRow);
  }

  private addPriorityBreakdown(sheet: Worksheet, summary: ExecutiveSummary, startRow: number, col: string): number {
    // Header
    const headerCell = sheet.getCell(`${col}${startRow}`);
    headerCell.value = 'PRIORITY BREAKDOWN';
    headerCell.font = { size: 11, bold: true, color: { argb: 'FF4472C4' } };
    sheet.mergeCells(`${col}${startRow}:E${startRow}`);

    const priorities = [
      { label: 'P0 Critical', data: summary.priorityBreakdown.p0, color: 'FFFF6B6B' },
      { label: 'P1 High', data: summary.priorityBreakdown.p1, color: 'FFFFE066' },
      { label: 'P2 Normal', data: summary.priorityBreakdown.p2, color: 'FF69DB7C' },
    ];

    let row = startRow + 1;
    for (const p of priorities) {
      const labelCell = sheet.getCell(`${col}${row}`);
      labelCell.value = p.label;
      labelCell.font = { size: 10 };

      const countCell = sheet.getCell(`C${row}`);
      countCell.value = `${p.data.completed}/${p.data.total}`;
      countCell.alignment = { horizontal: 'center' };

      const barCell = sheet.getCell(`D${row}`);
      const pct = p.data.total > 0 ? Math.round((p.data.completed / p.data.total) * 100) : 0;
      barCell.value = `${pct}%`;
      barCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: p.color },
      };
      barCell.alignment = { horizontal: 'center' };

      row++;
    }

    return row;
  }

  private addTopBlockers(sheet: Worksheet, summary: ExecutiveSummary, startRow: number, col: string): number {
    // Header
    const headerCell = sheet.getCell(`${col}${startRow}`);
    headerCell.value = 'TOP BLOCKERS';
    headerCell.font = { size: 11, bold: true, color: { argb: 'FFFF6B6B' } };
    sheet.mergeCells(`${col}${startRow}:H${startRow}`);

    let row = startRow + 1;
    const blockers = summary.topBlockers.slice(0, 5);

    if (blockers.length === 0) {
      const emptyCell = sheet.getCell(`${col}${row}`);
      emptyCell.value = 'No active blockers';
      emptyCell.font = { size: 10, italic: true, color: { argb: 'FF999999' } };
      return row + 1;
    }

    for (const blocker of blockers) {
      const idCell = sheet.getCell(`${col}${row}`);
      idCell.value = blocker.id;
      idCell.font = { size: 9, color: { argb: 'FF666666' } };

      const titleCell = sheet.getCell(`H${row}`);
      titleCell.value = blocker.title.substring(0, 30) + (blocker.title.length > 30 ? '...' : '');
      titleCell.font = { size: 10 };

      row++;
    }

    return row;
  }

  private addUpcomingDeadlines(sheet: Worksheet, summary: ExecutiveSummary, startRow: number, col: string): number {
    // Header
    const headerCell = sheet.getCell(`${col}${startRow}`);
    headerCell.value = 'UPCOMING DEADLINES (7 days)';
    headerCell.font = { size: 11, bold: true, color: { argb: 'FFFFE066' } };
    sheet.mergeCells(`${col}${startRow}:E${startRow}`);

    let row = startRow + 1;
    const deadlines = summary.upcomingDeadlines.slice(0, 5);

    if (deadlines.length === 0) {
      const emptyCell = sheet.getCell(`${col}${row}`);
      emptyCell.value = 'No upcoming deadlines';
      emptyCell.font = { size: 10, italic: true, color: { argb: 'FF999999' } };
      return row + 1;
    }

    for (const item of deadlines) {
      const taskCell = sheet.getCell(`${col}${row}`);
      taskCell.value = item.task.substring(0, 25) + (item.task.length > 25 ? '...' : '');
      taskCell.font = { size: 10 };

      const dateCell = sheet.getCell(`E${row}`);
      dateCell.value = item.dueDate.toLocaleDateString();
      dateCell.font = { size: 9, color: { argb: 'FF666666' } };
      dateCell.alignment = { horizontal: 'right' };

      row++;
    }

    return row;
  }

  private addTeamWorkload(sheet: Worksheet, summary: ExecutiveSummary, startRow: number, col: string): number {
    // Header
    const headerCell = sheet.getCell(`${col}${startRow}`);
    headerCell.value = 'TEAM WORKLOAD';
    headerCell.font = { size: 11, bold: true, color: { argb: 'FF4472C4' } };
    sheet.mergeCells(`${col}${startRow}:H${startRow}`);

    let row = startRow + 1;
    const workload = summary.teamWorkload.slice(0, 5);

    if (workload.length === 0) {
      const emptyCell = sheet.getCell(`${col}${row}`);
      emptyCell.value = 'No owner data available';
      emptyCell.font = { size: 10, italic: true, color: { argb: 'FF999999' } };
      return row + 1;
    }

    for (const member of workload) {
      const nameCell = sheet.getCell(`${col}${row}`);
      nameCell.value = member.owner;
      nameCell.font = { size: 10 };

      const countCell = sheet.getCell(`H${row}`);
      countCell.value = `${member.completedCount}/${member.taskCount} tasks`;
      countCell.font = { size: 9, color: { argb: 'FF666666' } };
      countCell.alignment = { horizontal: 'right' };

      row++;
    }

    return row;
  }
}
```

---

## 4. File Structure

```
src/
├── types/
│   ├── config.ts          # Existing
│   ├── data.ts            # MODIFIED: Enhanced Task interface
│   ├── parsing.ts         # NEW: ParseResult, ParseError types
│   └── summary.ts         # NEW: ExecutiveSummary type
├── utils/
│   ├── RegexCache.ts      # NEW: Regex caching utility
│   ├── dateUtils.ts       # Existing
│   └── logger.ts          # MODIFIED: Add validation notices
├── services/
│   ├── MarkdownParser.ts  # MODIFIED: Enhanced parsing + errors
│   ├── ConfigManager.ts   # MODIFIED: Add validation
│   ├── DataAggregator.ts  # MODIFIED: Use new parser methods
│   └── VaultService.ts    # Existing
├── reports/
│   ├── WeeklyReport.ts    # MODIFIED: Add Executive Summary sheet
│   ├── ExecutiveSummarySheet.ts  # NEW: Summary sheet generator
│   └── ...                # Other reports unchanged
└── main.ts                # MODIFIED: Initialize RegexCache
```

---

## 5. Implementation Order

### Phase 1: Core Infrastructure (Priority: P0)

| ID | Task | Files | Dependencies |
|----|------|-------|--------------|
| OPT-001 | Create RegexCache utility | `src/utils/RegexCache.ts` | None |
| OPT-002 | Create parsing types | `src/types/parsing.ts` | None |
| OPT-003 | Update Task interface | `src/types/data.ts` | None |

### Phase 2: Enhanced MarkdownParser (Priority: P0)

| ID | Task | Files | Dependencies |
|----|------|-------|--------------|
| DET-001 | Integrate RegexCache | `src/services/MarkdownParser.ts` | OPT-001 |
| DET-002 | Add extractInlineFields() | `src/services/MarkdownParser.ts` | DET-001 |
| DET-003 | Add extractTasksWithErrors() | `src/services/MarkdownParser.ts` | OPT-002, DET-002 |
| DET-004 | Update all extraction methods | `src/services/MarkdownParser.ts` | DET-001 |

### Phase 3: Error Handling (Priority: P1)

| ID | Task | Files | Dependencies |
|----|------|-------|--------------|
| ERR-001 | Add showParseWarnings() | `src/utils/logger.ts` | OPT-002 |
| ERR-002 | Add config validation | `src/services/ConfigManager.ts` | ERR-001 |
| ERR-003 | Update DataAggregator | `src/services/DataAggregator.ts` | DET-003 |

### Phase 4: Executive Summary (Priority: P1)

| ID | Task | Files | Dependencies |
|----|------|-------|--------------|
| SUM-001 | Create ExecutiveSummary type | `src/types/summary.ts` | None |
| SUM-002 | Create ExecutiveSummarySheet | `src/reports/ExecutiveSummarySheet.ts` | SUM-001 |
| SUM-003 | Integrate into WeeklyReport | `src/reports/WeeklyReport.ts` | SUM-002 |
| SUM-004 | Add summary data calculation | `src/services/MetricsCalculator.ts` | SUM-001 |

### Phase 5: Integration & Testing (Priority: P0)

| ID | Task | Files | Dependencies |
|----|------|-------|--------------|
| INT-001 | Initialize RegexCache on load | `src/main.ts` | OPT-001 |
| INT-002 | Build and test | All | All |

---

## 6. Verification Criteria

### 6.1 Parsing Accuracy

| Test Case | Expected Result |
|-----------|-----------------|
| `- [ ] Task priority::P0` | Priority = P0 |
| `- [ ] Task due::2026-02-15` | DueDate = Feb 15 |
| `- [ ] Task ⏱️ 2h` | EstimatedTime = "2h" |
| `- [ ] Task 🔁 weekly` | Recurrence.type = "weekly" |
| `- [x] Done assignee::alice` | Owner = "alice", Status = true |

### 6.2 Error Detection

| Scenario | Expected |
|----------|----------|
| Invalid regex in config | ParseError with suggestion |
| Past due date | ParseWarning shown |
| P0 task without owner | ParseWarning shown |

### 6.3 Executive Summary

| Criteria | Test |
|----------|------|
| Sheet position | First sheet in workbook |
| KPI accuracy | Matches calculated totals |
| Blockers shown | Top 5 by priority |
| Deadlines shown | Next 7 days only |

---

## 7. Migration Notes

### Backward Compatibility

- All existing task formats continue to work
- New fields (`inlineFields`, `estimatedTime`, etc.) are optional
- Reports work with or without new metadata

### Config Changes

None required. New patterns detected automatically.

---

**Next Step**: Implement Phase 1 (RegexCache and types)
