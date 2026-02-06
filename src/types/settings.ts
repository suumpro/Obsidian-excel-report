/**
 * Plugin settings interface
 * Replaces Python YAML configuration in config.py
 */

/**
 * Source file path mappings
 */
export interface SourceMappings {
  /** Path to PM Dashboard markdown file */
  dashboard: string;
  /** Path to Q1 status file */
  q1Status: string;
  /** Path to Q2 status file */
  q2Status: string;
  /** Path to Q3 status file */
  q3Status: string;
  /** Path to Q4 status file */
  q4Status: string;
  /** Path to blockers tracker file */
  blockers: string;
  /** Path to roadmap file */
  roadmap: string;
  /** Path to betting file */
  betting: string;
  /** Path to features directory */
  featuresDir: string;
  /** Path to playbook file */
  playbook: string;
}

/**
 * Report configuration
 */
export interface ReportConfig {
  /** Whether this report type is enabled */
  enabled: boolean;
  /** Filename format with placeholders */
  filenameFormat: string;
  /** Sheet names for this report */
  sheets: string[];
}

/**
 * Report configurations for all report types
 */
export interface ReportConfigurations {
  weekly: ReportConfig;
  quarterly: ReportConfig;
  features: ReportConfig;
  blockers: ReportConfig;
}

/**
 * Styling options for Excel output
 */
export interface StylingOptions {
  /** Header background color (hex without #) */
  headerColor: string;
  /** Subheader background color */
  subheaderColor: string;
  /** Priority-based colors */
  priorityColors: {
    P0: string;
    P1: string;
    P2: string;
  };
  /** Status-based colors */
  statusColors: {
    completed: string;
    inProgress: string;
    pending: string;
  };
}

/**
 * Advanced settings
 */
export interface AdvancedSettings {
  /** Week start day (0=Sunday, 1=Monday) */
  weekStartDay: number;
  /** Date format string */
  dateFormat: string;
  /** Enable debug logging */
  debug: boolean;
  /** Log level */
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

/**
 * Main plugin settings interface
 */
export interface ExcelAutomationSettings {
  /** Base folder path within vault for source files */
  basePath: string;
  /** Output directory for Excel files */
  outputDir: string;
  /** Source file path mappings */
  sources: SourceMappings;
  /** Report configurations */
  reports: ReportConfigurations;
  /** Styling options */
  styling: StylingOptions;
  /** Advanced settings */
  advanced: AdvancedSettings;
}

/**
 * Default settings for the plugin
 */
export const DEFAULT_SETTINGS: ExcelAutomationSettings = {
  basePath: '02. Area/03. Work/STOREAGENT',
  outputDir: '02. Area/03. Work/STOREAGENT/05_Roadmap/Excel',

  sources: {
    dashboard: '00_Dashboard/_PM Dashboard.md',
    q1Status: '00_Dashboard/2026_Q1_Status.md',
    q2Status: '00_Dashboard/2026_Q2_Status.md',
    q3Status: '00_Dashboard/2026_Q3_Status.md',
    q4Status: '00_Dashboard/2026_Q4_Status.md',
    blockers: '00_Dashboard/Blockers_Tracker.md',
    roadmap: '05_Roadmap/Lawson_2026_로드맵_관리.md',
    betting: '02_Implementation/Betting/2026_Q1_Betting.md',
    featuresDir: '02_Implementation/Features',
    playbook: '../../01. Project/PRJ_2026_플레이북/01_Strategic/KPIs/2026_H1_Goals.md',
  },

  reports: {
    weekly: {
      enabled: true,
      filenameFormat: 'Lawson_Weekly_Report_W{week}_{date}.xlsx',
      sheets: ['주간현황', '로드맵진척', 'Q1작업상세', '블로커추적', 'Lawson협의', '마일스톤', '플레이북진척'],
    },
    quarterly: {
      enabled: true,
      filenameFormat: 'STOREAGENT_Q{quarter}_Status_{date}.xlsx',
      sheets: ['Overview', 'P0_Tasks', 'P1_Tasks', 'Progress_Charts'],
    },
    features: {
      enabled: false,
      filenameFormat: 'STOREAGENT_Features_{date}.xlsx',
      sheets: ['All_Features', 'By_Priority', 'By_Cycle'],
    },
    blockers: {
      enabled: false,
      filenameFormat: 'STOREAGENT_Blockers_{date}.xlsx',
      sheets: ['Active_Blockers', 'Blocker_History'],
    },
  },

  styling: {
    headerColor: '4472C4',
    subheaderColor: 'D9E1F2',
    priorityColors: {
      P0: 'FFC7CE',
      P1: 'FFEB9C',
      P2: 'C6EFCE',
    },
    statusColors: {
      completed: 'C6EFCE',
      inProgress: 'FFEB9C',
      pending: 'FFC7CE',
    },
  },

  advanced: {
    weekStartDay: 1, // Monday
    dateFormat: 'YYYY-MM-DD',
    debug: false,
    logLevel: 'INFO',
  },
};
