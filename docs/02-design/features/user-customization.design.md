# Design Document: User Customization & Universality

**Feature ID**: user-customization
**Plan Reference**: [user-customization.plan.md](../../01-plan/features/user-customization.plan.md)
**Created**: 2026-02-04
**Status**: Draft

---

## 1. Overview

This document defines the technical design for making the Obsidian Excel Automation plugin configurable and universal. The design follows the architecture proposed in the plan document.

---

## 2. Type Definitions

### 2.1 Core Configuration Types

**File**: `src/types/config.ts`

```typescript
// ============================================
// CONFIGURATION VERSION
// ============================================
export const CONFIG_VERSION = '2.0';

// ============================================
// LOCALE TYPES
// ============================================
export type LocaleCode = 'en' | 'ko' | 'ja' | 'zh' | 'custom';

export interface LocaleStrings {
  // Report Names
  reports: {
    weekly: string;
    quarterly: string;
    feature: string;
    blocker: string;
  };

  // Sheet Names (Weekly Report)
  sheets: {
    weeklySummary: string;
    roadmapProgress: string;
    taskDetails: string;
    blockerTracking: string;
    coordination: string;
    milestones: string;
    playbookProgress: string;
    // Quarterly Report
    quarterlyOverview: string;
    p0Tasks: string;
    p1Tasks: string;
    progressAnalytics: string;
    // Feature Report
    allFeatures: string;
    byPriority: string;
    byCycle: string;
    // Blocker Report
    activeBlockers: string;
    blockerHistory: string;
  };

  // Column Headers
  columns: {
    id: string;
    name: string;
    owner: string;
    status: string;
    deadline: string;
    priority: string;
    description: string;
    category: string;
    content: string;
    target: string;
    current: string;
    percentage: string;
    risk: string;
    date: string;
    cycle: string;
    impact: string;
    resolution: string;
  };

  // KPI Labels
  kpi: {
    totalTasks: string;
    completed: string;
    p0CompletionRate: string;
    blockers: string;
    activeBlockers: string;
    resolvedBlockers: string;
    totalFeatures: string;
    inProgress: string;
    pending: string;
  };

  // Status Values (for display)
  status: {
    completed: string;
    inProgress: string;
    pending: string;
    resolved: string;
    unresolved: string;
  };

  // Priority Values (for display)
  priority: {
    p0: string;
    p1: string;
    p2: string;
    high: string;
    medium: string;
    low: string;
  };

  // UI Labels
  ui: {
    generateReport: string;
    settings: string;
    language: string;
    parsingRules: string;
    reportSchema: string;
    presets: string;
    importExport: string;
    reset: string;
    save: string;
    cancel: string;
  };

  // Messages
  messages: {
    reportGenerated: string;
    reportFailed: string;
    settingsSaved: string;
    presetApplied: string;
    validationError: string;
  };
}

// ============================================
// PARSING CONFIGURATION
// ============================================
export interface ParsingConfig {
  task: TaskParsingRules;
  feature: FeatureParsingRules;
  blocker: BlockerParsingRules;
  table: TableParsingRules;
}

export interface TaskParsingRules {
  // Checkbox pattern (serialized as string for JSON storage)
  checkboxPattern: string;  // "- \\[([ x])\\]"

  // Priority indicators (multiple allowed per level)
  priorityIndicators: {
    p0: string[];  // ["⏫", "#P0", "[P0]", "🔴"]
    p1: string[];  // ["🔼", "#P1", "[P1]", "🟡"]
    p2: string[];  // ["🔽", "#P2", "[P2]", "🟢"]
  };

  // Status indicators
  statusIndicators: {
    completed: string[];  // ["[x]", "✅", "DONE", "완료"]
    pending: string[];    // ["[ ]", "⬜", "TODO", "대기"]
    inProgress: string[]; // ["[/]", "🔄", "WIP", "진행중"]
  };

  // Due date patterns
  dueDatePatterns: string[];  // ["📅 (\\d{4}-\\d{2}-\\d{2})", "@due\\((.*?)\\)"]

  // Owner/assignee patterns
  ownerPatterns: string[];    // ["👤 (\\w+)", "@(\\w+)"]
}

export interface FeatureParsingRules {
  // Feature ID pattern
  idPattern: string;  // "[AB]\\d+" or "FEAT-\\d+"

  // Field names in frontmatter or tables
  fields: {
    status: string[];    // ["status", "상태", "Status"]
    priority: string[];  // ["priority", "우선순위", "Priority"]
    cycle: string[];     // ["cycle", "사이클", "Cycle"]
    owner: string[];     // ["owner", "담당자", "Owner"]
  };

  // Status value mappings
  statusMapping: {
    completed: string[];  // ["완료", "Complete", "Done", "Completed"]
    inProgress: string[]; // ["진행중", "In Progress", "WIP", "진행"]
    pending: string[];    // ["대기", "Pending", "TODO", "계획"]
  };
}

export interface BlockerParsingRules {
  // Status indicators
  resolvedIndicators: string[];    // ["✅", "해결", "Resolved", "Fixed"]
  unresolvedIndicators: string[];  // ["⚠️", "미해결", "Open", "Unresolved"]
  inProgressIndicators: string[];  // ["🔄", "진행중", "In Progress"]

  // Priority section headers
  prioritySections: {
    high: string[];    // ["높음 우선순위", "High Priority", "P0"]
    medium: string[];  // ["중간 우선순위", "Medium Priority", "P1"]
    low: string[];     // ["낮음 우선순위", "Low Priority", "P2"]
  };

  // Impact field patterns
  impactPatterns: string[];  // ["영향:", "Impact:", "Affects:"]
}

export interface TableParsingRules {
  // Header detection for different table types
  coordinationHeaders: string[];  // ["구분", "협의", "Category", "Content"]
  milestoneHeaders: string[];     // ["마일스톤", "Milestone", "날짜", "Date"]
  playbookHeaders: string[];      // ["항목", "Item", "목표", "Target"]

  // Column name aliases (for flexible parsing)
  columnAliases: {
    category: string[];
    content: string[];
    priority: string[];
    owner: string[];
    deadline: string[];
    status: string[];
    date: string[];
    name: string[];
    target: string[];
    current: string[];
    percentage: string[];
    risk: string[];
  };
}

// ============================================
// REPORT SCHEMA CONFIGURATION
// ============================================
export interface ReportSchemaConfig {
  weekly: ReportDefinition;
  quarterly: ReportDefinition;
  feature: ReportDefinition;
  blocker: ReportDefinition;
  custom: CustomReportDefinition[];
}

export interface ReportDefinition {
  enabled: boolean;
  filename: string;  // With placeholders: "{week}", "{quarter}", "{date}"
  sheets: SheetDefinition[];
  metadata: ReportMetadata;
}

export interface ReportMetadata {
  author: string;
  title: string;
  subject: string;
}

export interface SheetDefinition {
  id: string;          // Unique identifier
  name: string;        // Display name (from locale)
  enabled: boolean;
  type: SheetType;
  columns: ColumnDefinition[];
  dataSource: DataSourceConfig;
  styling: SheetStyling;
}

export type SheetType = 'data' | 'summary' | 'kpi' | 'chart';

export interface ColumnDefinition {
  id: string;
  header: string;      // From locale strings
  field: string;       // Data field to map
  width: number;       // Column width (1-100)
  format: ColumnFormat;
  alignment: 'left' | 'center' | 'right';
  conditionalFormatting?: ConditionalFormat[];
}

export type ColumnFormat = 'text' | 'number' | 'date' | 'percentage' | 'currency';

export interface ConditionalFormat {
  condition: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
  value: string | number;
  style: {
    backgroundColor?: string;
    textColor?: string;
    bold?: boolean;
  };
}

export interface DataSourceConfig {
  type: 'tasks' | 'features' | 'blockers' | 'kpi' | 'coordination' | 'milestones' | 'playbook' | 'custom';
  filters?: FilterRule[];
  sorting?: SortRule;
  limit?: number;
}

export interface FilterRule {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'in' | 'notIn';
  value: string | string[] | number;
}

export interface SortRule {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SheetStyling {
  tabColor: string;
  freezeRows: number;
  freezeColumns: number;
  alternateRowColors: boolean;
  showGridlines: boolean;
}

export interface CustomReportDefinition extends ReportDefinition {
  id: string;
  name: string;
  description: string;
}

// ============================================
// STYLE CONFIGURATION
// ============================================
export interface StyleConfig {
  colors: ColorConfig;
  typography: TypographyConfig;
  layout: LayoutConfig;
}

export interface ColorConfig {
  headerBackground: string;
  subheaderBackground: string;
  alternateRowBackground: string;
  borderColor: string;
  priority: {
    p0: string;
    p1: string;
    p2: string;
  };
  status: {
    completed: string;
    inProgress: string;
    pending: string;
  };
}

export interface TypographyConfig {
  headerFont: FontConfig;
  subheaderFont: FontConfig;
  bodyFont: FontConfig;
  titleFont: FontConfig;
}

export interface FontConfig {
  size: number;
  bold: boolean;
  italic: boolean;
  color: string;
}

export interface LayoutConfig {
  defaultRowHeight: number;
  defaultColumnWidth: number;
  borderStyle: 'thin' | 'medium' | 'thick' | 'none';
  tabColor: string;
}

// ============================================
// MAIN PLUGIN CONFIG
// ============================================
export interface PluginConfig {
  version: string;
  locale: LocaleCode;
  localeStrings: LocaleStrings;
  parsing: ParsingConfig;
  reports: ReportSchemaConfig;
  style: StyleConfig;
  sources: SourceMappings;      // Existing
  advanced: AdvancedSettings;   // Existing
}

export interface SourceMappings {
  basePath: string;
  outputDir: string;
  dashboard: string;
  quarterly: {
    q1: string;
    q2: string;
    q3: string;
    q4: string;
  };
  blockers: string;
  roadmap: string;
  betting: string;
  features: string;
  playbook: string;
}

export interface AdvancedSettings {
  weekStartDay: 0 | 1;  // 0=Sunday, 1=Monday
  dateFormat: string;
  debugLogging: boolean;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  cacheEnabled: boolean;
  cacheTTL: number;
}
```

