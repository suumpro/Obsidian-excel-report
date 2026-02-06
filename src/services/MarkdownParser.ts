/**
 * Markdown parsing service
 * Equivalent to Python parsers/markdown_parser.py
 * Enhanced with configurable parsing rules
 *
 * v3 Enhancements:
 * - RegexCache integration for performance
 * - Dataview inline field extraction
 * - Enhanced error handling with ParseResult
 * - New metadata fields (estimatedTime, recurrence, context)
 */

import { Task, Feature, Blocker, Priority, FeatureStatus, BlockerPriority, BlockerStatus } from '../types/models';
import { CoordinationItem, MilestoneItem, PlaybookItem } from '../types/data';
import { ParsingConfig, TaskParsingRules, FeatureParsingRules, BlockerParsingRules, TableParsingRules } from '../types/config';
import { matchesAny, createSafeRegex } from '../utils/configUtils';
import { RegexCache, getGlobalRegexCache } from '../utils/RegexCache';
import {
  ParseResult,
  ParseError,
  ParseWarning,
  TaskParseResult,
  Recurrence,
  RecurrenceFrequency,
  emptyParseResult,
  createParseError,
  createParseWarning,
} from '../types/parsing';

/**
 * Task filter options
 */
export interface TaskFilters {
  priority?: Priority;
  status?: boolean;
  tags?: string[];
}

/**
 * Default parsing rules (used when no config provided)
 */
const DEFAULT_PARSING_RULES: ParsingConfig = {
  task: {
    checkboxPattern: '- \\[([ xX])\\]',
    priorityIndicators: {
      p0: ['⏫', '#P0', '[P0]'],
      p1: ['🔼', '#P1', '[P1]'],
      p2: ['🔽', '#P2', '[P2]'],
    },
    statusIndicators: {
      completed: ['[x]', '✅', '완료', 'DONE'],
      pending: ['[ ]', '⬜', '대기', 'TODO'],
      inProgress: ['[/]', '🔄', '진행중', 'WIP'],
    },
    dueDatePatterns: ['📅\\s*(\\d{4}-\\d{2}-\\d{2})'],
    ownerPatterns: ['👤\\s*(\\w+)', '@(\\w+)'],
  },
  feature: {
    idPattern: '[AB]\\d+',
    fields: {
      status: ['status', '상태'],
      priority: ['priority', '우선순위'],
      cycle: ['cycle', '사이클'],
      owner: ['owner', '담당자'],
    },
    statusMapping: {
      completed: ['완료', 'Complete', 'Completed', 'Done'],
      inProgress: ['진행중', '진행', 'In Progress', 'WIP'],
      pending: ['대기', '계획', 'Pending', 'TODO'],
    },
  },
  blocker: {
    resolvedIndicators: ['✅', '해결', 'Resolved', 'Fixed'],
    unresolvedIndicators: ['⚠️', '미해결', 'Open', 'Unresolved'],
    inProgressIndicators: ['🔄', '진행중', 'In Progress'],
    prioritySections: {
      high: ['높음 우선순위', 'High Priority', 'P0'],
      medium: ['중간 우선순위', 'Medium Priority', 'P1'],
      low: ['낮음 우선순위', 'Low Priority', 'P2'],
    },
    impactPatterns: ['영향[:\\s]*(.*)', 'Impact[:\\s]*(.*)'],
  },
  table: {
    coordinationHeaders: ['구분', '협의', 'Category', 'Content'],
    milestoneHeaders: ['마일스톤', 'Milestone', '날짜', 'Date'],
    playbookHeaders: ['항목', 'Item', '목표', 'Target'],
    columnAliases: {
      category: ['구분', 'Category', '분류'],
      content: ['협의내용', 'Content', '내용'],
      priority: ['우선순위', 'Priority'],
      owner: ['담당자', 'Owner', '담당'],
      deadline: ['마감일', 'Deadline', '기한'],
      status: ['상태', 'Status'],
      date: ['날짜', 'Date', '일자'],
      name: ['이름', 'Name', '작업명'],
      target: ['목표', 'Target'],
      current: ['현재', 'Current'],
      percentage: ['진척률', 'Progress', '%'],
      risk: ['위험', 'Risk', '리스크'],
    },
  },
};

/**
 * Markdown parser for extracting data from Obsidian files
 */
export class MarkdownParser {
  private parsingRules: ParsingConfig;
  private regexCache: RegexCache;

  constructor(parsingConfig?: ParsingConfig) {
    this.parsingRules = parsingConfig || DEFAULT_PARSING_RULES;
    this.regexCache = getGlobalRegexCache();
  }

