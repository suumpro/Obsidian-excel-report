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
  /** Path to Q1 Task Master file */
  q1TaskMaster: string;
  /** Path to Q2 Task Master file */
  q2TaskMaster: string;
  /** Path to Q3 Task Master file */
  q3TaskMaster: string;
  /** Path to Q4 Task Master file */
  q4TaskMaster: string;
  /** Path to Task Master Index file */
  taskMasterIndex: string;
  /** Path to Customer Requests file */
  customerRequests: string;
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
  /** Data source mode: 'folder' scans folders, 'files' uses individual file mappings */
  scanMode: 'folder' | 'files';
  /** Folders to scan in folder mode */
  scanFolders: string[];
}

/**
 * Default settings for the plugin
 */
export const DEFAULT_SETTINGS: ExcelAutomationSettings = {
  basePath: '',
  outputDir: '',

  sources: {
    dashboard: '',
    q1Status: '',
    q2Status: '',
    q3Status: '',
    q4Status: '',
    blockers: '',
    roadmap: '',
    betting: '',
    featuresDir: '',
    playbook: '',
    q1TaskMaster: '',
    q2TaskMaster: '',
    q3TaskMaster: '',
    q4TaskMaster: '',
    taskMasterIndex: '',
    customerRequests: '',
  },

  reports: {
    weekly: {
      enabled: true,
      filenameFormat: 'Weekly_W{week}_{date}.xlsx',
      sheets: ['Weekly Summary', 'Roadmap Progress', 'Task Details', 'Blocker Tracking', 'Coordination', 'Milestones', 'Playbook Progress'],
    },
    quarterly: {
      enabled: true,
      filenameFormat: 'Quarterly_Q{quarter}_{date}.xlsx',
      sheets: ['Overview', 'P0_Tasks', 'P1_Tasks', 'Progress_Charts'],
    },
    features: {
      enabled: false,
      filenameFormat: 'Features_{date}.xlsx',
      sheets: ['All_Features', 'By_Priority', 'By_Cycle'],
    },
    blockers: {
      enabled: false,
      filenameFormat: 'Blockers_{date}.xlsx',
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

  scanMode: 'folder',
  scanFolders: [],
};
