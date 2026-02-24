/**
 * Unit tests for PathValidator
 */

import { App, Plugin } from 'obsidian';
import { PathValidator, ReportType } from '../src/services/PathValidator';
import { ConfigManager } from '../src/services/ConfigManager';
import { CONFIG_VERSION } from '../src/types/config';
import { getPreset } from '../src/config/presets';
import { ExcelAutomationSettings } from '../src/types/settings';

jest.mock('../src/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('PathValidator', () => {
  let app: App;
  let configManager: ConfigManager;
  let validator: PathValidator;

  const defaultSettings: ExcelAutomationSettings = {
    basePath: '',
    sources: {} as any,
    styling: {} as any,
    reports: {} as any,
    advanced: {} as any,
  };

  beforeEach(async () => {
    app = new App();
    const plugin = new Plugin(app, { id: 'test', name: 'Test', version: '4.0.0' });
    configManager = new ConfigManager(plugin);

    jest.spyOn(plugin, 'loadData').mockResolvedValue(null);
    jest.spyOn(plugin, 'saveData').mockResolvedValue();
    await configManager.initialize();

    // Set source paths for testing
    await configManager.updateSources({
      basePath: 'project',
      dashboard: 'dashboard.md',
      roadmap: 'roadmap.md',
      blockers: 'blockers.md',
      quarterly: { q1: 'q1.md', q2: 'q2.md', q3: 'q3.md', q4: 'q4.md' },
    } as any);

    validator = new PathValidator(app, defaultSettings, configManager);
  });

  /**
   * Helper: make vault return TFile for specific paths
   */
  function mockFileExists(paths: string[]) {
    const { TFile } = require('obsidian');
    jest.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path: string) => {
      if (paths.some(p => path.includes(p))) {
        return new TFile(path);
      }
      return null;
    });
  }

  describe('validate - weekly', () => {
    it('should return valid when all required files exist', () => {
      mockFileExists(['dashboard.md', 'roadmap.md', 'blockers.md']);

      const result = validator.validate('weekly', 1);
      expect(result.valid).toBe(true);
      expect(result.missingRequired).toHaveLength(0);
    });

    it('should return invalid when required file missing', () => {
      mockFileExists(['dashboard.md', 'roadmap.md']); // blockers missing

      const result = validator.validate('weekly', 1);
      expect(result.valid).toBe(false);
      expect(result.missingRequired.length).toBeGreaterThan(0);
      expect(result.missingRequired.some(m => m.includes('Blockers'))).toBe(true);
    });

    it('should report optional files separately', () => {
      mockFileExists(['dashboard.md', 'roadmap.md', 'blockers.md']);
      // q1.md is optional for weekly, not found

      const result = validator.validate('weekly', 1);
      expect(result.valid).toBe(true);
      // Optional files that are configured but missing appear in missingOptional
      expect(result.missingOptional.some(m => m.includes('Q1 Status'))).toBe(true);
    });
  });

  describe('validate - quarterly', () => {
    it('should require quarter status file', () => {
      mockFileExists(['q1.md']);

      const result = validator.validate('quarterly', 1);
      expect(result.valid).toBe(true);
    });

    it('should fail when quarter file not found', () => {
      mockFileExists([]); // nothing exists

      const result = validator.validate('quarterly', 1);
      expect(result.valid).toBe(false);
      expect(result.missingRequired.some(m => m.includes('Q1 Status'))).toBe(true);
    });
  });

  describe('validate - feature', () => {
    it('should require roadmap file', () => {
      mockFileExists(['roadmap.md']);

      const result = validator.validate('feature');
      expect(result.valid).toBe(true);
    });

    it('should fail when roadmap not found', () => {
      mockFileExists([]);

      const result = validator.validate('feature');
      expect(result.valid).toBe(false);
      expect(result.missingRequired.some(m => m.includes('Roadmap'))).toBe(true);
    });
  });

  describe('validate - blocker', () => {
    it('should require blockers and roadmap', () => {
      mockFileExists(['blockers.md', 'roadmap.md']);

      const result = validator.validate('blocker');
      expect(result.valid).toBe(true);
    });

    it('should fail when either is missing', () => {
      mockFileExists(['blockers.md']); // roadmap missing

      const result = validator.validate('blocker');
      expect(result.valid).toBe(false);
    });
  });

  describe('validate - unconfigured path', () => {
    it('should report not configured for empty source path', async () => {
      await configManager.updateSources({ dashboard: '' } as any);
      validator = new PathValidator(app, defaultSettings, configManager);
      mockFileExists(['roadmap.md', 'blockers.md']);

      const result = validator.validate('weekly', 1);
      expect(result.valid).toBe(false);
      expect(result.missingRequired.some(m => m.includes('not configured'))).toBe(true);
    });
  });

  describe('validateAll', () => {
    it('should return results for all 4 report types', () => {
      mockFileExists([]);

      const results = validator.validateAll();
      expect(Object.keys(results)).toEqual(['weekly', 'quarterly', 'feature', 'blocker']);
    });
  });

  describe('hasMinimumConfig', () => {
    it('should return true when basePath is set', () => {
      expect(validator.hasMinimumConfig()).toBe(true);
    });

    it('should return false when nothing is configured', async () => {
      await configManager.updateSources({
        basePath: '',
        dashboard: '',
        roadmap: '',
        blockers: '',
      } as any);
      validator = new PathValidator(app, defaultSettings, configManager);

      expect(validator.hasMinimumConfig()).toBe(false);
    });
  });

  describe('formatResult', () => {
    it('should format valid result', () => {
      mockFileExists(['roadmap.md']);
      const result = validator.validate('feature');
      const formatted = validator.formatResult(result, 'Feature');
      expect(formatted).toContain('All paths valid');
    });

    it('should format missing required', () => {
      mockFileExists([]);
      const result = validator.validate('feature');
      const formatted = validator.formatResult(result, 'Feature');
      expect(formatted).toContain('Missing required');
    });
  });
});