  /**
   * Update parsing rules (e.g., when config changes)
   */
  setParsingRules(rules: ParsingConfig): void {
    this.parsingRules = rules;
  }

  /**
   * Get current parsing rules
   */
  getParsingRules(): ParsingConfig {
    return this.parsingRules;
  }
  /**
   * Parse frontmatter and content from markdown
   */
  parseFile(content: string): { metadata: Record<string, unknown>; content: string } {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (frontmatterMatch) {
      const yamlContent = frontmatterMatch[1];
      const metadata = this.parseYaml(yamlContent);
      return { metadata, content: frontmatterMatch[2] };
    }

    return { metadata: {}, content };
  }

  /**
   * Simple YAML parser for frontmatter
   */
  private parseYaml(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const value = match[2].trim();
        // Try to parse as number or boolean
        if (value === 'true') {
          result[match[1]] = true;
        } else if (value === 'false') {
          result[match[1]] = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          result[match[1]] = Number(value);
        } else {
          result[match[1]] = value;
        }
      }
    }

    return result;
  }

  /**
   * Extract section content under a heading
   */
  extractSection(content: string, heading: string, level: number = 2): string | null {
    const escapedHeading = this.escapeRegex(heading);
    const headingPattern = new RegExp(
      `^${'#'.repeat(level)}\\s+${escapedHeading}\\s*$`,
      'm'
    );

    const lines = content.split('\n');
    const sectionLines: string[] = [];
    let inSection = false;

    for (const line of lines) {
      if (headingPattern.test(line)) {
        inSection = true;
        continue;
      }

      if (inSection) {
        const headingMatch = line.match(/^(#{1,6})\s+/);
        if (headingMatch && headingMatch[1].length <= level) {
          break;
        }
        sectionLines.push(line);
      }
    }

    return sectionLines.length > 0 ? sectionLines.join('\n').trim() : null;
  }

  /**
   * Extract tasks from markdown content
   */
  extractTasks(content: string, filters?: TaskFilters): Task[] {
    const taskPattern = /^(\s*-\s*\[([ xX])\])\s+(.+)$/gm;
    const tasks: Task[] = [];
    let match;

    while ((match = taskPattern.exec(content)) !== null) {
      const task = this.parseTaskLine(match[0], match[2], match[3]);
      if (task && this.matchesFilters(task, filters)) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  /**
   * Extract tasks with full error tracking (v3 enhanced method)
   * Returns ParseResult with errors and warnings for better visibility
   */
  extractTasksWithErrors(content: string, filters?: TaskFilters): ParseResult<Task[]> {
    const startTime = Date.now();
    const tasks: Task[] = [];
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];
    const lines = content.split('\n');

    const taskPattern = this.regexCache.get('^\\s*-\\s*\\[([ xX])\\]\\s+(.+)$', 'i');
    if (!taskPattern) {
      return {
        data: [],
        errors: [createParseError('invalid_regex', 'Task pattern regex failed to compile')],
        warnings: [],
        stats: {
          totalProcessed: 0,
          successCount: 0,
          errorCount: 1,
          warningCount: 0,
          durationMs: Date.now() - startTime,
          linesProcessed: lines.length,
        },
      };
    }

    let totalProcessed = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      taskPattern.lastIndex = 0;
      const match = taskPattern.exec(line);

      if (match) {
        totalProcessed++;
        try {
          const task = this.parseTaskLineEnhanced(line, match[1], match[2], lineNumber);

          // Add warnings for missing metadata
          if (!task.priority) {
            warnings.push(createParseWarning(
              'missing_priority',
              `Task has no priority indicator`,
              { line: lineNumber, suggestion: 'Add #P0, #P1, or #P2 tag' }
            ));
          }
          if (!task.dueDate) {
            warnings.push(createParseWarning(
              'missing_date',
              `Task has no due date`,
              { line: lineNumber, suggestion: 'Add 📅 YYYY-MM-DD or due:: YYYY-MM-DD' }
            ));
          }

          if (this.matchesFilters(task, filters)) {
            tasks.push(task);
          }
        } catch (e) {
          errors.push(createParseError(
            'malformed_task',
            `Failed to parse task: ${e instanceof Error ? e.message : String(e)}`,
            { line: lineNumber, originalText: line }
          ));
        }
      }
    }

    return {
      data: tasks,
      errors,
      warnings,
      stats: {
        totalProcessed,
        successCount: tasks.length,
        errorCount: errors.length,
        warningCount: warnings.length,
        durationMs: Date.now() - startTime,
        linesProcessed: lines.length,
      },
    };
  }

  /**
   * Extract Dataview-style inline fields from text
   * Supports format: field:: value
   *
   * @param text - Text to extract fields from
   * @returns Map of field names to values
   */
  extractInlineFields(text: string): Record<string, string> {
    const fields: Record<string, string> = {};
    const pattern = this.regexCache.get('(\\w+)::\\s*([^\\n\\]]+?)(?=\\s*(?:\\[|$|\\n|\\s+\\w+::))', 'g');

    if (!pattern) return fields;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const fieldName = match[1].toLowerCase();
      const fieldValue = match[2].trim();
      fields[fieldName] = fieldValue;
    }

    return fields;
  }

  /**
   * Extract estimated time from text
   * Supports: ⏱️ 2h, estimate:: 2 hours, etc.
   */
  extractEstimatedTime(text: string): string | undefined {
    // Check emoji format: ⏱️ 2h
    const emojiPattern = this.regexCache.get('⏱️\\s*(\\d+[hmd])', 'i');
    if (emojiPattern) {
      const match = emojiPattern.exec(text);
      if (match) return match[1];
    }

    // Check inline field format: estimate:: 2 hours
    const inlinePattern = this.regexCache.get('estimate::\\s*(\\d+\\s*(?:hours?|mins?|minutes?|days?|[hmd]))', 'i');
    if (inlinePattern) {
      const match = inlinePattern.exec(text);
      if (match) return this.normalizeTimeEstimate(match[1]);
    }

    return undefined;
  }

  /**
   * Extract recurrence information from text
   * Supports: 🔁 weekly, repeat:: weekly, etc.
   */
  extractRecurrence(text: string): Recurrence | undefined {
    const frequencies: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

    // Check emoji format: 🔁 weekly
    const emojiPattern = this.regexCache.get('🔁\\s*(daily|weekly|monthly|yearly)', 'i');
    if (emojiPattern) {
      const match = emojiPattern.exec(text);
      if (match && frequencies.includes(match[1].toLowerCase() as RecurrenceFrequency)) {
        return { frequency: match[1].toLowerCase() as RecurrenceFrequency };
      }
    }

    // Check inline field format: repeat:: weekly
    const inlinePattern = this.regexCache.get('repeat::\\s*(daily|weekly|monthly|yearly)', 'i');
    if (inlinePattern) {
      const match = inlinePattern.exec(text);
      if (match && frequencies.includes(match[1].toLowerCase() as RecurrenceFrequency)) {
        return { frequency: match[1].toLowerCase() as RecurrenceFrequency };
      }
    }

    return undefined;
  }

  /**
   * Extract context tag from text (e.g., @work, @home)
   * Excludes owner mentions by checking for common owner patterns
   */
  extractContext(text: string): string | undefined {
    const contextPattern = this.regexCache.get('@(work|home|phone|computer|anywhere|office|errands)', 'i');
    if (contextPattern) {
      const match = contextPattern.exec(text);
      if (match) return `@${match[1].toLowerCase()}`;
    }
    return undefined;
  }

  /**
   * Normalize time estimate to short format (e.g., "2h", "30m", "1d")
   */
  private normalizeTimeEstimate(time: string): string {
    const lower = time.toLowerCase().trim();

    // Already short format
    if (/^\d+[hmd]$/.test(lower)) return lower;

    // Convert long format
    const match = lower.match(/(\d+)\s*(hours?|mins?|minutes?|days?)/);
    if (match) {
      const num = match[1];
      const unit = match[2];
      if (unit.startsWith('hour')) return `${num}h`;
      if (unit.startsWith('min')) return `${num}m`;
      if (unit.startsWith('day')) return `${num}d`;
    }

    return time;
  }

  /**
   * Enhanced task line parsing with v3 fields
   */
  private parseTaskLineEnhanced(rawLine: string, checkbox: string, contentPart: string, lineNumber: number): Task {
    const rules = this.parsingRules.task;

    // Check completion status using configurable indicators
    const isCompleted = checkbox.toLowerCase() === 'x' ||
      matchesAny(rawLine, rules.statusIndicators.completed);

    // Extract tags (including nested tags like #project/subtask)
    const tags = [...contentPart.matchAll(/#([\w/-]+)/g)].map(m => m[1]);

    // Extract project from nested tags
    let project: string | undefined;
    for (const tag of tags) {
      if (tag.includes('/')) {
        project = tag.split('/')[0];
        break;
      }
    }

    // Extract priority using configurable indicators + Dataview fields
    let priority: Priority | null = null;
    const inlineFields = this.extractInlineFields(contentPart);

    // Check inline field first
    if (inlineFields['priority']) {
      const pValue = inlineFields['priority'].toUpperCase();
      if (pValue.includes('P0') || pValue.includes('HIGH') || pValue.includes('CRITICAL')) {
        priority = 'P0';
      } else if (pValue.includes('P1') || pValue.includes('MEDIUM') || pValue.includes('NORMAL')) {
        priority = 'P1';
      } else if (pValue.includes('P2') || pValue.includes('LOW')) {
        priority = 'P2';
      }
    }

    // Fall back to emoji/tag indicators
    if (!priority) {
      if (matchesAny(contentPart, rules.priorityIndicators.p0) || tags.includes('P0')) {
        priority = 'P0';
      } else if (matchesAny(contentPart, rules.priorityIndicators.p1) || tags.includes('P1')) {
        priority = 'P1';
      } else if (matchesAny(contentPart, rules.priorityIndicators.p2) || tags.includes('P2')) {
        priority = 'P2';
      }
    }

    // Check for additional priority patterns: [!], !!, (P0)
    if (!priority) {
      if (contentPart.includes('[!]') || contentPart.includes('!!')) {
        priority = 'P0';
      }
      const parenMatch = contentPart.match(/\(P([012])\)/i);
      if (parenMatch) {
        priority = `P${parenMatch[1]}` as Priority;
      }
    }

    // Extract due date using configurable patterns + Dataview fields
    let dueDate: Date | null = null;

    // Check inline field first
    if (inlineFields['due']) {
      const parsed = new Date(inlineFields['due']);
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed;
      }
    }

    // Fall back to emoji patterns
    if (!dueDate) {
      for (const pattern of rules.dueDatePatterns) {
        const regex = this.regexCache.get(pattern, 'i');
        if (regex) {
          const dateMatch = regex.exec(contentPart);
          if (dateMatch && dateMatch[1]) {
            dueDate = new Date(dateMatch[1]);
            break;
          }
        }
      }
    }

    // Extract owner using configurable patterns + Dataview fields
    let owner: string | null = null;

    // Check inline fields first
    if (inlineFields['owner']) {
      owner = inlineFields['owner'];
    } else if (inlineFields['assignee']) {
      owner = inlineFields['assignee'];
    }

    // Fall back to emoji/@ patterns
    if (!owner) {
      for (const pattern of rules.ownerPatterns) {
        const regex = this.regexCache.get(pattern, 'i');
        if (regex) {
          const ownerMatch = regex.exec(contentPart);
          if (ownerMatch && ownerMatch[1]) {
            owner = ownerMatch[1];
            break;
          }
        }
      }
    }

    // Extract new v3 fields
    const estimatedTime = this.extractEstimatedTime(contentPart);
    const recurrence = this.extractRecurrence(contentPart);
    const context = this.extractContext(contentPart);

    // Clean content (remove indicators and metadata)
    let cleanContent = contentPart;
    // Remove priority indicators
    [...rules.priorityIndicators.p0, ...rules.priorityIndicators.p1, ...rules.priorityIndicators.p2]
      .forEach(indicator => {
        if (!indicator.startsWith('/')) {
          cleanContent = cleanContent.replace(new RegExp(this.escapeRegex(indicator), 'g'), '');
        }
      });
    // Remove date patterns
    rules.dueDatePatterns.forEach(pattern => {
      const regex = this.regexCache.get(pattern, 'g');
      if (regex) cleanContent = cleanContent.replace(regex, '');
    });
    // Remove inline fields
    cleanContent = cleanContent.replace(/\w+::\s*[^\n\]]+?(?=\s*(?:\[|$|\n|\s+\w+::))/g, '');
    // Remove time estimate emoji
    cleanContent = cleanContent.replace(/⏱️\s*\d+[hmd]/gi, '');
    // Remove recurrence emoji
    cleanContent = cleanContent.replace(/🔁\s*(?:daily|weekly|monthly|yearly)/gi, '');
    // Remove tags
    cleanContent = cleanContent.replace(/#[\w/-]+/g, '').trim();

    return {
      content: cleanContent,
      status: isCompleted,
      tags,
      priority,
      dueDate,
      category: null,
      owner,
      rawLine,
      // v3 fields
      estimatedTime,
      recurrence,
      context,
      lineNumber,
      project,
      inlineFields: Object.keys(inlineFields).length > 0 ? inlineFields : undefined,
    };
  }

  /**
   * Parse a single task line using configurable rules
   * Uses RegexCache for better performance
   */
  private parseTaskLine(rawLine: string, checkbox: string, contentPart: string): Task {
    const rules = this.parsingRules.task;

    // Check completion status using configurable indicators
    const isCompleted = checkbox.toLowerCase() === 'x' ||
      matchesAny(rawLine, rules.statusIndicators.completed);

    // Extract tags
    const tags = [...contentPart.matchAll(/#([\w/-]+)/g)].map(m => m[1]);

    // Extract priority using configurable indicators
    let priority: Priority | null = null;
    if (matchesAny(contentPart, rules.priorityIndicators.p0) || tags.includes('P0')) {
      priority = 'P0';
    } else if (matchesAny(contentPart, rules.priorityIndicators.p1) || tags.includes('P1')) {
      priority = 'P1';
    } else if (matchesAny(contentPart, rules.priorityIndicators.p2) || tags.includes('P2')) {
      priority = 'P2';
    }

    // Extract due date using configurable patterns (using cached regex)
    let dueDate: Date | null = null;
    for (const pattern of rules.dueDatePatterns) {
      const regex = this.regexCache.get(pattern, 'i');
      if (regex) {
        const dateMatch = regex.exec(contentPart);
        if (dateMatch && dateMatch[1]) {
          dueDate = new Date(dateMatch[1]);
          break;
        }
      }
    }

    // Extract owner using configurable patterns (using cached regex)
    let owner: string | null = null;
    for (const pattern of rules.ownerPatterns) {
      const regex = this.regexCache.get(pattern, 'i');
      if (regex) {
        const ownerMatch = regex.exec(contentPart);
        if (ownerMatch && ownerMatch[1]) {
          owner = ownerMatch[1];
          break;
        }
      }
    }

    // Clean content (remove indicators and metadata)
    let cleanContent = contentPart;
    // Remove priority indicators
    [...rules.priorityIndicators.p0, ...rules.priorityIndicators.p1, ...rules.priorityIndicators.p2]
      .forEach(indicator => {
        if (!indicator.startsWith('/')) {
          cleanContent = cleanContent.replace(new RegExp(this.escapeRegex(indicator), 'g'), '');
        }
      });
    // Remove date patterns (using cached regex)
    rules.dueDatePatterns.forEach(pattern => {
      const regex = this.regexCache.get(pattern, 'g');
      if (regex) cleanContent = cleanContent.replace(regex, '');
    });
    // Remove tags
    cleanContent = cleanContent.replace(/#[\w/-]+/g, '').trim();

    return {
      content: cleanContent,
      status: isCompleted,
      tags,
      priority,
      dueDate,
      category: null,
      owner,
      rawLine,
    };
  }

  /**
   * Check if task matches filters
   */
  private matchesFilters(task: Task, filters?: TaskFilters): boolean {
    if (!filters) return true;

    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }

    if (filters.status !== undefined && task.status !== filters.status) {
      return false;
    }

    if (filters.tags && filters.tags.length > 0) {
      const requiredTags = new Set(filters.tags);
      const taskTags = new Set(task.tags);
      for (const tag of requiredTags) {
        if (!taskTags.has(tag)) return false;
      }
    }

    return true;
  }

  /**
   * Parse markdown table into array of objects
   */
  parseTable(content: string, sectionHeading?: string): Record<string, string>[] {
    let tableContent = content;
    if (sectionHeading) {
      const section = this.extractSection(content, sectionHeading);
      if (section) {
        tableContent = section;
      }
    }

    const lines = tableContent.split('\n').filter(line => line.includes('|'));
    if (lines.length < 2) return [];

    // Parse headers
    const headers = lines[0]
      .split('|')
      .filter(cell => cell.trim())
      .map(cell => cell.trim());

    // Skip separator line, parse data rows
    const rows: Record<string, string>[] = [];
    for (let i = 2; i < lines.length; i++) {
      const cells = lines[i]
        .split('|')
        .map(cell => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      if (cells.length === headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = cells[idx];
        });
        rows.push(row);
      }
    }

    return rows;
  }

  /**
   * Extract current week number from content
   */
  extractCurrentWeek(content: string): number | null {
    const patterns = [
      /W(\d+)/i,
      /Week\s+(\d+)/i,
      /현재\s*주차.*?W?(\d+)/,
      /주차:\s*(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return parseInt(match[1]);
    }

    return null;
  }

  /**
   * Extract current cycle from content
   */
  extractCurrentCycle(content: string): string | null {
    const patterns = [
      /C(\d+)/i,
      /Cycle\s+(\d+)/i,
      /현재\s*Cycle.*?C?(\d+)/,
      /사이클:\s*C?(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return `C${match[1]}`;
    }

    return null;
  }

  /**
   * Extract metadata value from content
   * Searches for patterns like:
   * - **Key**: Value
   * - Key: Value
   * - | **Key** | Value |
   */
  extractMetadataValue(content: string, key: string): string | null {
    const patterns = [
      new RegExp(`\\*\\*${key}\\*\\*:\\s*(.+)`, 'i'),
      new RegExp(`${key}:\\s*(.+)`, 'i'),
      new RegExp(`\\|\\s*\\*\\*${key}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }

    return null;
  }

  /**
   * Parse features from roadmap content
   * Uses configurable ID pattern from parsing rules
   */
  parseFeatures(content: string): Feature[] {
    const features: Feature[] = [];
    const lines = content.split('\n');

    // Use configurable ID pattern
    const idPatternStr = this.parsingRules.feature.idPattern;
    const featurePattern = createSafeRegex(`(${idPatternStr})`) || /([AB]\d+)/;

    for (const line of lines) {
      if (!line.includes('|')) continue;

      const match = line.match(featurePattern);
      if (!match) continue;

      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length < 4) continue;

      // Try to extract feature data from table cells
      const idCell = cells.find(c => featurePattern.test(c));
      if (!idCell) continue;

      const id = idCell.match(featurePattern)?.[0] || '';
      const cellIndex = cells.indexOf(idCell);

      const feature: Feature = {
        id,
        name: cells[cellIndex + 1] || cells[1] || '',
        priority: this.parsePriority(cells[cellIndex + 2] || cells[2] || ''),
        status: this.parseFeatureStatus(cells[cellIndex + 3] || cells[3] || ''),
        startDate: cells[cellIndex + 4] || cells[4] || null,
        completionDate: cells[cellIndex + 5] || cells[5] || null,
        progress: this.parseProgress(cells[cellIndex + 6] || cells[6] || '0'),
        cycle: null,
        blocker: null,
      };

      if (feature.id && feature.name) {
        features.push(feature);
      }
    }

    return features;
  }

  /**
   * Parse blockers from content
   * Uses configurable priority sections and field mappings
   */
  parseBlockers(content: string): Blocker[] {
    const blockers: Blocker[] = [];
    const blockerRules = this.parsingRules.blocker;

    // Get priority sections from config
    const prioritySections = blockerRules.prioritySections;
    const priorityKeys: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    const priorityMap: Record<string, BlockerPriority> = {
      'high': '높음',
      'medium': '중간',
      'low': '낮음',
    };

    for (const priorityKey of priorityKeys) {
      const sectionKeywords = prioritySections[priorityKey];
      let sectionContent = '';

      // Try each keyword to find the section
      for (const keyword of sectionKeywords) {
        sectionContent = this.extractSection(content, keyword, 3) || '';
        if (sectionContent) break;
      }

      if (!sectionContent) continue;

      // Find blocker entries: ### B1 Title
      const blockerPattern = /###\s+(B\d+)\s+(.+?)(?:\n|$)/g;
      let match;

      while ((match = blockerPattern.exec(sectionContent)) !== null) {
        const blockerId = match[1];
        const blockerTitle = match[2].trim();

        // Try to extract more details from metadata in the section
        const blockerSection = this.extractBlockerSection(sectionContent, blockerId);

        // Use configurable field names from feature rules (owner)
        const ownerFields = this.parsingRules.feature.fields.owner || ['owner', '담당자'];
        let owner = '';
        for (const field of ownerFields) {
          owner = this.extractMetadataValue(blockerSection, field) || '';
          if (owner) break;
        }

        blockers.push({
          id: blockerId,
          title: blockerTitle,
          priority: priorityMap[priorityKey],
          status: this.parseBlockerStatus(blockerSection),
          owner,
          targetDate: this.extractMetadataValue(blockerSection, '목표일') ||
                      this.extractMetadataValue(blockerSection, 'target') ||
                      this.extractMetadataValue(blockerSection, 'Target Date') || '',
          impact: this.extractImpact(blockerSection),
          description: null,
        });
      }
    }

    return blockers;
  }

  /**
   * Extract impact using configurable patterns
   */
  private extractImpact(content: string): string {
    const impactPatterns = this.parsingRules.blocker.impactPatterns;
    for (const pattern of impactPatterns) {
      const regex = createSafeRegex(pattern);
      if (regex) {
        const match = content.match(regex);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    return '';
  }

  /**
   * Extract blocker section by ID
   */
  private extractBlockerSection(content: string, blockerId: string): string {
    const pattern = new RegExp(`###\\s+${blockerId}[\\s\\S]*?(?=###|$)`, 'i');
    const match = content.match(pattern);
    return match ? match[0] : '';
  }

  /**
   * Parse blocker status from content using configurable indicators
   */
  private parseBlockerStatus(content: string): BlockerStatus {
    const rules = this.parsingRules.blocker;

    if (matchesAny(content, rules.resolvedIndicators)) {
      return '✅ 해결';
    }
    if (matchesAny(content, rules.unresolvedIndicators)) {
      return '⚠️ 미해결';
    }
    if (matchesAny(content, rules.inProgressIndicators)) {
      return '🔄 진행중';
    }
    return '🔄 진행중';
  }

  /**
   * Parse priority string to Priority type using configurable indicators
   */
  private parsePriority(str: string): Priority {
    const rules = this.parsingRules.task;

    // Check against configurable indicators
    if (matchesAny(str, rules.priorityIndicators.p0)) {
      return 'P0';
    }
    if (matchesAny(str, rules.priorityIndicators.p1)) {
      return 'P1';
    }
    if (matchesAny(str, rules.priorityIndicators.p2)) {
      return 'P2';
    }

    // Fallback: check for common patterns not in config
    const upper = str.toUpperCase();
    if (upper.includes('P0') || upper.includes('HIGH') || upper.includes('CRITICAL')) {
      return 'P0';
    }
    if (upper.includes('P1') || upper.includes('MEDIUM') || upper.includes('NORMAL')) {
      return 'P1';
    }
    return 'P2';
  }

  /**
   * Parse feature status string using configurable status mapping
   */
  private parseFeatureStatus(str: string): FeatureStatus {
    const statusMapping = this.parsingRules.feature.statusMapping;

    // Check against configurable status mapping
    if (matchesAny(str, statusMapping.completed)) {
      return '완료';
    }
    if (matchesAny(str, statusMapping.inProgress)) {
      return '진행중';
    }
    if (matchesAny(str, statusMapping.pending)) {
      return '대기';
    }

    // Fallback: check common patterns
    const lower = str.toLowerCase();
    if (lower.includes('complete') || lower.includes('done')) {
      return '완료';
    }
    if (lower.includes('progress') || lower.includes('wip')) {
      return '진행중';
    }
    return '대기';
  }

  /**
   * Parse progress percentage from string
   */
  private parseProgress(str: string): number {
    const match = str.match(/(\d+)/);
    if (match) {
      return Math.min(100, Math.max(0, parseInt(match[1])));
    }
    return 0;
  }

  /**
   * Parse coordination table from markdown content
   * Looks for tables with headers containing: 구분, 협의, 우선순위, 담당, 기한, 상태
   */
  parseCoordination(content: string): CoordinationItem[] {
    const items: CoordinationItem[] = [];

    // Find tables that look like coordination tables
    const lines = content.split('\n');
    let inTable = false;
    let headers: string[] = [];
    let headerIndices: Record<string, number> = {};

    for (const line of lines) {
      if (!line.includes('|')) {
        inTable = false;
        continue;
      }

      const cells = line.split('|').map(c => c.trim()).filter(c => c);

      // Detect header row
      if (this.isCoordinationHeader(cells)) {
        inTable = true;
        headers = cells;
        const aliases = this.parsingRules.table.columnAliases;
        headerIndices = this.mapHeaderIndices(headers, [
          ['category', aliases.category || ['구분', 'Category', '분류']],
          ['content', aliases.content || ['협의 내용', '협의내용', '내용', 'Content']],
          ['priority', aliases.priority || ['우선순위', 'Priority', '중요도']],
          ['owner', aliases.owner || ['담당', 'Owner', '담당자']],
          ['deadline', aliases.deadline || ['기한', 'Deadline', '마감']],
          ['status', aliases.status || ['상태', 'Status']],
        ]);
        continue;
      }

      // Skip separator row
      if (inTable && line.includes('---')) {
        continue;
      }

      // Parse data row
      if (inTable && cells.length >= 4) {
        const item: CoordinationItem = {
          category: cells[headerIndices['category'] ?? 0] || '',
          content: cells[headerIndices['content'] ?? 1] || '',
          priority: cells[headerIndices['priority'] ?? 2] || '',
          owner: cells[headerIndices['owner'] ?? 3] || '',
          deadline: cells[headerIndices['deadline'] ?? 4] || '',
          status: cells[headerIndices['status'] ?? 5] || '',
        };

        if (item.content) {
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Parse milestones table from markdown content
   * Looks for tables with headers containing: 날짜, 마일스톤, 목표, 상태, 리스크
   */
  parseMilestones(content: string): MilestoneItem[] {
    const items: MilestoneItem[] = [];

    const lines = content.split('\n');
    let inTable = false;
    let headers: string[] = [];
    let headerIndices: Record<string, number> = {};

    for (const line of lines) {
      if (!line.includes('|')) {
        inTable = false;
        continue;
      }

      const cells = line.split('|').map(c => c.trim()).filter(c => c);

      // Detect header row
      if (this.isMilestoneHeader(cells)) {
        inTable = true;
        headers = cells;
        const aliases = this.parsingRules.table.columnAliases;
        headerIndices = this.mapHeaderIndices(headers, [
          ['date', aliases.date || ['날짜', 'Date', '일자']],
          ['name', aliases.name || ['마일스톤', 'Milestone', '이름', 'Name']],
          ['target', aliases.target || ['목표', 'Target', 'Goal']],
          ['status', aliases.status || ['상태', 'Status']],
          ['risk', aliases.risk || ['리스크', 'Risk', '위험']],
        ]);
        continue;
      }

      // Skip separator row
      if (inTable && line.includes('---')) {
        continue;
      }

      // Parse data row
      if (inTable && cells.length >= 3) {
        const item: MilestoneItem = {
          date: cells[headerIndices['date'] ?? 0] || '',
          name: cells[headerIndices['name'] ?? 1] || '',
          target: cells[headerIndices['target'] ?? 2] || '',
          status: cells[headerIndices['status'] ?? 3] || '',
          risk: cells[headerIndices['risk'] ?? 4] || '',
        };

        if (item.name) {
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Parse playbook progress table from markdown content
   * Looks for tables with headers containing: 항목, 목표, 현재, 비율, 상태
   */
  parsePlaybook(content: string): PlaybookItem[] {
    const items: PlaybookItem[] = [];

    const lines = content.split('\n');
    let inTable = false;
    let headers: string[] = [];
    let headerIndices: Record<string, number> = {};

    for (const line of lines) {
      if (!line.includes('|')) {
        inTable = false;
        continue;
      }

      const cells = line.split('|').map(c => c.trim()).filter(c => c);

      // Detect header row
      if (this.isPlaybookHeader(cells)) {
        inTable = true;
        headers = cells;
        const aliases = this.parsingRules.table.columnAliases;
        headerIndices = this.mapHeaderIndices(headers, [
          ['name', aliases.name || ['항목', 'Item', 'Name', '이름']],
          ['target', aliases.target || ['목표', 'Target', 'Goal']],
          ['current', aliases.current || ['현재', 'Current', '진행']],
          ['percentage', aliases.percentage || ['비율', 'Percentage', '%', '진행률']],
          ['status', aliases.status || ['상태', 'Status']],
        ]);
        continue;
      }

      // Skip separator row
      if (inTable && line.includes('---')) {
        continue;
      }

      // Parse data row
      if (inTable && cells.length >= 3) {
        const targetStr = cells[headerIndices['target'] ?? 1] || '0';
        const currentStr = cells[headerIndices['current'] ?? 2] || '0';
        const percentageStr = cells[headerIndices['percentage'] ?? 3] || '0';

        const item: PlaybookItem = {
          name: cells[headerIndices['name'] ?? 0] || '',
          target: this.parseNumber(targetStr),
          current: this.parseNumber(currentStr),
          percentage: this.parseNumber(percentageStr),
          status: cells[headerIndices['status'] ?? 4] || '',
        };

        // Calculate percentage if not provided
        if (item.percentage === 0 && item.target > 0) {
          item.percentage = Math.round((item.current / item.target) * 100);
        }

        if (item.name) {
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Check if cells represent a coordination table header
   * Uses configurable header keywords from parsing rules
   */
  private isCoordinationHeader(cells: string[]): boolean {
    const headerKeywords = this.parsingRules.table.coordinationHeaders;
    return cells.some(cell =>
      headerKeywords.some(kw => cell.toLowerCase().includes(kw.toLowerCase()))
    );
  }

  /**
   * Check if cells represent a milestone table header
   * Uses configurable header keywords from parsing rules
   */
  private isMilestoneHeader(cells: string[]): boolean {
    const headerKeywords = this.parsingRules.table.milestoneHeaders;
    return cells.some(cell =>
      headerKeywords.some(kw => cell.toLowerCase().includes(kw.toLowerCase()))
    );
  }

  /**
   * Check if cells represent a playbook table header
   * Uses configurable header keywords from parsing rules
   */
  private isPlaybookHeader(cells: string[]): boolean {
    const headerKeywords = this.parsingRules.table.playbookHeaders;
    return cells.some(cell =>
      headerKeywords.some(kw => cell.toLowerCase().includes(kw.toLowerCase()))
    );
  }

  /**
   * Map header names to column indices
   */
  private mapHeaderIndices(
    headers: string[],
    mappings: [string, string[]][]
  ): Record<string, number> {
    const indices: Record<string, number> = {};

    for (const [key, aliases] of mappings) {
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase();
        if (aliases.some(alias => header.includes(alias.toLowerCase()))) {
          indices[key] = i;
          break;
        }
      }
    }

    return indices;
  }

  /**
   * Parse a number from a string (handles "10개", "50%", etc.)
   */
  private parseNumber(str: string): number {
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
