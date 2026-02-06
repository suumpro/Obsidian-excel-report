/**
 * Obsidian Excel Automation Plugin
 * Main entry point
 * v3.0 - Enhanced with ConfigManager for internationalization
 */

import { App, Notice, Plugin, addIcon } from 'obsidian';
import { ExcelAutomationSettings, DEFAULT_SETTINGS } from './types/settings';
import { ExcelAutomationSettingsTab } from './ui/SettingsTab';
import { WeeklyReportGenerator } from './reports/WeeklyReport';
import { QuarterlyReportGenerator } from './reports/QuarterlyReport';
import { FeatureReportGenerator } from './reports/FeatureReport';
import { BlockerReportGenerator } from './reports/BlockerReport';
import { DataAggregator } from './services/DataAggregator';
import { VaultService } from './services/VaultService';
import { ConfigManager } from './services/ConfigManager';
import { getCurrentWeekInfo, getCurrentQuarterInfo } from './utils/dateUtils';
import { logger, showSuccess, showError, showProgress } from './utils/logger';
import {
  ProgressReporter,
  WEEKLY_REPORT_STEPS,
  QUARTERLY_REPORT_STEPS,
  FEATURE_REPORT_STEPS,
  BLOCKER_REPORT_STEPS,
} from './utils/progress';