---

## 3. Component Design

### 3.1 ConfigManager Service

**File**: `src/services/ConfigManager.ts`

```typescript
import { Plugin } from 'obsidian';
import { PluginConfig, CONFIG_VERSION, LocaleCode } from '../types/config';
import { deepMerge, validateConfig } from '../utils/configUtils';
import { getPreset, PresetName } from '../config/presets';

export class ConfigManager {
  private config: PluginConfig;
  private plugin: Plugin;
  private listeners: Set<(config: PluginConfig) => void> = new Set();

  constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  // ========== INITIALIZATION ==========

  async initialize(): Promise<void> {
    const savedData = await this.plugin.loadData();

    if (!savedData || !savedData.version) {
      // First time or v1 user - migrate
      this.config = await this.migrateFromV1(savedData);
    } else if (savedData.version !== CONFIG_VERSION) {
      // Version upgrade needed
      this.config = await this.upgradeConfig(savedData);
    } else {
      // Valid v2 config
      this.config = savedData;
    }

    await this.save();
  }

  private async migrateFromV1(oldSettings: any): Promise<PluginConfig> {
    // Start with korean-default preset (matches v1 behavior)
    const baseConfig = getPreset('korean-default');

    if (oldSettings) {
      // Migrate existing source mappings
      if (oldSettings.sourceMappings) {
        baseConfig.sources = {
          ...baseConfig.sources,
          ...oldSettings.sourceMappings,
        };
      }

      // Migrate existing style settings
      if (oldSettings.styling) {
        baseConfig.style.colors = {
          ...baseConfig.style.colors,
          headerBackground: oldSettings.styling.headerColor || baseConfig.style.colors.headerBackground,
          subheaderBackground: oldSettings.styling.subheaderColor || baseConfig.style.colors.subheaderBackground,
        };
      }

      // Migrate report configurations
      if (oldSettings.reports) {
        Object.keys(oldSettings.reports).forEach(key => {
          if (baseConfig.reports[key]) {
            baseConfig.reports[key].enabled = oldSettings.reports[key].enabled;
            baseConfig.reports[key].filename = oldSettings.reports[key].filename || baseConfig.reports[key].filename;
          }
        });
      }
    }

    baseConfig.version = CONFIG_VERSION;
    return baseConfig;
  }

  private async upgradeConfig(oldConfig: PluginConfig): Promise<PluginConfig> {
    // Handle version-specific upgrades
    const currentPreset = getPreset(oldConfig.locale || 'korean-default');
    return deepMerge(currentPreset, oldConfig, { version: CONFIG_VERSION });
  }

  // ========== GETTERS ==========

  get(): PluginConfig {
    return this.config;
  }

  getLocale(): LocaleCode {
    return this.config.locale;
  }

  getLocaleStrings(): LocaleStrings {
    return this.config.localeStrings;
  }

  getParsing(): ParsingConfig {
    return this.config.parsing;
  }

  getReports(): ReportSchemaConfig {
    return this.config.reports;
  }

  getStyle(): StyleConfig {
    return this.config.style;
  }

  getSources(): SourceMappings {
    return this.config.sources;
  }

  // ========== SETTERS ==========

  async setLocale(locale: LocaleCode): Promise<void> {
    if (locale === 'custom') {
      this.config.locale = locale;
    } else {
      const preset = getPreset(locale);
      this.config.locale = locale;
      this.config.localeStrings = preset.localeStrings;
    }
    await this.save();
  }

  async updateParsing(parsing: Partial<ParsingConfig>): Promise<void> {
    this.config.parsing = deepMerge(this.config.parsing, parsing);
    await this.save();
  }

  async updateReports(reports: Partial<ReportSchemaConfig>): Promise<void> {
    this.config.reports = deepMerge(this.config.reports, reports);
    await this.save();
  }

  async updateStyle(style: Partial<StyleConfig>): Promise<void> {
    this.config.style = deepMerge(this.config.style, style);
    await this.save();
  }

  async updateSources(sources: Partial<SourceMappings>): Promise<void> {
    this.config.sources = deepMerge(this.config.sources, sources);
    await this.save();
  }

  // ========== PRESETS ==========

  async applyPreset(presetName: PresetName): Promise<void> {
    const preset = getPreset(presetName);

    // Preserve user's source mappings and some advanced settings
    const preserved = {
      sources: this.config.sources,
      advanced: {
        ...this.config.advanced,
        debugLogging: this.config.advanced.debugLogging,
      },
    };

    this.config = deepMerge(preset, preserved);
    this.config.version = CONFIG_VERSION;
    await this.save();
  }

  // ========== PERSISTENCE ==========

  private async save(): Promise<void> {
    const validation = validateConfig(this.config);
    if (!validation.valid) {
      console.error('Config validation failed:', validation.errors);
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    await this.plugin.saveData(this.config);
    this.notifyListeners();
  }

  // ========== OBSERVERS ==========

  subscribe(listener: (config: PluginConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }

  // ========== EXPORT/IMPORT ==========

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  async importConfig(jsonString: string): Promise<void> {
    const imported = JSON.parse(jsonString);
    const validation = validateConfig(imported);

    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }

    this.config = imported;
    await this.save();
  }
}
```

