/**
 * MarkdownParser - Facade for all markdown parsing operations
 *
 * Delegates to specialized sub-parsers:
 * - MetadataParser: frontmatter, sections, metadata extraction
 * - TaskParser: task extraction, inline fields, extensions
 * - FeatureBlockerParser: features and blockers
 * - TableParser: coordination, milestones, playbook tables
 * - WeeklyBreakdownParser: Q-Task-Master weekly breakdowns
 * - ExtendedDataParser: customer requests, Mermaid Gantt
 */

import { Task, Feature, Blocker } from '../../types/models';
import { CoordinationItem, MilestoneItem, PlaybookItem, WeeklyBreakdown, CustomerRequest, GanttItem } from '../../types/data';
import { ParsingConfig } from '../../types/config';
import { getGlobalRegexCache } from '../../utils/RegexCache';
import { Recurrence } from '../../types/parsing';
import { TaskFilters, DEFAULT_PARSING_RULES } from './types';
import { MetadataParser } from './MetadataParser';
import { TaskParser } from './TaskParser';
import { FeatureBlockerParser } from './FeatureBlockerParser';
import { TableParser } from './TableParser';
import { WeeklyBreakdownParser } from './WeeklyBreakdownParser';
import { ExtendedDataParser } from './ExtendedDataParser';

export class MarkdownParser {
  private metadataParser: MetadataParser;
  private taskParser: TaskParser;
  private featureBlockerParser: FeatureBlockerParser;
  private tableParser: TableParser;
  private weeklyBreakdownParser: WeeklyBreakdownParser;
  private extendedDataParser: ExtendedDataParser;
  private parsingRules: ParsingConfig;

  constructor(parsingConfig?: ParsingConfig) {
    this.parsingRules = parsingConfig || DEFAULT_PARSING_RULES;
    const regexCache = getGlobalRegexCache();

    this.metadataParser = new MetadataParser();
    this.taskParser = new TaskParser(this.parsingRules, regexCache);
    this.featureBlockerParser = new FeatureBlockerParser(this.parsingRules, this.metadataParser);
    this.tableParser = new TableParser(this.parsingRules, this.metadataParser);
    this.weeklyBreakdownParser = new WeeklyBreakdownParser(this.taskParser);
    this.extendedDataParser = new ExtendedDataParser();
  }

  setParsingRules(rules: ParsingConfig): void {
    this.parsingRules = rules;
    this.taskParser.setParsingRules(rules);
    this.featureBlockerParser.setParsingRules(rules);
    this.tableParser.setParsingRules(rules);
  }

  getParsingRules(): ParsingConfig {
    return this.parsingRules;
  }

  // ========== Metadata ==========

  parseFile(content: string): { metadata: Record<string, unknown>; content: string } {
    return this.metadataParser.parseFile(content);
  }

  extractSection(content: string, heading: string, level: number = 2): string | null {
    return this.metadataParser.extractSection(content, heading, level);
  }

  extractCurrentWeek(content: string): number | null {
    return this.metadataParser.extractCurrentWeek(content);
  }

  extractCurrentCycle(content: string): string | null {
    return this.metadataParser.extractCurrentCycle(content);
  }

  extractMetadataValue(content: string, key: string): string | null {
    return this.metadataParser.extractMetadataValue(content, key);
  }

  // ========== Tasks ==========

  extractTasks(content: string, filters?: TaskFilters): Task[] {
    return this.taskParser.extractTasks(content, filters);
  }

  extractInlineFields(text: string): Record<string, string> {
    return this.taskParser.extractInlineFields(text);
  }

  extractEstimatedTime(text: string): string | undefined {
    return this.taskParser.extractEstimatedTime(text);
  }

  extractRecurrence(text: string): Recurrence | undefined {
    return this.taskParser.extractRecurrence(text);
  }

  extractContext(text: string): string | undefined {
    return this.taskParser.extractContext(text);
  }

  extractTaskExtensions(text: string): {
    jiraId?: string;
    completedDate?: string;
    quarterTag?: string;
    areaTag?: string;
    startDate?: string;
  } {
    return this.taskParser.extractTaskExtensions(text);
  }

  // ========== Features & Blockers ==========

  parseFeatures(content: string): Feature[] {
    return this.featureBlockerParser.parseFeatures(content);
  }

  parseBlockers(content: string): Blocker[] {
    return this.featureBlockerParser.parseBlockers(content);
  }

  // ========== Tables ==========

  parseTable(content: string, sectionHeading?: string): Record<string, string>[] {
    return this.tableParser.parseTable(content, sectionHeading);
  }

  parseCoordination(content: string): CoordinationItem[] {
    return this.tableParser.parseCoordination(content);
  }

  parseMilestones(content: string): MilestoneItem[] {
    return this.tableParser.parseMilestones(content);
  }

  parsePlaybook(content: string): PlaybookItem[] {
    return this.tableParser.parsePlaybook(content);
  }

  // ========== Weekly Breakdowns ==========

  parseWeeklyBreakdowns(content: string): WeeklyBreakdown[] {
    return this.weeklyBreakdownParser.parseWeeklyBreakdowns(content);
  }

  // ========== Extended Data ==========

  parseCustomerRequests(content: string): CustomerRequest[] {
    return this.extendedDataParser.parseCustomerRequests(content);
  }

  parseMermaidGantt(content: string): GanttItem[] {
    return this.extendedDataParser.parseMermaidGantt(content);
  }
}