// Custom Excel icon SVG
const EXCEL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><line x1="10" y1="9" x2="14" y2="9"></line></svg>`;

export default class ExcelAutomationPlugin extends Plugin {
  settings: ExcelAutomationSettings;
  private vaultService: VaultService;
  configManager: ConfigManager;

  async onload() {
    logger.info('Loading Excel Automation Plugin v3.0');

    // Initialize ConfigManager first (handles v1 migration)
    this.configManager = new ConfigManager(this);
    await this.configManager.initialize();

    // Load legacy settings for backward compatibility
    await this.loadSettings();
    this.vaultService = new VaultService(this.app);

    // Configure logger based on settings
    const advancedConfig = this.configManager.getAdvanced();
    if (advancedConfig.debugLogging || this.settings.advanced.debug) {
      logger.setLevel('DEBUG');
    }

    // Add custom icon
    addIcon('excel-report', EXCEL_ICON);

    // Add ribbon icon for quick access
    this.addRibbonIcon('excel-report', 'Generate Excel Report', async () => {
      await this.showReportMenu();
    });

    // Register commands
    this.addCommand({
      id: 'generate-weekly-report',
      name: 'Generate Weekly Report',
      callback: async () => {
        await this.generateWeeklyReport();
      },
    });

    this.addCommand({
      id: 'generate-quarterly-report',
      name: 'Generate Quarterly Report',
      callback: async () => {
        await this.generateQuarterlyReport();
      },
    });

    this.addCommand({
      id: 'generate-all-reports',
      name: 'Generate All Enabled Reports',
      callback: async () => {
        await this.generateAllReports();
      },
    });

    this.addCommand({
      id: 'generate-feature-report',
      name: 'Generate Feature Progress Report',
      callback: async () => {
        await this.generateFeatureReport();
      },
    });

    this.addCommand({
      id: 'generate-blocker-report',
      name: 'Generate Blocker Tracking Report',
      callback: async () => {
        await this.generateBlockerReport();
      },
    });

    // Add settings tab (pass configManager for v2 settings)
    this.addSettingTab(new ExcelAutomationSettingsTab(this.app, this));

    // Log current locale
    const locale = this.configManager.getLocale();
    logger.info(`Excel Automation Plugin loaded (locale: ${locale})`);
  }

  onunload() {
    logger.info('Unloading Excel Automation Plugin');
  }

  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

    // Ensure nested objects are properly merged
    if (loadedData?.sources) {
      this.settings.sources = Object.assign({}, DEFAULT_SETTINGS.sources, loadedData.sources);
    }
    if (loadedData?.reports) {
      this.settings.reports = Object.assign({}, DEFAULT_SETTINGS.reports, loadedData.reports);
    }
    if (loadedData?.styling) {
      this.settings.styling = Object.assign({}, DEFAULT_SETTINGS.styling, loadedData.styling);
      if (loadedData.styling?.priorityColors) {
        this.settings.styling.priorityColors = Object.assign(
          {},
          DEFAULT_SETTINGS.styling.priorityColors,
          loadedData.styling.priorityColors
        );
      }
      if (loadedData.styling?.statusColors) {
        this.settings.styling.statusColors = Object.assign(
          {},
          DEFAULT_SETTINGS.styling.statusColors,
          loadedData.styling.statusColors
        );
      }
    }
    if (loadedData?.advanced) {
      this.settings.advanced = Object.assign({}, DEFAULT_SETTINGS.advanced, loadedData.advanced);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Get output path for a report, routing to appropriate subdirectory
   */
  private getOutputPath(reportType: 'weekly' | 'quarterly' | 'feature' | 'blocker', filename: string): string {
    const sourcesConfig = this.configManager.getSources();
    const outputDir = sourcesConfig.outputDir || this.settings.outputDir;

    // Check for output config with subdirectories
    const output = this.configManager.getOutputConfig();

    if (output) {
      const subdirMap: Record<string, string> = {
        weekly: output.weeklySubdir || '',
        quarterly: output.quarterlySubdir || '',
        feature: output.featureSubdir || '',
        blocker: output.blockerSubdir || '',
      };
      const subdir = subdirMap[reportType];
      if (subdir) {
        return `${outputDir}/${subdir}/${filename}`;
      }
    }

    return `${outputDir}/${filename}`;
  }

  /**
   * Show report menu (simple version - generates weekly by default)
   */
  private async showReportMenu() {
    // For simplicity, generate weekly report on ribbon click
    // Could be extended with a modal for selection
    await this.generateWeeklyReport();
  }

  /**
   * Generate weekly report
   */
  async generateWeeklyReport() {
    const reportsConfig = this.configManager.getReports();
    const localeStrings = this.configManager.getLocaleStrings();

    if (!reportsConfig.weekly.enabled && !this.settings.reports.weekly.enabled) {
      showError('Weekly report is disabled in settings');
      return;
    }

    const progress = new ProgressReporter(WEEKLY_REPORT_STEPS);
    progress.start();

    try {
      const aggregator = new DataAggregator(this.app, this.settings, this.configManager);
      const generator = new WeeklyReportGenerator(this.app, this.settings, aggregator, this.configManager);

      const weekInfo = getCurrentWeekInfo();
      const filename = (reportsConfig.weekly.filename || this.settings.reports.weekly.filenameFormat)
        .replace('{week}', weekInfo.formattedWeek)
        .replace('{date}', weekInfo.formattedDate.replace(/-/g, ''));

      logger.debug(`Generating weekly report: ${filename}`);

      // Generate report (data loading happens in generate())
      const buffer = await generator.generate(weekInfo);

      // Move to save step
      progress.nextStep(); // Skip to last step for saving

      // Save to vault
      const outputPath = this.getOutputPath('weekly', filename);
      await this.vaultService.ensureFolderExists(outputPath);
      await this.vaultService.createBinaryFile(outputPath, buffer);

      const elapsed = progress.getElapsedTime();
      progress.complete(`${localeStrings.messages.reportGenerated}: ${filename} (${elapsed}ms)`);
      logger.info(`Weekly report saved to: ${outputPath} in ${elapsed}ms`);

    } catch (error) {
      logger.error(`Error generating weekly report: ${error}`);
      progress.error(`${localeStrings.messages.reportFailed}: ${(error as Error).message}`);
    }
  }

  /**
   * Generate quarterly report
   */
  async generateQuarterlyReport() {
    const reportsConfig = this.configManager.getReports();
    const localeStrings = this.configManager.getLocaleStrings();

    if (!reportsConfig.quarterly.enabled && !this.settings.reports.quarterly.enabled) {
      showError('Quarterly report is disabled in settings');
      return;
    }

    const progress = new ProgressReporter(QUARTERLY_REPORT_STEPS);
    progress.start();

    try {
      const aggregator = new DataAggregator(this.app, this.settings, this.configManager);
      const generator = new QuarterlyReportGenerator(this.app, this.settings, aggregator, this.configManager);

      const quarterInfo = getCurrentQuarterInfo();
      const filename = (reportsConfig.quarterly.filename || this.settings.reports.quarterly.filenameFormat)
        .replace('{quarter}', String(quarterInfo.quarter))
        .replace('{date}', quarterInfo.formattedDate.replace(/-/g, ''));

      logger.debug(`Generating quarterly report: ${filename}`);

      const buffer = await generator.generate(quarterInfo.quarter, quarterInfo.year);

      progress.nextStep(); // Move to save step

      // Save to vault
      const outputPath = this.getOutputPath('quarterly', filename);
      await this.vaultService.ensureFolderExists(outputPath);
      await this.vaultService.createBinaryFile(outputPath, buffer);

      const elapsed = progress.getElapsedTime();
      progress.complete(`${localeStrings.messages.reportGenerated}: ${filename} (${elapsed}ms)`);
      logger.info(`Quarterly report saved to: ${outputPath} in ${elapsed}ms`);

    } catch (error) {
      logger.error(`Error generating quarterly report: ${error}`);
      progress.error(`${localeStrings.messages.reportFailed}: ${(error as Error).message}`);
    }
  }

  /**
   * Generate feature progress report
   */
  async generateFeatureReport() {
    const reportsConfig = this.configManager.getReports();
    const localeStrings = this.configManager.getLocaleStrings();

    if (!reportsConfig.feature.enabled && !this.settings.reports.features.enabled) {
      showError('Feature report is disabled in settings');
      return;
    }

    const progress = new ProgressReporter(FEATURE_REPORT_STEPS);
    progress.start();

    try {
      const aggregator = new DataAggregator(this.app, this.settings, this.configManager);
      const generator = new FeatureReportGenerator(this.app, this.settings, aggregator, this.configManager);

      const date = new Date();
      const formattedDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const filename = (reportsConfig.feature.filename || this.settings.reports.features.filenameFormat)
        .replace('{date}', formattedDate);

      logger.debug(`Generating feature report: ${filename}`);

      const buffer = await generator.generate();

      progress.nextStep(); // Move to save step

      // Save to vault
      const outputPath = this.getOutputPath('feature', filename);
      await this.vaultService.ensureFolderExists(outputPath);
      await this.vaultService.createBinaryFile(outputPath, buffer);

      const elapsed = progress.getElapsedTime();
      progress.complete(`${localeStrings.messages.reportGenerated}: ${filename} (${elapsed}ms)`);
      logger.info(`Feature report saved to: ${outputPath} in ${elapsed}ms`);

    } catch (error) {
      logger.error(`Error generating feature report: ${error}`);
      progress.error(`${localeStrings.messages.reportFailed}: ${(error as Error).message}`);
    }
  }

  /**
   * Generate blocker tracking report
   */
  async generateBlockerReport() {
    const reportsConfig = this.configManager.getReports();
    const localeStrings = this.configManager.getLocaleStrings();

    if (!reportsConfig.blocker.enabled && !this.settings.reports.blockers.enabled) {
      showError('Blocker report is disabled in settings');
      return;
    }

    const progress = new ProgressReporter(BLOCKER_REPORT_STEPS);
    progress.start();

    try {
      const aggregator = new DataAggregator(this.app, this.settings, this.configManager);
      const generator = new BlockerReportGenerator(this.app, this.settings, aggregator, this.configManager);

      const date = new Date();
      const formattedDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const filename = (reportsConfig.blocker.filename || this.settings.reports.blockers.filenameFormat)
        .replace('{date}', formattedDate);

      logger.debug(`Generating blocker report: ${filename}`);

      const buffer = await generator.generate();

      progress.nextStep(); // Move to save step

      // Save to vault
      const outputPath = this.getOutputPath('blocker', filename);
      await this.vaultService.ensureFolderExists(outputPath);
      await this.vaultService.createBinaryFile(outputPath, buffer);

      const elapsed = progress.getElapsedTime();
      progress.complete(`${localeStrings.messages.reportGenerated}: ${filename} (${elapsed}ms)`);
      logger.info(`Blocker report saved to: ${outputPath} in ${elapsed}ms`);

    } catch (error) {
      logger.error(`Error generating blocker report: ${error}`);
      progress.error(`${localeStrings.messages.reportFailed}: ${(error as Error).message}`);
    }
  }

  /**
   * Generate all enabled reports
   */
  async generateAllReports() {
    const reportsConfig = this.configManager.getReports();
    const notice = showProgress('Generating all reports...');
    let count = 0;
    const errors: string[] = [];

    try {
      if (reportsConfig.weekly.enabled || this.settings.reports.weekly.enabled) {
        try {
          await this.generateWeeklyReport();
          count++;
        } catch (e) {
          errors.push(`Weekly: ${(e as Error).message}`);
        }
      }

      if (reportsConfig.quarterly.enabled || this.settings.reports.quarterly.enabled) {
        try {
          await this.generateQuarterlyReport();
          count++;
        } catch (e) {
          errors.push(`Quarterly: ${(e as Error).message}`);
        }
      }

      if (reportsConfig.feature.enabled || this.settings.reports.features.enabled) {
        try {
          await this.generateFeatureReport();
          count++;
        } catch (e) {
          errors.push(`Features: ${(e as Error).message}`);
        }
      }

      if (reportsConfig.blocker.enabled || this.settings.reports.blockers.enabled) {
        try {
          await this.generateBlockerReport();
          count++;
        } catch (e) {
          errors.push(`Blockers: ${(e as Error).message}`);
        }
      }

      notice.hide();

      if (errors.length > 0) {
        showError(`Generated ${count} report(s) with errors: ${errors.join(', ')}`);
      } else if (count > 0) {
        showSuccess(`Generated ${count} report(s) successfully`);
      } else {
        showError('No reports are enabled. Check settings.');
      }

    } catch (error) {
      notice.hide();
      logger.error(`Error generating reports: ${error}`);
      showError(`Error generating reports: ${(error as Error).message}`);
    }
  }
}