### 3.2 Preset Definitions

**File**: `src/config/presets/index.ts`

```typescript
import { PluginConfig } from '../../types/config';
import koreanDefault from './korean-default.json';
import englishDefault from './english-default.json';
import japaneseDefault from './japanese-default.json';
import minimal from './minimal.json';

export type PresetName = 'korean-default' | 'english-default' | 'japanese-default' | 'minimal';

const presets: Record<PresetName, PluginConfig> = {
  'korean-default': koreanDefault as PluginConfig,
  'english-default': englishDefault as PluginConfig,
  'japanese-default': japaneseDefault as PluginConfig,
  'minimal': minimal as PluginConfig,
};

export function getPreset(name: PresetName | string): PluginConfig {
  if (name in presets) {
    return JSON.parse(JSON.stringify(presets[name as PresetName]));
  }
  return JSON.parse(JSON.stringify(presets['korean-default']));
}

export function getPresetNames(): PresetName[] {
  return Object.keys(presets) as PresetName[];
}
```

**File**: `src/config/presets/english-default.json` (excerpt)

```json
{
  "version": "2.0",
  "locale": "en",
  "localeStrings": {
    "reports": {
      "weekly": "Weekly Report",
      "quarterly": "Quarterly Report",
      "feature": "Feature Report",
      "blocker": "Blocker Report"
    },
    "sheets": {
      "weeklySummary": "Weekly Summary",
      "roadmapProgress": "Roadmap Progress",
      "taskDetails": "Task Details",
      "blockerTracking": "Blocker Tracking",
      "coordination": "Coordination",
      "milestones": "Milestones",
      "playbookProgress": "Playbook Progress",
      "quarterlyOverview": "Quarterly Overview",
      "p0Tasks": "P0 Critical Tasks",
      "p1Tasks": "P1 High Priority",
      "progressAnalytics": "Progress Analytics",
      "allFeatures": "All Features",
      "byPriority": "By Priority",
      "byCycle": "By Cycle",
      "activeBlockers": "Active Blockers",
      "blockerHistory": "Blocker History"
    },
    "columns": {
      "id": "ID",
      "name": "Name",
      "owner": "Owner",
      "status": "Status",
      "deadline": "Deadline",
      "priority": "Priority",
      "description": "Description",
      "category": "Category",
      "content": "Content",
      "target": "Target",
      "current": "Current",
      "percentage": "Progress %",
      "risk": "Risk",
      "date": "Date",
      "cycle": "Cycle",
      "impact": "Impact",
      "resolution": "Resolution"
    },
    "kpi": {
      "totalTasks": "Total Tasks",
      "completed": "Completed",
      "p0CompletionRate": "P0 Completion Rate",
      "blockers": "Blockers",
      "activeBlockers": "Active Blockers",
      "resolvedBlockers": "Resolved Blockers",
      "totalFeatures": "Total Features",
      "inProgress": "In Progress",
      "pending": "Pending"
    },
    "status": {
      "completed": "Completed",
      "inProgress": "In Progress",
      "pending": "Pending",
      "resolved": "Resolved",
      "unresolved": "Unresolved"
    },
    "priority": {
      "p0": "P0",
      "p1": "P1",
      "p2": "P2",
      "high": "High",
      "medium": "Medium",
      "low": "Low"
    }
  },
  "parsing": {
    "task": {
      "checkboxPattern": "- \\[([ x])\\]",
      "priorityIndicators": {
        "p0": ["⏫", "#P0", "[P0]", "🔴", "critical", "urgent"],
        "p1": ["🔼", "#P1", "[P1]", "🟡", "high"],
        "p2": ["🔽", "#P2", "[P2]", "🟢", "low", "minor"]
      },
      "statusIndicators": {
        "completed": ["[x]", "✅", "DONE", "done", "complete", "completed"],
        "pending": ["[ ]", "⬜", "TODO", "todo", "pending"],
        "inProgress": ["[/]", "🔄", "WIP", "wip", "in progress", "working"]
      }
    },
    "feature": {
      "idPattern": "[A-Z]+-?\\d+",
      "statusMapping": {
        "completed": ["Complete", "Completed", "Done", "Shipped"],
        "inProgress": ["In Progress", "WIP", "Active", "Development"],
        "pending": ["Pending", "TODO", "Planned", "Backlog"]
      }
    },
    "blocker": {
      "resolvedIndicators": ["✅", "Resolved", "Fixed", "Closed"],
      "unresolvedIndicators": ["⚠️", "Open", "Unresolved", "Active"],
      "prioritySections": {
        "high": ["High Priority", "Critical", "P0", "Urgent"],
        "medium": ["Medium Priority", "P1", "Normal"],
        "low": ["Low Priority", "P2", "Minor"]
      }
    }
  }
}
```

