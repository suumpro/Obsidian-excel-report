/**
 * Setup Wizard Modal
 * Guides first-run users through initial configuration
 * 4 steps: Language -> Base Path -> Source Files -> Output Settings
 */

import { App, Modal, Setting, Notice, TFolder } from 'obsidian';
import { ConfigManager } from '../services/ConfigManager';
import { LocaleCode } from '../types/config';
import { getPresetDisplayNames } from '../config/presets';
import { FolderSuggestModal, FileSuggestModal } from './SuggestModals';

interface WizardState {
  locale: LocaleCode;
  projectName: string;
  basePath: string;
  outputDir: string;
  dashboard: string;
  roadmap: string;
  blockers: string;
  features: string;
}

export class SetupWizardModal extends Modal {
  private configManager: ConfigManager;
  private currentStep: number = 0;
  private totalSteps: number = 4;
  private state: WizardState;
  private onComplete: () => void;

  constructor(app: App, configManager: ConfigManager, onComplete?: () => void) {
    super(app);
    this.configManager = configManager;
    this.onComplete = onComplete || (() => {});

    // Initialize state from current config
    const sources = configManager.getSources();
    this.state = {
      locale: configManager.getLocale(),
      projectName: sources.projectName || '',
      basePath: sources.basePath || '',
      outputDir: sources.outputDir || '',
      dashboard: sources.dashboard || '',
      roadmap: sources.roadmap || '',
      blockers: sources.blockers || '',
      features: sources.features || '',
    };
  }

