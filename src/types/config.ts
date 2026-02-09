/**
 * Configuration Types for Obsidian Excel Automation
 * Enables multi-language support, configurable parsing, and customizable reports
 */

// ============================================
// CONFIGURATION VERSION
// ============================================
export const CONFIG_VERSION = '4.0';

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

  // Sheet Names
  sheets: {
    // Weekly Report
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
    quarter: string;
    week: string;
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
    apply: string;
  };

  // Messages
  messages: {
    reportGenerated: string;
    reportFailed: string;
    settingsSaved: string;
    presetApplied: string;
    validationError: string;
    loading: string;
    noData: string;
  };

  // Customer Requests (v4.0)
  customerRequests: {
    sheetName: string;
    trackingSheetName: string;
    title: string;
    trackingTitle: string;
    totalRequests: string;
    completionRate: string;
    requestContent: string;
    linkedFeature: string;
    linkedTask: string;
    priorityRequired: string;
    priorityImportant: string;
    priorityNormal: string;
    priorityDeferred: string;
    byPriorityStatus: string;
    allRequestsList: string;
    number: string;
  };

  // Weekly Breakdown (v4.0)
  weeklyBreakdown: {
    sheetName: string;
    title: string;
    summary: string;
    period: string;
    newTasks: string;
    dueTasks: string;
    milestone: string;
    newStart: string;
    dueUpcoming: string;
    milestoneLabel: string;
    theme: string;
    targetAcceptance: string;
  };

  // Units / Suffixes (v4.0)
  units: {
    count: string;
    items: string;
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
  checkboxPattern: string;

  // Priority indicators (multiple allowed per level)
  priorityIndicators: {
    p0: string[];
    p1: string[];
    p2: string[];
  };

  // Status indicators
  statusIndicators: {
    completed: string[];
    pending: string[];
    inProgress: string[];
  };

  // Due date patterns (regex strings)
  dueDatePatterns: string[];

  // Owner/assignee patterns (regex strings)
  ownerPatterns: string[];
}

export interface FeatureParsingRules {
  // Feature ID pattern (regex string)
  idPattern: string;

  // Field names in frontmatter or tables
  fields: {
    status: string[];
    priority: string[];
    cycle: string[];
    owner: string[];
  };

  // Status value mappings
  statusMapping: {
    completed: string[];
    inProgress: string[];
    pending: string[];
  };
}

export interface BlockerParsingRules {
  // Status indicators
  resolvedIndicators: string[];
  unresolvedIndicators: string[];
  inProgressIndicators: string[];

  // Priority section headers
  prioritySections: {
    high: string[];
    medium: string[];
    low: string[];
  };

  // Impact field patterns
  impactPatterns: string[];
}

export interface TableParsingRules {
  // Header detection for different table types
  coordinationHeaders: string[];
  milestoneHeaders: string[];
  playbookHeaders: string[];

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
  custom?: CustomReportDefinition[];
}

export interface ReportDefinition {
  enabled: boolean;
  filename: string;
  metadata: ReportMetadata;
  sheets?: SheetDefinition[];
}

export interface ReportMetadata {
  author: string;
  title: string;
  subject: string;
}

export interface SheetDefinition {
  name: string;
  type: 'summary' | 'table' | 'chart' | 'kpi';
  columns?: ColumnDefinition[];
  dataSource?: string;
}

export interface ColumnDefinition {
  key: string;
  header: string;
  width?: number;
  format?: 'text' | 'number' | 'date' | 'percentage' | 'currency';
  style?: 'priority' | 'status' | 'default';
}

export interface CustomReportDefinition extends ReportDefinition {
  id: string;
  sheets: SheetDefinition[];
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
// SOURCE MAPPINGS (existing, enhanced)
// ============================================
export interface SourceMappings {
  basePath: string;
  outputDir: string;
  projectName?: string;
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
  taskMasters?: {
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    index: string;
  };
  customerRequests?: string;
}

// ============================================
// ADVANCED SETTINGS
// ============================================
export interface AdvancedSettings {
  weekStartDay: 0 | 1;  // 0=Sunday, 1=Monday
  dateFormat: string;
  debugLogging: boolean;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  cacheEnabled: boolean;
  cacheTTL: number;  // milliseconds
}

// ============================================
// OUTPUT CONFIGURATION
// ============================================
export interface OutputConfig {
  baseDir: string;
  weeklySubdir: string;
  quarterlySubdir: string;
  featureSubdir: string;
  blockerSubdir: string;
}

// ============================================
// MAIN PLUGIN CONFIG
// ============================================
export type ScanMode = 'folder' | 'files';

export interface PluginConfig {
  version: string;
  locale: LocaleCode;
  localeStrings: LocaleStrings;
  parsing: ParsingConfig;
  reports: ReportSchemaConfig;
  style: StyleConfig;
  sources: SourceMappings;
  output?: OutputConfig;
  advanced: AdvancedSettings;
  scanMode?: ScanMode;
  scanFolders?: string[];
}

// ============================================
// VALIDATION TYPES
// ============================================
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// DEFAULT VALUES
// ============================================
export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  weekStartDay: 1,
  dateFormat: 'YYYY-MM-DD',
  debugLogging: false,
  logLevel: 'INFO',
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
};

export const DEFAULT_STYLE_CONFIG: StyleConfig = {
  colors: {
    headerBackground: '#4472C4',
    subheaderBackground: '#8FAADC',
    alternateRowBackground: '#F2F2F2',
    borderColor: '#000000',
    priority: {
      p0: '#FF6B6B',
      p1: '#FFE066',
      p2: '#69DB7C',
    },
    status: {
      completed: '#69DB7C',
      inProgress: '#FFE066',
      pending: '#FF6B6B',
    },
  },
  typography: {
    headerFont: { size: 12, bold: true, italic: false, color: '#FFFFFF' },
    subheaderFont: { size: 11, bold: true, italic: false, color: '#000000' },
    bodyFont: { size: 10, bold: false, italic: false, color: '#000000' },
    titleFont: { size: 14, bold: true, italic: false, color: '#000000' },
  },
  layout: {
    defaultRowHeight: 20,
    defaultColumnWidth: 15,
    borderStyle: 'thin',
    tabColor: '#4472C4',
  },
};

export const DEFAULT_SOURCE_MAPPINGS: SourceMappings = {
  basePath: '',
  outputDir: '',
  dashboard: '',
  quarterly: {
    q1: '',
    q2: '',
    q3: '',
    q4: '',
  },
  blockers: '',
  roadmap: '',
  betting: '',
  features: '',
  playbook: '',
};