### 3.3 Updated MarkdownParser

**File**: `src/services/MarkdownParser.ts` (key changes)

```typescript
import { ConfigManager } from './ConfigManager';
import { ParsingConfig, TaskParsingRules } from '../types/config';

export class MarkdownParser {
  private config: ConfigManager;
  private parsingRules: ParsingConfig;

  constructor(config: ConfigManager) {
    this.config = config;
    this.parsingRules = config.getParsing();

    // Subscribe to config changes
    config.subscribe((newConfig) => {
      this.parsingRules = newConfig.parsing;
    });
  }

  // ========== TASK PARSING ==========

  extractTasks(content: string): Task[] {
    const rules = this.parsingRules.task;
    const checkboxRegex = new RegExp(rules.checkboxPattern, 'gm');
    const tasks: Task[] = [];

    let match;
    while ((match = checkboxRegex.exec(content)) !== null) {
      const line = this.getFullLine(content, match.index);
      const task = this.parseTaskLine(line, rules);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  private parseTaskLine(line: string, rules: TaskParsingRules): Task | null {
    const isCompleted = this.matchesAny(line, rules.statusIndicators.completed);
    const isInProgress = this.matchesAny(line, rules.statusIndicators.inProgress);

    const priority = this.detectPriority(line, rules.priorityIndicators);
    const dueDate = this.extractDueDate(line, rules.dueDatePatterns);
    const owner = this.extractOwner(line, rules.ownerPatterns);

    // Extract task name (remove indicators)
    const name = this.cleanTaskName(line, rules);

    return {
      name,
      status: isCompleted ? 'completed' : isInProgress ? 'inProgress' : 'pending',
      priority,
      dueDate,
      owner,
    };
  }

  private detectPriority(line: string, indicators: TaskParsingRules['priorityIndicators']): Priority {
    if (this.matchesAny(line, indicators.p0)) return 'P0';
    if (this.matchesAny(line, indicators.p1)) return 'P1';
    if (this.matchesAny(line, indicators.p2)) return 'P2';
    return 'P2'; // Default
  }

  private matchesAny(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Check if it's a regex pattern (starts/ends with /)
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const regex = new RegExp(pattern.slice(1, -1), 'i');
        return regex.test(text);
      }
      // Simple string match (case-insensitive)
      return text.toLowerCase().includes(pattern.toLowerCase());
    });
  }

  private extractDueDate(line: string, patterns: string[]): string | null {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern);
      const match = regex.exec(line);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  // ========== FEATURE PARSING ==========

  extractFeatures(content: string): Feature[] {
    const rules = this.parsingRules.feature;
    const idRegex = new RegExp(rules.idPattern, 'g');
    // ... implementation using configurable rules
  }

  private mapFeatureStatus(statusValue: string): FeatureStatus {
    const mapping = this.parsingRules.feature.statusMapping;

    if (this.matchesAny(statusValue, mapping.completed)) return 'completed';
    if (this.matchesAny(statusValue, mapping.inProgress)) return 'inProgress';
    if (this.matchesAny(statusValue, mapping.pending)) return 'pending';

    return 'pending'; // Default
  }

  // ========== BLOCKER PARSING ==========

  extractBlockers(content: string): Blocker[] {
    const rules = this.parsingRules.blocker;
    // ... implementation using configurable rules
  }

  private detectBlockerStatus(line: string): BlockerStatus {
    const rules = this.parsingRules.blocker;

    if (this.matchesAny(line, rules.resolvedIndicators)) return 'resolved';
    if (this.matchesAny(line, rules.unresolvedIndicators)) return 'unresolved';
    if (this.matchesAny(line, rules.inProgressIndicators)) return 'inProgress';

    return 'unresolved'; // Default
  }

  // ========== TABLE PARSING ==========

  parseTable(content: string, tableType: 'coordination' | 'milestone' | 'playbook'): TableRow[] {
    const rules = this.parsingRules.table;
    const headers = rules[`${tableType}Headers`];
    // ... implementation using configurable column aliases
  }
}
```

