/**
 * Settings Tab UI for Excel Automation Plugin
 * v2.0 - Enhanced with language selector and ConfigManager integration
 */

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type ExcelAutomationPlugin from '../main';
import { LocaleCode } from '../types/config';
import { getPresetDisplayNames, PresetName } from '../config/presets';

export class ExcelAutomationSettingsTab extends PluginSettingTab {
  plugin: ExcelAutomationPlugin;

  constructor(app: App, plugin: ExcelAutomationPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const configManager = this.plugin.configManager;
    const localeStrings = configManager?.getLocaleStrings();
    const uiStrings = localeStrings?.ui;

    containerEl.createEl('h2', { text: uiStrings?.settings || 'Excel Automation Settings' });

    // ===== Language Section (NEW in v2.0) =====
    containerEl.createEl('h3', { text: uiStrings?.language || 'Language' });

    const presetNames = getPresetDisplayNames();
    const currentLocale = configManager?.getLocale() || 'ko';

    new Setting(containerEl)
      .setName(uiStrings?.language || 'Language / 言語 / 언어')
      .setDesc('Select language for report labels and UI. Presets will update parsing rules.')
      .addDropdown(dropdown => {
        dropdown
          .addOption('ko', presetNames['korean-default'])
          .addOption('en', presetNames['english-default'])
          .addOption('ja', presetNames['japanese-default'])
          .addOption('custom', presetNames['minimal'])
          .setValue(currentLocale)
          .onChange(async (value) => {
            const localeCode = value as LocaleCode;
            await configManager?.setLocale(localeCode, true);
            new Notice(localeStrings?.messages.presetApplied || 'Language changed - reload settings');
            // Refresh the settings display
            this.display();
          });
      });

    new Setting(containerEl)
      .setName(uiStrings?.presets || 'Presets')
      .setDesc('Apply a preset configuration (resets parsing rules and labels)')
      .addButton(button => button
        .setButtonText('Korean')
        .onClick(async () => {
          await configManager?.applyPreset('korean-default');
          new Notice('Korean preset applied');
          this.display();
        }))
      .addButton(button => button
        .setButtonText('English')
        .onClick(async () => {
          await configManager?.applyPreset('english-default');
          new Notice('English preset applied');
          this.display();
        }))
      .addButton(button => button
        .setButtonText('日本語')
        .onClick(async () => {
          await configManager?.applyPreset('japanese-default');
          new Notice('Japanese preset applied');
          this.display();
        }))
      .addButton(button => button
        .setButtonText('Minimal')
        .onClick(async () => {
          await configManager?.applyPreset('minimal');
          new Notice('Minimal preset applied');
          this.display();
        }));

    // ===== Paths Section =====
    containerEl.createEl('h3', { text: 'Paths' });

    const sourcesConfig = configManager?.getSources();

    new Setting(containerEl)
      .setName('Base Path')
      .setDesc('Base folder path within your vault for source files (relative to vault root)')
      .addText(text => text
        .setPlaceholder('02. Area/03. Work/PROJECT')
        .setValue(sourcesConfig?.basePath || this.plugin.settings.basePath)
        .onChange(async (value) => {
          this.plugin.settings.basePath = value;
          await this.plugin.saveSettings();
          await configManager?.updateSources({ basePath: value });
        }));

    new Setting(containerEl)
      .setName('Output Directory')
      .setDesc('Folder where Excel reports will be saved (relative to vault root)')
      .addText(text => text
        .setPlaceholder('path/to/output')
        .setValue(sourcesConfig?.outputDir || this.plugin.settings.outputDir)
        .onChange(async (value) => {
          this.plugin.settings.outputDir = value;
          await this.plugin.saveSettings();
          await configManager?.updateSources({ outputDir: value });
        }));

    // ===== Source Files Section =====
    containerEl.createEl('h3', { text: 'Source Files' });
    containerEl.createEl('p', {
      text: 'Paths relative to Base Path',
      cls: 'setting-item-description',
    });

    new Setting(containerEl)
      .setName('Dashboard File')
      .setDesc('Path to PM Dashboard markdown file')
      .addText(text => text
        .setPlaceholder('00_Dashboard/_PM Dashboard.md')
        .setValue(sourcesConfig?.dashboard || this.plugin.settings.sources.dashboard)
        .onChange(async (value) => {
          this.plugin.settings.sources.dashboard = value;
          await this.plugin.saveSettings();
          await configManager?.updateSources({ dashboard: value });
        }));

    new Setting(containerEl)
      .setName('Q1 Status File')
      .setDesc('Path to Q1 status file')
      .addText(text => text
        .setValue(sourcesConfig?.quarterly?.q1 || this.plugin.settings.sources.q1Status)
        .onChange(async (value) => {
          this.plugin.settings.sources.q1Status = value;
          await this.plugin.saveSettings();
          await configManager?.updateSources({ quarterly: { ...sourcesConfig?.quarterly, q1: value } });
        }));

    new Setting(containerEl)
      .setName('Blockers File')
      .setDesc('Path to Blockers Tracker markdown file')
      .addText(text => text
        .setValue(sourcesConfig?.blockers || this.plugin.settings.sources.blockers)
        .onChange(async (value) => {
          this.plugin.settings.sources.blockers = value;
          await this.plugin.saveSettings();
          await configManager?.updateSources({ blockers: value });
        }));

    new Setting(containerEl)
      .setName('Roadmap File')
      .setDesc('Path to Roadmap markdown file')
      .addText(text => text
        .setValue(sourcesConfig?.roadmap || this.plugin.settings.sources.roadmap)
        .onChange(async (value) => {
          this.plugin.settings.sources.roadmap = value;
          await this.plugin.saveSettings();
          await configManager?.updateSources({ roadmap: value });
        }));

    // ===== Task Master Sources Section =====
    containerEl.createEl('h3', { text: 'Task Master Sources' });

    new Setting(containerEl)
      .setName('Q1 Task Master 경로')
      .setDesc('Q1 Task Master 파일 경로')
      .addText(text => text
        .setPlaceholder('JIRA/Q1_Tasks.md')
        .setValue((sourcesConfig as any)?.taskMasters?.q1 || '')
        .onChange(async (value) => {
          await configManager?.updateSources({
            taskMasters: { ...(sourcesConfig as any)?.taskMasters, q1: value }
          } as any);
        }));

    new Setting(containerEl)
      .setName('Q2 Task Master 경로')
      .setDesc('Q2 Task Master 파일 경로')
      .addText(text => text
        .setPlaceholder('JIRA/Q2_Tasks.md')
        .setValue((sourcesConfig as any)?.taskMasters?.q2 || '')
        .onChange(async (value) => {
          await configManager?.updateSources({
            taskMasters: { ...(sourcesConfig as any)?.taskMasters, q2: value }
          } as any);
        }));

    new Setting(containerEl)
      .setName('Q3 Task Master 경로')
      .setDesc('Q3 Task Master 파일 경로')
      .addText(text => text
        .setPlaceholder('JIRA/Q3_Tasks.md')
        .setValue((sourcesConfig as any)?.taskMasters?.q3 || '')
        .onChange(async (value) => {
          await configManager?.updateSources({
            taskMasters: { ...(sourcesConfig as any)?.taskMasters, q3: value }
          } as any);
        }));

    new Setting(containerEl)
      .setName('Q4 Task Master 경로')
      .setDesc('Q4 Task Master 파일 경로')
      .addText(text => text
        .setPlaceholder('JIRA/Q4_Tasks.md')
        .setValue((sourcesConfig as any)?.taskMasters?.q4 || '')
        .onChange(async (value) => {
          await configManager?.updateSources({
            taskMasters: { ...(sourcesConfig as any)?.taskMasters, q4: value }
          } as any);
        }));

    new Setting(containerEl)
      .setName('Task Master Index 경로')
      .setDesc('Task Master Index 파일 경로')
      .addText(text => text
        .setPlaceholder('JIRA/Index.md')
        .setValue((sourcesConfig as any)?.taskMasters?.index || '')
        .onChange(async (value) => {
          await configManager?.updateSources({
            taskMasters: { ...(sourcesConfig as any)?.taskMasters, index: value }
          } as any);
        }));

    new Setting(containerEl)
      .setName('고객 요청 파일 경로')
      .setDesc('Customer Requests 파일 경로')
      .addText(text => text
        .setPlaceholder('Customer_Requests.md')
        .setValue((sourcesConfig as any)?.customerRequests || '')
        .onChange(async (value) => {
          await configManager?.updateSources({ customerRequests: value } as any);
        }));

    // ===== Output Configuration Section =====
    containerEl.createEl('h3', { text: 'Output Configuration' });

    const outputConfig = configManager?.getOutputConfig();

    new Setting(containerEl)
      .setName('주간 리포트 하위 폴더')
      .setDesc('주간 리포트 출력 하위 폴더명')
      .addText(text => text
        .setPlaceholder('weekly')
        .setValue(outputConfig?.weeklySubdir || '')
        .onChange(async (value) => {
          const config = configManager?.get();
          if (config) {
            (config as any).output = { ...outputConfig, weeklySubdir: value };
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName('분기 리포트 하위 폴더')
      .setDesc('분기별 리포트 출력 하위 폴더명')
      .addText(text => text
        .setPlaceholder('quarterly')
        .setValue(outputConfig?.quarterlySubdir || '')
        .onChange(async (value) => {
          const config = configManager?.get();
          if (config) {
            (config as any).output = { ...outputConfig, quarterlySubdir: value };
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName('기능 리포트 하위 폴더')
      .setDesc('기능별 리포트 출력 하위 폴더명')
      .addText(text => text
        .setPlaceholder('features')
        .setValue(outputConfig?.featureSubdir || '')
        .onChange(async (value) => {
          const config = configManager?.get();
          if (config) {
            (config as any).output = { ...outputConfig, featureSubdir: value };
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName('블로커 리포트 하위 폴더')
      .setDesc('블로커 리포트 출력 하위 폴더명')
      .addText(text => text
        .setPlaceholder('blockers')
        .setValue(outputConfig?.blockerSubdir || '')
        .onChange(async (value) => {
          const config = configManager?.get();
          if (config) {
            (config as any).output = { ...outputConfig, blockerSubdir: value };
            await this.plugin.saveSettings();
          }
        }));

    // ===== Reports Section =====
    containerEl.createEl('h3', { text: 'Reports' });

    const reportsConfig = configManager?.getReports();

    new Setting(containerEl)
      .setName('Enable Weekly Report')
      .setDesc('Generate weekly report with 7 sheets (Lawson format)')
      .addToggle(toggle => toggle
        .setValue(reportsConfig?.weekly.enabled ?? this.plugin.settings.reports.weekly.enabled)
        .onChange(async (value) => {
          this.plugin.settings.reports.weekly.enabled = value;
          await this.plugin.saveSettings();
          await configManager?.updateReports({ weekly: { ...reportsConfig?.weekly, enabled: value } });
        }));

    new Setting(containerEl)
      .setName('Weekly Report Filename')
      .setDesc('Filename format for weekly reports. Use {week} and {date} placeholders.')
      .addText(text => text
        .setPlaceholder('Report_W{week}_{date}.xlsx')
        .setValue(reportsConfig?.weekly.filename || this.plugin.settings.reports.weekly.filenameFormat)
        .onChange(async (value) => {
          this.plugin.settings.reports.weekly.filenameFormat = value;
          await this.plugin.saveSettings();
          await configManager?.updateReports({ weekly: { ...reportsConfig?.weekly, filename: value } });
        }));

    new Setting(containerEl)
      .setName('Enable Quarterly Report')
      .setDesc('Generate quarterly status report with 4 sheets')
      .addToggle(toggle => toggle
        .setValue(reportsConfig?.quarterly.enabled ?? this.plugin.settings.reports.quarterly.enabled)
        .onChange(async (value) => {
          this.plugin.settings.reports.quarterly.enabled = value;
          await this.plugin.saveSettings();
          await configManager?.updateReports({ quarterly: { ...reportsConfig?.quarterly, enabled: value } });
        }));

    new Setting(containerEl)
      .setName('Quarterly Report Filename')
      .setDesc('Filename format for quarterly reports. Use {quarter} and {date} placeholders.')
      .addText(text => text
        .setPlaceholder('Report_Q{quarter}_{date}.xlsx')
        .setValue(reportsConfig?.quarterly.filename || this.plugin.settings.reports.quarterly.filenameFormat)
        .onChange(async (value) => {
          this.plugin.settings.reports.quarterly.filenameFormat = value;
          await this.plugin.saveSettings();
          await configManager?.updateReports({ quarterly: { ...reportsConfig?.quarterly, filename: value } });
        }));

    new Setting(containerEl)
      .setName('Enable Feature Report')
      .setDesc('Generate feature progress report with 3 sheets (All Features, By Priority, By Cycle)')
      .addToggle(toggle => toggle
        .setValue(reportsConfig?.feature.enabled ?? this.plugin.settings.reports.features.enabled)
        .onChange(async (value) => {
          this.plugin.settings.reports.features.enabled = value;
          await this.plugin.saveSettings();
          await configManager?.updateReports({ feature: { ...reportsConfig?.feature, enabled: value } });
        }));

    new Setting(containerEl)
      .setName('Feature Report Filename')
      .setDesc('Filename format for feature reports. Use {date} placeholder.')
      .addText(text => text
        .setPlaceholder('Features_{date}.xlsx')
        .setValue(reportsConfig?.feature.filename || this.plugin.settings.reports.features.filenameFormat)
        .onChange(async (value) => {
          this.plugin.settings.reports.features.filenameFormat = value;
          await this.plugin.saveSettings();
          await configManager?.updateReports({ feature: { ...reportsConfig?.feature, filename: value } });
        }));

    new Setting(containerEl)
      .setName('Enable Blocker Report')
      .setDesc('Generate blocker tracking report with 2 sheets (Active Blockers, History)')
      .addToggle(toggle => toggle
        .setValue(reportsConfig?.blocker.enabled ?? this.plugin.settings.reports.blockers.enabled)
        .onChange(async (value) => {
          this.plugin.settings.reports.blockers.enabled = value;
          await this.plugin.saveSettings();
          await configManager?.updateReports({ blocker: { ...reportsConfig?.blocker, enabled: value } });
        }));

    new Setting(containerEl)
      .setName('Blocker Report Filename')
      .setDesc('Filename format for blocker reports. Use {date} placeholder.')
      .addText(text => text
        .setPlaceholder('Blockers_{date}.xlsx')
        .setValue(reportsConfig?.blocker.filename || this.plugin.settings.reports.blockers.filenameFormat)
        .onChange(async (value) => {
          this.plugin.settings.reports.blockers.filenameFormat = value;
          await this.plugin.saveSettings();
          await configManager?.updateReports({ blocker: { ...reportsConfig?.blocker, filename: value } });
        }));

    // ===== Styling Section =====
    containerEl.createEl('h3', { text: 'Styling' });
    containerEl.createEl('p', {
      text: 'Colors in hex format (e.g., #4472C4)',
      cls: 'setting-item-description',
    });

    const styleConfig = configManager?.getStyle();

    new Setting(containerEl)
      .setName('Header Color')
      .setDesc('Background color for table headers')
      .addText(text => text
        .setPlaceholder('#4472C4')
        .setValue(styleConfig?.colors.headerBackground || this.plugin.settings.styling.headerColor)
        .onChange(async (value) => {
          this.plugin.settings.styling.headerColor = value;
          await this.plugin.saveSettings();
          await configManager?.updateStyle({ colors: { ...styleConfig?.colors, headerBackground: value } });
        }));

    new Setting(containerEl)
      .setName('P0 Priority Color')
      .setDesc('Background color for P0 (critical) items')
      .addText(text => text
        .setPlaceholder('#FF6B6B')
        .setValue(styleConfig?.colors.priority.p0 || this.plugin.settings.styling.priorityColors.P0)
        .onChange(async (value) => {
          this.plugin.settings.styling.priorityColors.P0 = value;
          await this.plugin.saveSettings();
          await configManager?.updateStyle({
            colors: { ...styleConfig?.colors, priority: { ...styleConfig?.colors.priority, p0: value } }
          });
        }));

    new Setting(containerEl)
      .setName('P1 Priority Color')
      .setDesc('Background color for P1 (high) items')
      .addText(text => text
        .setPlaceholder('#FFE066')
        .setValue(styleConfig?.colors.priority.p1 || this.plugin.settings.styling.priorityColors.P1)
        .onChange(async (value) => {
          this.plugin.settings.styling.priorityColors.P1 = value;
          await this.plugin.saveSettings();
          await configManager?.updateStyle({
            colors: { ...styleConfig?.colors, priority: { ...styleConfig?.colors.priority, p1: value } }
          });
        }));

    new Setting(containerEl)
      .setName('P2 Priority Color')
      .setDesc('Background color for P2 (normal) items')
      .addText(text => text
        .setPlaceholder('#69DB7C')
        .setValue(styleConfig?.colors.priority.p2 || this.plugin.settings.styling.priorityColors.P2)
        .onChange(async (value) => {
          this.plugin.settings.styling.priorityColors.P2 = value;
          await this.plugin.saveSettings();
          await configManager?.updateStyle({
            colors: { ...styleConfig?.colors, priority: { ...styleConfig?.colors.priority, p2: value } }
          });
        }));

    // ===== Advanced Section =====
    containerEl.createEl('h3', { text: 'Advanced' });

    const advancedConfig = configManager?.getAdvanced();

    new Setting(containerEl)
      .setName('Debug Mode')
      .setDesc('Enable verbose logging to console for troubleshooting')
      .addToggle(toggle => toggle
        .setValue(advancedConfig?.debugLogging ?? this.plugin.settings.advanced.debug)
        .onChange(async (value) => {
          this.plugin.settings.advanced.debug = value;
          await this.plugin.saveSettings();
          await configManager?.updateAdvanced({ debugLogging: value });
        }));

    new Setting(containerEl)
      .setName('Week Start Day')
      .setDesc('First day of the week (0=Sunday, 1=Monday)')
      .addDropdown(dropdown => dropdown
        .addOption('0', 'Sunday')
        .addOption('1', 'Monday')
        .setValue(String(advancedConfig?.weekStartDay ?? this.plugin.settings.advanced.weekStartDay))
        .onChange(async (value) => {
          this.plugin.settings.advanced.weekStartDay = parseInt(value);
          await this.plugin.saveSettings();
          await configManager?.updateAdvanced({ weekStartDay: parseInt(value) as 0 | 1 });
        }));

    // ===== Import/Export Section (NEW in v2.0) =====
    containerEl.createEl('h3', { text: uiStrings?.importExport || 'Import/Export' });

    new Setting(containerEl)
      .setName('Export Configuration')
      .setDesc('Download current configuration as JSON file')
      .addButton(button => button
        .setButtonText('Export')
        .onClick(async () => {
          const configJson = configManager?.exportConfig();
          if (configJson) {
            const blob = new Blob([configJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'excel-automation-config.json';
            a.click();
            URL.revokeObjectURL(url);
            new Notice('Configuration exported');
          }
        }));

    new Setting(containerEl)
      .setName('Import Configuration')
      .setDesc('Import configuration from JSON file')
      .addButton(button => button
        .setButtonText('Import')
        .onClick(async () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = async (e) => {
                try {
                  const jsonString = e.target?.result as string;
                  await configManager?.importConfig(jsonString);
                  new Notice('Configuration imported successfully');
                  this.display();
                } catch (err) {
                  new Notice(`Import failed: ${(err as Error).message}`);
                }
              };
              reader.readAsText(file);
            }
          };
          input.click();
        }));

    new Setting(containerEl)
      .setName('Reset to Defaults')
      .setDesc('Reset all settings to default values')
      .addButton(button => button
        .setButtonText(uiStrings?.reset || 'Reset')
        .setWarning()
        .onClick(async () => {
          await configManager?.resetToDefaults();
          new Notice('Settings reset to defaults');
          this.display();
        }));
  }
}