  onOpen(): void {
    this.modalEl.addClass('excel-automation-wizard');
    this.renderStep();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderStep(): void {
    this.contentEl.empty();

    // Header with progress
    const header = this.contentEl.createDiv('wizard-header');
    header.createEl('h2', { text: 'Excel Automation Setup' });

    const progress = header.createDiv('wizard-progress');
    for (let i = 0; i < this.totalSteps; i++) {
      const dot = progress.createSpan('wizard-dot');
      if (i === this.currentStep) dot.addClass('active');
      else if (i < this.currentStep) dot.addClass('completed');
    }

    header.createEl('p', {
      text: `Step ${this.currentStep + 1} of ${this.totalSteps}`,
      cls: 'wizard-step-label',
    });

    // Step content
    const content = this.contentEl.createDiv('wizard-content');

    switch (this.currentStep) {
      case 0: this.renderLanguageStep(content); break;
      case 1: this.renderBasePathStep(content); break;
      case 2: this.renderSourceFilesStep(content); break;
      case 3: this.renderOutputStep(content); break;
    }

    // Navigation buttons
    const nav = this.contentEl.createDiv('wizard-nav');

    if (this.currentStep > 0) {
      const backBtn = nav.createEl('button', { text: 'Back' });
      backBtn.addEventListener('click', () => {
        this.currentStep--;
        this.renderStep();
      });
    } else {
      // Spacer
      nav.createDiv();
    }

    if (this.currentStep < this.totalSteps - 1) {
      const nextBtn = nav.createEl('button', { text: 'Next', cls: 'mod-cta' });
      nextBtn.addEventListener('click', () => {
        this.currentStep++;
        this.renderStep();
      });
    } else {
      const finishBtn = nav.createEl('button', { text: 'Finish Setup', cls: 'mod-cta' });
      finishBtn.addEventListener('click', () => this.finishSetup());
    }

    // Skip link
    if (this.currentStep < this.totalSteps - 1) {
      const skipLink = nav.createEl('a', { text: 'Skip wizard', cls: 'wizard-skip' });
      skipLink.addEventListener('click', () => {
        this.close();
      });
    }
  }

  private renderLanguageStep(container: HTMLElement): void {
    container.createEl('h3', { text: 'Choose Your Language' });
    container.createEl('p', { text: 'This sets the language for report labels, sheet names, and UI elements.' });

    const presetNames = getPresetDisplayNames();

    new Setting(container)
      .setName('Language')
      .setDesc('Select your preferred language for reports')
      .addDropdown(dropdown => {
        dropdown
          .addOption('en', presetNames['english-default'])
          .addOption('ko', presetNames['korean-default'])
          .addOption('ja', presetNames['japanese-default'])
          .addOption('custom', presetNames['minimal'])
          .setValue(this.state.locale)
          .onChange((value) => {
            this.state.locale = value as LocaleCode;
          });
      });

    new Setting(container)
      .setName('Project Name')
      .setDesc('Optional. Used in report titles and filenames (e.g., "MyProject")')
      .addText(text => text
        .setPlaceholder('MyProject')
        .setValue(this.state.projectName)
        .onChange((value) => {
          this.state.projectName = value;
        }));
  }

  private renderBasePathStep(container: HTMLElement): void {
    container.createEl('h3', { text: 'Set Base Path' });
    container.createEl('p', {
      text: 'The base folder in your vault where your project files are located. All source file paths will be relative to this folder.',
    });

    const pathSetting = new Setting(container)
      .setName('Base Path')
      .setDesc('Folder path relative to vault root')
      .addText(text => text
        .setPlaceholder('path/to/project')
        .setValue(this.state.basePath)
        .onChange((value) => {
          this.state.basePath = value;
        }));

    pathSetting.addButton(button => button
      .setButtonText('Browse')
      .onClick(() => {
        new FolderSuggestModal(this.app, (folder: TFolder) => {
          this.state.basePath = folder.path;
          this.renderStep(); // Re-render to update the text field
        }).open();
      }));

    const outputSetting = new Setting(container)
      .setName('Output Directory')
      .setDesc('Folder where generated Excel reports will be saved')
      .addText(text => text
        .setPlaceholder('Reports/Excel')
        .setValue(this.state.outputDir)
        .onChange((value) => {
          this.state.outputDir = value;
        }));

    outputSetting.addButton(button => button
      .setButtonText('Browse')
      .onClick(() => {
        new FolderSuggestModal(this.app, (folder: TFolder) => {
          this.state.outputDir = folder.path;
          this.renderStep();
        }).open();
      }));
  }

  private renderSourceFilesStep(container: HTMLElement): void {
    container.createEl('h3', { text: 'Source Files' });
    container.createEl('p', {
      text: 'Paths to your markdown source files, relative to the base path. You can configure these later in Settings.',
    });

    const basePath = this.state.basePath;

    const sources = [
      { key: 'dashboard' as const, name: 'Dashboard File', desc: 'PM Dashboard markdown file', placeholder: 'Dashboard.md' },
      { key: 'roadmap' as const, name: 'Roadmap File', desc: 'Product roadmap file', placeholder: 'Roadmap.md' },
      { key: 'blockers' as const, name: 'Blockers File', desc: 'Blocker tracking file', placeholder: 'Blockers.md' },
      { key: 'features' as const, name: 'Features File', desc: 'Feature list/status file', placeholder: 'Features.md' },
    ];

    for (const source of sources) {
      const setting = new Setting(container)
        .setName(source.name)
        .setDesc(source.desc)
        .addText(text => text
          .setPlaceholder(source.placeholder)
          .setValue(this.state[source.key])
          .onChange((value) => {
            this.state[source.key] = value;
          }));

      setting.addButton(button => button
        .setButtonText('Browse')
        .onClick(() => {
          new FileSuggestModal(this.app, (file) => {
            // Make path relative to basePath
            let relativePath = file.path;
            if (basePath && file.path.startsWith(basePath + '/')) {
              relativePath = file.path.slice(basePath.length + 1);
            }
            this.state[source.key] = relativePath;
            this.renderStep();
          }, basePath).open();
        }));
    }
  }

  private renderOutputStep(container: HTMLElement): void {
    container.createEl('h3', { text: 'Review & Finish' });
    container.createEl('p', { text: 'Review your settings before finishing setup.' });

    const summary = container.createDiv('wizard-summary');

    const items: [string, string][] = [
      ['Language', this.getLanguageLabel(this.state.locale)],
      ['Project Name', this.state.projectName || '(not set)'],
      ['Base Path', this.state.basePath || '(not set)'],
      ['Output Dir', this.state.outputDir || '(not set)'],
      ['Dashboard', this.state.dashboard || '(not set)'],
      ['Roadmap', this.state.roadmap || '(not set)'],
      ['Blockers', this.state.blockers || '(not set)'],
      ['Features', this.state.features || '(not set)'],
    ];

    for (const [label, value] of items) {
      const row = summary.createDiv('wizard-summary-row');
      row.createSpan({ text: label + ':', cls: 'wizard-summary-label' });
      row.createSpan({ text: value, cls: 'wizard-summary-value' });
    }

    container.createEl('p', {
      text: 'You can always change these settings later in the plugin Settings tab.',
      cls: 'wizard-hint',
    });
  }

  private getLanguageLabel(locale: LocaleCode): string {
    const labels: Record<string, string> = {
      'en': 'English',
      'ko': '\uD55C\uAD6D\uC5B4 (Korean)',
      'ja': '\u65E5\u672C\u8A9E (Japanese)',
      'zh': '\u4E2D\u6587 (Chinese)',
      'custom': 'Custom/Minimal',
    };
    return labels[locale] || locale;
  }

  private async finishSetup(): Promise<void> {
    try {
      // Apply language/preset
      await this.configManager.setLocale(this.state.locale, true);

      // Update source mappings
      await this.configManager.updateSources({
        basePath: this.state.basePath,
        outputDir: this.state.outputDir,
        projectName: this.state.projectName,
        dashboard: this.state.dashboard,
        roadmap: this.state.roadmap,
        blockers: this.state.blockers,
        features: this.state.features,
      });

      new Notice('Setup complete! You can now generate reports.');
      this.close();
      this.onComplete();
    } catch (error) {
      new Notice(`Setup failed: ${(error as Error).message}`);
    }
  }
}