### 3.4 Updated Report Generators

**File**: `src/reports/BaseReport.ts` (new abstract base class)

```typescript
import { Workbook, Worksheet } from 'exceljs';
import { ConfigManager } from '../services/ConfigManager';
import { StyleManager } from '../generators/StyleManager';
import { SheetDefinition, LocaleStrings, StyleConfig } from '../types/config';

export abstract class BaseReport {
  protected config: ConfigManager;
  protected styleManager: StyleManager;
  protected workbook: Workbook;
  protected locale: LocaleStrings;
  protected style: StyleConfig;

  constructor(config: ConfigManager) {
    this.config = config;
    this.locale = config.getLocaleStrings();
    this.style = config.getStyle();
    this.styleManager = new StyleManager(config);
    this.workbook = new Workbook();

    this.initializeWorkbook();
  }

  private initializeWorkbook(): void {
    const metadata = this.getReportMetadata();
    this.workbook.creator = metadata.author;
    this.workbook.title = metadata.title;
    this.workbook.subject = metadata.subject;
    this.workbook.created = new Date();
  }

  protected abstract getReportMetadata(): { author: string; title: string; subject: string };

  protected createSheet(definition: SheetDefinition): Worksheet {
    if (!definition.enabled) return null;

    const sheet = this.workbook.addWorksheet(definition.name);

    // Apply tab color
    sheet.properties.tabColor = { argb: definition.styling.tabColor.replace('#', '') };

    // Set freeze panes
    if (definition.styling.freezeRows > 0 || definition.styling.freezeColumns > 0) {
      sheet.views = [{
        state: 'frozen',
        xSplit: definition.styling.freezeColumns,
        ySplit: definition.styling.freezeRows,
      }];
    }

    // Create header row
    const headerRow = sheet.addRow(definition.columns.map(col => col.header));
    this.styleManager.applyHeaderStyle(headerRow);

    // Set column widths
    definition.columns.forEach((col, index) => {
      sheet.getColumn(index + 1).width = col.width;
    });

    return sheet;
  }

  protected addDataRows(sheet: Worksheet, data: any[], columns: ColumnDefinition[]): void {
    data.forEach((item, rowIndex) => {
      const rowData = columns.map(col => this.formatCellValue(item[col.field], col.format));
      const row = sheet.addRow(rowData);

      // Apply conditional formatting
      columns.forEach((col, colIndex) => {
        if (col.conditionalFormatting) {
          this.applyConditionalFormat(row.getCell(colIndex + 1), item[col.field], col.conditionalFormatting);
        }
      });

      // Alternate row colors
      if (rowIndex % 2 === 1) {
        this.styleManager.applyAlternateRowStyle(row);
      }
    });
  }

  protected formatCellValue(value: any, format: ColumnFormat): any {
    switch (format) {
      case 'date':
        return value ? new Date(value) : '';
      case 'percentage':
        return typeof value === 'number' ? value / 100 : value;
      case 'number':
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      default:
        return value ?? '';
    }
  }

  abstract generate(data: any): Promise<Workbook>;
}
```

