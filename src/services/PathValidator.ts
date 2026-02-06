/**
 * Path Validator Service
 * Validates source file paths before report generation
 */

import { App } from 'obsidian';
import { ConfigManager } from './ConfigManager';
import { VaultService } from './VaultService';
import { ExcelAutomationSettings } from '../types/settings';
import { logger } from '../utils/logger';

export interface ValidationResult {
  valid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  configuredPaths: { name: string; path: string; exists: boolean }[];
}

export type ReportType = 'weekly' | 'quarterly' | 'feature' | 'blocker';

export class PathValidator {
  private vault: VaultService;
  private configManager: ConfigManager;
  private settings: ExcelAutomationSettings;

  constructor(app: App, settings: ExcelAutomationSettings, configManager: ConfigManager) {
    this.vault = new VaultService(app);
    this.configManager = configManager;
    this.settings = settings;
  }

  /**
   * Validate paths for a specific report type
   */
  validate(reportType: ReportType, quarter?: number): ValidationResult {
    const sources = this.configManager.getSources();
    const basePath = sources.basePath || this.settings.basePath;

    const result: ValidationResult = {
      valid: true,
      missingRequired: [],
      missingOptional: [],
      configuredPaths: [],
    };

    // Get required and optional paths for this report type
    const { required, optional } = this.getRequiredPaths(reportType, sources, quarter);

    // Validate each required path
    for (const { name, path } of required) {
      const fullPath = path ? this.vault.getFullPath(basePath, path) : '';
      const exists = path ? this.vault.fileExists(fullPath) : false;

      result.configuredPaths.push({ name, path: path || '(not configured)', exists });

      if (!path) {
        result.missingRequired.push(`${name}: not configured`);
        result.valid = false;
      } else if (!exists) {
        result.missingRequired.push(`${name}: file not found at "${fullPath}"`);
        result.valid = false;
      }
    }

    // Validate optional paths (warn but don't fail)
    for (const { name, path } of optional) {
      const fullPath = path ? this.vault.getFullPath(basePath, path) : '';
      const exists = path ? this.vault.fileExists(fullPath) : false;

      result.configuredPaths.push({ name, path: path || '(not configured)', exists });

      if (path && !exists) {
        result.missingOptional.push(`${name}: file not found at "${fullPath}"`);
      }
    }

    return result;
  }

  /**
   * Validate all report types at once
   */
  validateAll(): Record<ReportType, ValidationResult> {
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    return {
      weekly: this.validate('weekly', currentQuarter),
      quarterly: this.validate('quarterly', currentQuarter),
      feature: this.validate('feature'),
      blocker: this.validate('blocker'),
    };
  }

  /**
   * Quick check: are minimum paths configured?
   */
  hasMinimumConfig(): boolean {
    const sources = this.configManager.getSources();
    return !!(sources.basePath || sources.dashboard || sources.roadmap || sources.blockers);
  }

  /**
   * Format validation result as user-friendly message
   */
  formatResult(result: ValidationResult, reportType: string): string {
    if (result.valid && result.missingOptional.length === 0) {
      return `${reportType}: All paths valid`;
    }

    const lines: string[] = [];
    if (!result.valid) {
      lines.push(`${reportType}: Missing required files:`);
      for (const msg of result.missingRequired) {
        lines.push(`  - ${msg}`);
      }
    }
    if (result.missingOptional.length > 0) {
      lines.push(`${reportType}: Optional files not found:`);
      for (const msg of result.missingOptional) {
        lines.push(`  - ${msg}`);
      }
    }
    return lines.join('\n');
  }

  /**
   * Get required and optional paths for each report type
   */
  private getRequiredPaths(
    reportType: ReportType,
    sources: ReturnType<ConfigManager['getSources']>,
    quarter?: number
  ): { required: { name: string; path: string }[]; optional: { name: string; path: string }[] } {
    const q = quarter || Math.ceil((new Date().getMonth() + 1) / 3);
    const qKey = `q${q}` as 'q1' | 'q2' | 'q3' | 'q4';

    switch (reportType) {
      case 'weekly':
        return {
          required: [
            { name: 'Dashboard', path: sources.dashboard },
            { name: 'Roadmap', path: sources.roadmap },
            { name: 'Blockers', path: sources.blockers },
          ],
          optional: [
            { name: `Q${q} Status`, path: sources.quarterly?.[qKey] || '' },
            { name: `Task Master Q${q}`, path: sources.taskMasters?.[qKey] || '' },
            { name: 'Customer Requests', path: sources.customerRequests || '' },
          ],
        };

      case 'quarterly':
        return {
          required: [
            { name: `Q${q} Status`, path: sources.quarterly?.[qKey] || '' },
          ],
          optional: [
            { name: `Task Master Q${q}`, path: sources.taskMasters?.[qKey] || '' },
            { name: 'Customer Requests', path: sources.customerRequests || '' },
          ],
        };

      case 'feature':
        return {
          required: [
            { name: 'Roadmap', path: sources.roadmap },
          ],
          optional: [],
        };

      case 'blocker':
        return {
          required: [
            { name: 'Blockers', path: sources.blockers },
            { name: 'Roadmap', path: sources.roadmap },
          ],
          optional: [],
        };

      default:
        return { required: [], optional: [] };
    }
  }
}
