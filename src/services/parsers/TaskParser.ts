/**
 * Task extraction and parsing from markdown
 */

import { Task, Priority } from '../../types/models';
import { ParsingConfig } from '../../types/config';
import { matchesAny } from '../../utils/configUtils';
import { RegexCache } from '../../utils/RegexCache';
import { Recurrence, RecurrenceFrequency } from '../../types/parsing';
import { TaskFilters, escapeRegex } from './types';

export class TaskParser {
  constructor(
    private parsingRules: ParsingConfig,
    private regexCache: RegexCache
  ) {}

  setParsingRules(rules: ParsingConfig): void {
    this.parsingRules = rules;
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
        const extensions = this.extractTaskExtensions(match[0]);
        if (extensions.jiraId) task.jiraId = extensions.jiraId;
        if (extensions.completedDate) task.completedDate = new Date(extensions.completedDate);
        if (extensions.quarterTag) task.quarterTag = extensions.quarterTag;
        if (extensions.areaTag) task.areaTag = extensions.areaTag;
        if (extensions.startDate) task.startDate = new Date(extensions.startDate);
        tasks.push(task);
      }
    }

    return tasks;
  }

  /**
   * Extract Dataview-style inline fields from text
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
   */
  extractEstimatedTime(text: string): string | undefined {
    const emojiPattern = this.regexCache.get('⏱️\\s*(\\d+[hmd])', 'i');
    if (emojiPattern) {
      const match = emojiPattern.exec(text);
      if (match) return match[1];
    }

    const inlinePattern = this.regexCache.get('estimate::\\s*(\\d+\\s*(?:hours?|mins?|minutes?|days?|[hmd]))', 'i');
    if (inlinePattern) {
      const match = inlinePattern.exec(text);
      if (match) return this.normalizeTimeEstimate(match[1]);
    }

    return undefined;
  }

  /**
   * Extract recurrence information from text
   */
  extractRecurrence(text: string): Recurrence | undefined {
    const frequencies: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

    const emojiPattern = this.regexCache.get('🔁\\s*(daily|weekly|monthly|yearly)', 'i');
    if (emojiPattern) {
      const match = emojiPattern.exec(text);
      if (match && frequencies.includes(match[1].toLowerCase() as RecurrenceFrequency)) {
        return { frequency: match[1].toLowerCase() as RecurrenceFrequency };
      }
    }

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
   * Extract context tag from text
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
   * Extract extended task fields from Q-Task-Master format
   */
  extractTaskExtensions(text: string): {
    jiraId?: string;
    completedDate?: string;
    quarterTag?: string;
    areaTag?: string;
    startDate?: string;
  } {
    const result: {
      jiraId?: string;
      completedDate?: string;
      quarterTag?: string;
      areaTag?: string;
      startDate?: string;
    } = {};

    const jiraMatch = text.match(/🔗\s*(SA-\d+)/);
    if (jiraMatch) result.jiraId = jiraMatch[1];

    const completedMatch = text.match(/✅\s*(\d{4}-\d{2}-\d{2})/);
    if (completedMatch) result.completedDate = completedMatch[1];

    const quarterMatch = text.match(/#q(\d+)\/p(\d+)/);
    if (quarterMatch) result.quarterTag = `q${quarterMatch[1]}/p${quarterMatch[2]}`;

    const areaMatch = text.match(/#([A-Z]\d+)\/([^\s🛠️📅🔗✅]+)/);
    if (areaMatch) result.areaTag = `${areaMatch[1]}/${areaMatch[2]}`;

    const startMatch = text.match(/🛠️\s*(\d{4}-\d{2}-\d{2})/);
    if (startMatch) result.startDate = startMatch[1];

    return result;
  }

  /**
   * Parse a single task line using configurable rules
   */
  private parseTaskLine(rawLine: string, checkbox: string, contentPart: string): Task {
    const rules = this.parsingRules.task;

    const isCompleted = checkbox.toLowerCase() === 'x' ||
      matchesAny(rawLine, rules.statusIndicators.completed);

    const tags = [...contentPart.matchAll(/#([\w/-]+)/g)].map(m => m[1]);

    let priority: Priority | null = null;
    if (matchesAny(contentPart, rules.priorityIndicators.p0) || tags.includes('P0')) {
      priority = 'P0';
    } else if (matchesAny(contentPart, rules.priorityIndicators.p1) || tags.includes('P1')) {
      priority = 'P1';
    } else if (matchesAny(contentPart, rules.priorityIndicators.p2) || tags.includes('P2')) {
      priority = 'P2';
    }

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

    let cleanContent = contentPart;
    [...rules.priorityIndicators.p0, ...rules.priorityIndicators.p1, ...rules.priorityIndicators.p2]
      .forEach(indicator => {
        if (!indicator.startsWith('/')) {
          cleanContent = cleanContent.replace(new RegExp(escapeRegex(indicator), 'g'), '');
        }
      });
    rules.dueDatePatterns.forEach(pattern => {
      const regex = this.regexCache.get(pattern, 'g');
      if (regex) cleanContent = cleanContent.replace(regex, '');
    });
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
   * Normalize time estimate to short format
   */
  private normalizeTimeEstimate(time: string): string {
    const lower = time.toLowerCase().trim();
    if (/^\d+[hmd]$/.test(lower)) return lower;

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
}