**File**: `src/reports/WeeklyReport.ts` (refactored)

```typescript
import { BaseReport } from './BaseReport';
import { ConfigManager } from '../services/ConfigManager';
import { DashboardData } from '../types/data';

export class WeeklyReportGenerator extends BaseReport {
  private reportConfig: ReportDefinition;

  constructor(config: ConfigManager) {
    super(config);
    this.reportConfig = config.getReports().weekly;
  }

  protected getReportMetadata() {
    return this.reportConfig.metadata;
  }

  async generate(data: DashboardData): Promise<Workbook> {
    for (const sheetDef of this.reportConfig.sheets) {
      if (!sheetDef.enabled) continue;

      switch (sheetDef.type) {
        case 'summary':
          await this.generateSummarySheet(sheetDef, data);
          break;
        case 'kpi':
          await this.generateKPISheet(sheetDef, data);
          break;
        case 'data':
          await this.generateDataSheet(sheetDef, data);
          break;
        case 'chart':
          await this.generateChartSheet(sheetDef, data);
          break;
      }
    }

    return this.workbook;
  }

  private async generateSummarySheet(def: SheetDefinition, data: DashboardData): Promise<void> {
    const sheet = this.createSheet(def);
    if (!sheet) return;

    // Get data based on dataSource config
    const sourceData = this.getDataForSource(def.dataSource, data);

    // Apply filters if defined
    const filteredData = this.applyFilters(sourceData, def.dataSource.filters);

    // Apply sorting if defined
    const sortedData = this.applySorting(filteredData, def.dataSource.sorting);

    // Add data rows
    this.addDataRows(sheet, sortedData, def.columns);
  }

  private getDataForSource(source: DataSourceConfig, data: DashboardData): any[] {
    switch (source.type) {
      case 'tasks':
        return data.tasks || [];
      case 'features':
        return data.features || [];
      case 'blockers':
        return data.blockers || [];
      case 'coordination':
        return data.coordination || [];
      case 'milestones':
        return data.milestones || [];
      case 'playbook':
        return data.playbook || [];
      default:
        return [];
    }
  }

  // ... additional methods
}
```

### 3.5 Settings UI Components

**File**: `src/SettingsTab.ts` (expanded)

