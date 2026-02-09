/**
 * ConfigManager Service
 * Central configuration management for the plugin
 * Handles loading, saving, migration, and preset application
 */

import { Plugin } from 'obsidian';
import { logger } from '../utils/logger';
import {
  PluginConfig,
  CONFIG_VERSION,
  LocaleCode,
  LocaleStrings,
  ParsingConfig,
  ReportSchemaConfig,
  StyleConfig,
  SourceMappings,
  AdvancedSettings,
  DEFAULT_ADVANCED_SETTINGS,
  DEFAULT_STYLE_CONFIG,
  DEFAULT_SOURCE_MAPPINGS,
  OutputConfig,
  ScanMode,
} from '../types/config';
import { deepMerge, validateConfig, cloneConfig } from '../utils/configUtils';
import { getPreset, PresetName, getDefaultPresetName } from '../config/presets';

type ConfigListener = (config: PluginConfig) => void;

export class ConfigManager {
  private config: PluginConfig;
  private plugin: Plugin;
  private listeners: Set<ConfigListener> = new Set();
  private initialized: boolean = false;
  private _isFirstRun: boolean = false;
  private rawData: Record<string, unknown> | null = null;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    // Initialize with default preset (will be overwritten on initialize())
    this.config = getPreset(getDefaultPresetName());
  }

  // ========== INITIALIZATION ==========

  /**
   * Initialize the configuration manager
   * Loads saved config or migrates from v1
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const savedData = await this.plugin.loadData();
    this.rawData = savedData;

    if (!savedData) {
      // First time user - use default preset
      this.config = getPreset(getDefaultPresetName());
      this.config.version = CONFIG_VERSION;
      this._isFirstRun = true;
    } else if (!savedData.version || savedData.version === '1.0') {
      // V1 user - migrate settings
      this.config = await this.migrateFromV1(savedData);
    } else if (savedData.version !== CONFIG_VERSION) {
      // Version upgrade needed
      this.config = await this.upgradeConfig(savedData);
    } else {
      // Valid v2 config
      this.config = savedData;
    }

    // Ensure scan config exists (migration for pre-scan configs)
    if (this.config.scanMode === undefined) {
      // Existing users with source mappings → files mode; new users → folder mode
      this.config.scanMode = this._isFirstRun ? 'folder' : 'files';
      this.config.scanFolders = this.config.scanFolders || [];
    }

    // Validate and save
    const validation = validateConfig(this.config);
    if (!validation.valid) {
      logger.warn('Config validation warnings:', validation.errors);
      // Apply defaults for missing values
      this.config = this.applyDefaults(this.config);
    }

    await this.save();
    this.initialized = true;
  }

  /**
   * Migrate from v1 settings format
   */
  private async migrateFromV1(oldSettings: any): Promise<PluginConfig> {
    logger.info('Migrating from v1 settings...');

    // Start with korean-default preset (matches v1 behavior)
    const baseConfig = getPreset('korean-default');

    if (oldSettings) {
      // Migrate existing source mappings
      if (oldSettings.sourceMappings) {
        baseConfig.sources = {
          ...baseConfig.sources,
          basePath: oldSettings.sourceMappings.basePath || '',
          outputDir: oldSettings.sourceMappings.outputDir || '',
          dashboard: oldSettings.sourceMappings.dashboard || '',
          quarterly: {
            q1: oldSettings.sourceMappings.q1Status || '',
            q2: oldSettings.sourceMappings.q2Status || '',
            q3: oldSettings.sourceMappings.q3Status || '',
            q4: oldSettings.sourceMappings.q4Status || '',
          },
          blockers: oldSettings.sourceMappings.blockers || '',
          roadmap: oldSettings.sourceMappings.roadmap || '',
          betting: oldSettings.sourceMappings.betting || '',
          features: oldSettings.sourceMappings.features || '',
          playbook: oldSettings.sourceMappings.playbook || '',
        };
      }

      // Migrate existing style settings
      if (oldSettings.styling) {
        baseConfig.style.colors = {
          ...baseConfig.style.colors,
          headerBackground: oldSettings.styling.headerColor || baseConfig.style.colors.headerBackground,
          subheaderBackground: oldSettings.styling.subheaderColor || baseConfig.style.colors.subheaderBackground,
        };

        if (oldSettings.styling.priorityColors) {
          baseConfig.style.colors.priority = {
            p0: oldSettings.styling.priorityColors.p0 || baseConfig.style.colors.priority.p0,
            p1: oldSettings.styling.priorityColors.p1 || baseConfig.style.colors.priority.p1,
            p2: oldSettings.styling.priorityColors.p2 || baseConfig.style.colors.priority.p2,
          };
        }

        if (oldSettings.styling.statusColors) {
          baseConfig.style.colors.status = {
            completed: oldSettings.styling.statusColors.completed || baseConfig.style.colors.status.completed,
            inProgress: oldSettings.styling.statusColors.inProgress || baseConfig.style.colors.status.inProgress,
            pending: oldSettings.styling.statusColors.pending || baseConfig.style.colors.status.pending,
          };
        }
      }

      // Migrate report configurations
      if (oldSettings.reports) {
        const reportKeys = ['weekly', 'quarterly', 'feature', 'blocker'] as const;
        for (const key of reportKeys) {
          if (oldSettings.reports[key]) {
            baseConfig.reports[key].enabled = oldSettings.reports[key].enabled ?? true;
            if (oldSettings.reports[key].filename) {
              baseConfig.reports[key].filename = oldSettings.reports[key].filename;
            }
          }
        }
      }

      // Migrate advanced settings
      if (oldSettings.advanced) {
        baseConfig.advanced = {
          ...baseConfig.advanced,
          weekStartDay: oldSettings.advanced.weekStartDay ?? 1,
          dateFormat: oldSettings.advanced.dateFormat || 'YYYY-MM-DD',
          debugLogging: oldSettings.advanced.debugLogging ?? false,
          logLevel: oldSettings.advanced.logLevel || 'INFO',
        };
      }
    }

    baseConfig.version = CONFIG_VERSION;
    return baseConfig;
  }

  /**
   * Upgrade config from older v2.x versions
   */
  private async upgradeConfig(oldConfig: PluginConfig): Promise<PluginConfig> {
    logger.info(`Upgrading config from ${oldConfig.version} to ${CONFIG_VERSION}...`);

    // Get the appropriate preset based on current locale
    const currentPreset = getPreset(oldConfig.locale || 'korean-default');

    // Deep merge: preset as base, old config as override
    const upgraded = deepMerge(currentPreset, oldConfig);

    // v2.0 → v2.1 migration
    if (oldConfig.version === '2.0' || oldConfig.version === '2.1') {
      logger.info(`Applying ${oldConfig.version} → v3.0 migration...`);

      // Add Task Master paths if not present
      if (!upgraded.sources.taskMasters) {
        upgraded.sources.taskMasters = { q1: '', q2: '', q3: '', q4: '', index: '' };
      }

      // Add Customer Requests path if not present
      if (upgraded.sources.customerRequests === undefined) {
        upgraded.sources.customerRequests = '';
      }

      // Add output config if not present
      if (!upgraded.output) {
        upgraded.output = {
          baseDir: '',
          weeklySubdir: '',
          quarterlySubdir: '',
          featureSubdir: '',
          blockerSubdir: '',
        };
      }

      // Add projectName if not present
      if (!upgraded.sources.projectName) {
        upgraded.sources.projectName = '';
      }
    }

    upgraded.version = CONFIG_VERSION;

    return upgraded;
  }

  /**
   * Apply default values for missing config sections
   */
  private applyDefaults(config: PluginConfig): PluginConfig {
    return {
      ...config,
      advanced: config.advanced || DEFAULT_ADVANCED_SETTINGS,
      style: config.style || DEFAULT_STYLE_CONFIG,
      sources: config.sources || DEFAULT_SOURCE_MAPPINGS,
    };
  }

  // ========== GETTERS ==========

  /**
   * Whether this is the first time the plugin is loaded (no saved config)
   */
  get isFirstRun(): boolean {
    return this._isFirstRun;
  }

  /**
   * Get the raw data loaded during initialization (avoids double loadData)
   */
  getRawData(): Record<string, unknown> | null {
    return this.rawData;
  }

  /**
   * Get the full configuration
   */
  get(): PluginConfig {
    return this.config;
  }

  /**
   * Get current locale code
   */
  getLocale(): LocaleCode {
    return this.config.locale;
  }

  /**
   * Get locale strings for current language
   */
  getLocaleStrings(): LocaleStrings {
    return this.config.localeStrings;
  }

  /**
   * Get parsing configuration
   */
  getParsing(): ParsingConfig {
    return this.config.parsing;
  }

  /**
   * Get reports configuration
   */
  getReports(): ReportSchemaConfig {
    return this.config.reports;
  }

  /**
   * Get style configuration
   */
  getStyle(): StyleConfig {
    return this.config.style;
  }

  /**
   * Get source mappings
   */
  getSources(): SourceMappings {
    return this.config.sources;
  }

  /**
   * Get advanced settings
   */
  getAdvanced(): AdvancedSettings {
    return this.config.advanced;
  }

  /**
   * Get output configuration
   */
  getOutputConfig(): OutputConfig | null {
    return this.config.output || null;
  }

  /**
   * Get scan mode ('folder' or 'files')
   */
  getScanMode(): ScanMode {
    return this.config.scanMode || 'folder';
  }

  /**
   * Get folders to scan in folder mode
   */
  getScanFolders(): string[] {
    return this.config.scanFolders || [];
  }

  // ========== SETTERS ==========

  /**
   * Set the locale and optionally apply preset strings
   */
  async setLocale(locale: LocaleCode, applyPresetStrings: boolean = true): Promise<void> {
    this.config.locale = locale;

    if (applyPresetStrings && locale !== 'custom') {
      const preset = getPreset(locale);
      this.config.localeStrings = preset.localeStrings;
      this.config.parsing = preset.parsing;
    }

    await this.save();
  }

  /**
   * Update parsing configuration
   */
  async updateParsing(parsing: Partial<ParsingConfig>): Promise<void> {
    this.config.parsing = deepMerge(this.config.parsing, parsing);
    await this.save();
  }

  /**
   * Update reports configuration
   */
  async updateReports(reports: Partial<ReportSchemaConfig>): Promise<void> {
    this.config.reports = deepMerge(this.config.reports, reports);
    await this.save();
  }

  /**
   * Update style configuration
   */
  async updateStyle(style: Partial<StyleConfig>): Promise<void> {
    this.config.style = deepMerge(this.config.style, style);
    await this.save();
  }

  /**
   * Update source mappings
   */
  async updateSources(sources: Partial<SourceMappings>): Promise<void> {
    this.config.sources = deepMerge(this.config.sources, sources);
    await this.save();
  }

  /**
   * Update advanced settings
   */
  async updateAdvanced(advanced: Partial<AdvancedSettings>): Promise<void> {
    this.config.advanced = deepMerge(this.config.advanced, advanced);
    await this.save();
  }

  /**
   * Update scan configuration
   */
  async updateScanConfig(scanMode: ScanMode, scanFolders: string[]): Promise<void> {
    this.config.scanMode = scanMode;
    this.config.scanFolders = scanFolders;
    await this.save();
  }

  // ========== PRESETS ==========

  /**
   * Apply a preset configuration
   * Preserves user's source mappings and some advanced settings
   */
  async applyPreset(presetName: PresetName): Promise<void> {
    const preset = getPreset(presetName);

    // Preserve user's source mappings
    const preservedSources = cloneConfig(this.config.sources);

    // Preserve some advanced settings
    const preservedAdvanced = {
      debugLogging: this.config.advanced.debugLogging,
      logLevel: this.config.advanced.logLevel,
    };

    // Apply preset
    this.config = preset;
    this.config.version = CONFIG_VERSION;
    this.config.sources = preservedSources;
    this.config.advanced = {
      ...this.config.advanced,
      ...preservedAdvanced,
    };

    await this.save();
  }

  // ========== PERSISTENCE ==========

  /**
   * Save configuration to disk
   */
  private async save(): Promise<void> {
    await this.plugin.saveData(this.config);
    this.notifyListeners();
  }

  /**
   * Force reload configuration from disk
   */
  async reload(): Promise<void> {
    const savedData = await this.plugin.loadData();
    if (savedData) {
      this.config = savedData;
      this.notifyListeners();
    }
  }

  // ========== OBSERVERS ==========

  /**
   * Subscribe to configuration changes
   * Returns unsubscribe function
   */
  subscribe(listener: ConfigListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of configuration change
   */
  private notifyListeners(): void {
    const configCopy = cloneConfig(this.config);
    this.listeners.forEach(listener => {
      try {
        listener(configCopy);
      } catch (e) {
        logger.error('Error in config listener:', e);
      }
    });
  }

  // ========== EXPORT/IMPORT ==========

  /**
   * Export configuration as JSON string
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  async importConfig(jsonString: string): Promise<void> {
    let imported: unknown;
    try {
      imported = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid JSON format. Please check the configuration file.');
    }
    const validation = validateConfig(imported);

    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    // Preserve version
    const config = imported as PluginConfig;
    config.version = CONFIG_VERSION;

    this.config = config;
    await this.save();
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<void> {
    await this.applyPreset(getDefaultPresetName());
  }
}