```typescript
import { App, PluginSettingTab, Setting, DropdownComponent } from 'obsidian';
import { ConfigManager } from './services/ConfigManager';
import { PresetName, getPresetNames } from './config/presets';
import { ParsingRulesModal } from './ui/ParsingRulesModal';
import { ReportSchemaModal } from './ui/ReportSchemaModal';

export class SettingsTab extends PluginSettingTab {
  private config: ConfigManager;

  constructor(app: App, plugin: Plugin, config: ConfigManager) {
    super(app, plugin);
    this.config = config;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ========== LANGUAGE SECTION ==========
    containerEl.createEl('h2', { text: this.config.getLocaleStrings().ui.language });

    new Setting(containerEl)
      .setName('Language Preset')
      .setDesc('Select a language preset or customize')
      .addDropdown(dropdown => {
        getPresetNames().forEach(name => {
          dropdown.addOption(name, this.formatPresetName(name));
        });
        dropdown.addOption('custom', 'Custom');
        dropdown.setValue(this.config.getLocale());
        dropdown.onChange(async (value) => {
          if (value !== 'custom') {
            await this.config.applyPreset(value as PresetName);
          } else {
            await this.config.setLocale('custom');
          }
          this.display(); // Refresh
        });
      });

    // ========== SOURCE FILES SECTION ==========
    containerEl.createEl('h2', { text: 'Source Files' });
    this.renderSourceSettings(containerEl);

    // ========== PARSING RULES SECTION ==========
    containerEl.createEl('h2', { text: this.config.getLocaleStrings().ui.parsingRules });

    new Setting(containerEl)
      .setName('Configure Parsing Rules')
      .setDesc('Customize how tasks, features, and blockers are detected')
      .addButton(button => {
        button.setButtonText('Edit Rules');
        button.onClick(() => {
          new ParsingRulesModal(this.app, this.config).open();
        });
      });

    // ========== REPORT SCHEMA SECTION ==========
    containerEl.createEl('h2', { text: this.config.getLocaleStrings().ui.reportSchema });

    new Setting(containerEl)
      .setName('Configure Reports')
      .setDesc('Customize sheet structure and columns')
      .addButton(button => {
        button.setButtonText('Edit Schema');
        button.onClick(() => {
          new ReportSchemaModal(this.app, this.config).open();
        });
      });

    // ========== STYLING SECTION ==========
    containerEl.createEl('h2', { text: 'Styling' });
    this.renderStyleSettings(containerEl);

    // ========== ADVANCED SECTION ==========
    containerEl.createEl('h2', { text: 'Advanced' });
    this.renderAdvancedSettings(containerEl);

    // ========== IMPORT/EXPORT SECTION ==========
    containerEl.createEl('h2', { text: this.config.getLocaleStrings().ui.importExport });
    this.renderImportExportSettings(containerEl);
  }

  private renderSourceSettings(containerEl: HTMLElement): void {
    const sources = this.config.getSources();

    new Setting(containerEl)
      .setName('Base Path')
      .setDesc('Root folder for all source files')
      .addText(text => {
        text.setValue(sources.basePath);
        text.onChange(async (value) => {
          await this.config.updateSources({ basePath: value });
        });
      });

    // ... additional source file settings
  }

  private renderStyleSettings(containerEl: HTMLElement): void {
    const style = this.config.getStyle();

    new Setting(containerEl)
      .setName('Header Background Color')
      .addColorPicker(picker => {
        picker.setValue(style.colors.headerBackground);
        picker.onChange(async (value) => {
          await this.config.updateStyle({
            colors: { ...style.colors, headerBackground: value }
          });
        });
      });

    // ... additional style settings
  }

  private renderImportExportSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName('Export Configuration')
      .setDesc('Save current settings to a JSON file')
      .addButton(button => {
        button.setButtonText('Export');
        button.onClick(async () => {
          const json = this.config.exportConfig();
          // Create download link
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'obsidian-excel-config.json';
          a.click();
        });
      });

    new Setting(containerEl)
      .setName('Import Configuration')
      .setDesc('Load settings from a JSON file')
      .addButton(button => {
        button.setButtonText('Import');
        button.onClick(async () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const text = await file.text();
              try {
                await this.config.importConfig(text);
                this.display(); // Refresh
              } catch (err) {
                // Show error notice
              }
            }
          };
          input.click();
        });
      });

    new Setting(containerEl)
      .setName('Reset to Defaults')
      .setDesc('Reset all settings to default values')
      .addButton(button => {
        button.setButtonText('Reset');
        button.setWarning();
        button.onClick(async () => {
          await this.config.applyPreset('korean-default');
          this.display();
        });
      });
  }
}
```

---

## 4. File Structure

```
src/
├── types/
│   ├── config.ts              # NEW: All configuration types
│   └── data.ts                # Existing: Data types
├── config/
│   └── presets/
│       ├── index.ts           # NEW: Preset loader
│       ├── korean-default.json    # NEW: Korean preset
│       ├── english-default.json   # NEW: English preset
│       ├── japanese-default.json  # NEW: Japanese preset
│       └── minimal.json           # NEW: Minimal preset
├── services/
│   ├── ConfigManager.ts       # NEW: Central configuration
│   ├── MarkdownParser.ts      # MODIFIED: Use config
│   ├── DataAggregator.ts      # MODIFIED: Use config
│   ├── CacheManager.ts        # Existing
│   └── VaultService.ts        # Existing
├── reports/
│   ├── BaseReport.ts          # NEW: Abstract base class
│   ├── WeeklyReport.ts        # MODIFIED: Use config + base
│   ├── QuarterlyReport.ts     # MODIFIED: Use config + base
│   ├── FeatureReport.ts       # MODIFIED: Use config + base
│   └── BlockerReport.ts       # MODIFIED: Use config + base
├── generators/
│   ├── StyleManager.ts        # MODIFIED: Use config
│   ├── ExcelGenerator.ts      # Existing
│   └── ChartBuilder.ts        # Existing
├── ui/
│   ├── ParsingRulesModal.ts   # NEW: Parsing rules editor
│   ├── ReportSchemaModal.ts   # NEW: Report schema editor
│   └── PresetManager.ts       # NEW: Preset import/export
├── utils/
│   ├── configUtils.ts         # NEW: Config helpers
│   ├── dateUtils.ts           # Existing
│   └── progress.ts            # Existing
├── errors/
│   └── ...                    # Existing
├── SettingsTab.ts             # MODIFIED: Expanded UI
└── main.ts                    # MODIFIED: Initialize ConfigManager
```

---

## 5. Implementation Order

### Priority P0 (Must Have)

| ID | Task | Files | Dependencies |
|----|------|-------|--------------|
| CFG-001 | Define config types | `src/types/config.ts` | None |
| CFG-002 | Create ConfigManager | `src/services/ConfigManager.ts` | CFG-001 |
| CFG-003 | Create presets | `src/config/presets/*.json` | CFG-001 |
| CFG-004 | Config utilities | `src/utils/configUtils.ts` | CFG-001 |
| I18N-001 | Update MarkdownParser | `src/services/MarkdownParser.ts` | CFG-002 |
| I18N-002 | Update report generators | `src/reports/*.ts` | CFG-002, I18N-001 |
| I18N-003 | Update main.ts initialization | `src/main.ts` | CFG-002 |

### Priority P1 (Should Have)

| ID | Task | Files | Dependencies |
|----|------|-------|--------------|
| RPT-001 | Create BaseReport | `src/reports/BaseReport.ts` | CFG-002 |
| RPT-002 | Refactor WeeklyReport | `src/reports/WeeklyReport.ts` | RPT-001 |
| RPT-003 | Refactor QuarterlyReport | `src/reports/QuarterlyReport.ts` | RPT-001 |
| RPT-004 | Refactor FeatureReport | `src/reports/FeatureReport.ts` | RPT-001 |
| RPT-005 | Refactor BlockerReport | `src/reports/BlockerReport.ts` | RPT-001 |
| UI-001 | Expand SettingsTab | `src/SettingsTab.ts` | CFG-002 |
| UI-002 | Create ParsingRulesModal | `src/ui/ParsingRulesModal.ts` | CFG-002, UI-001 |
| UI-003 | Create ReportSchemaModal | `src/ui/ReportSchemaModal.ts` | CFG-002, UI-001 |

### Priority P2 (Nice to Have)

| ID | Task | Files | Dependencies |
|----|------|-------|--------------|
| UI-004 | Preset import/export | `src/ui/PresetManager.ts` | UI-001 |
| TST-001 | ConfigManager tests | `tests/ConfigManager.test.ts` | CFG-002 |
| TST-002 | Preset loading tests | `tests/presets.test.ts` | CFG-003 |
| TST-003 | i18n integration tests | `tests/i18n.test.ts` | I18N-002 |

---

## 6. Verification Criteria

### 6.1 Configuration System

| Criteria | Test |
|----------|------|
| Config loads on startup | `ConfigManager.initialize()` succeeds |
| V1 migration works | Old settings converted to v2 format |
| Presets apply correctly | `applyPreset('english-default')` changes all locale strings |
| Config persistence | Settings survive plugin reload |
| Export/import works | Round-trip preserves all values |

### 6.2 Parsing Configuration

| Criteria | Test |
|----------|------|
| Custom priority indicators | User-defined emoji/tag detected as P0 |
| Custom status keywords | User-defined "완료" detected as completed |
| Table header aliases | Multiple header names map to same column |
| Invalid regex handling | Malformed pattern falls back gracefully |

### 6.3 Report Customization

| Criteria | Test |
|----------|------|
| Sheet names use locale | Korean preset shows "주간현황" |
| Columns use locale | English preset shows "Status" not "상태" |
| KPI labels localized | All KPI boxes use configured strings |
| Sheet enable/disable | Disabled sheets not generated |

### 6.4 Settings UI

| Criteria | Test |
|----------|------|
| Language dropdown works | Changing language updates all strings |
| Parsing rules modal | Can edit priority indicators |
| Report schema modal | Can enable/disable sheets |
| Import/export works | Config file downloads/uploads |

---

## 7. Migration Path

### For Existing Users

1. On first load after update:
   - Detect v1 settings (no `version` field)
   - Apply `korean-default` preset as base
   - Merge existing `sourceMappings` and `styling`
   - Show one-time "What's New" modal

2. Settings preserved:
   - All source file paths
   - Output directory
   - Existing color customizations
   - Report enable/disable states

3. New defaults applied:
   - Locale strings (Korean)
   - Parsing rules
   - Report schemas

---

**Next Step**: `/pdca do user-customization`
