/**
 * Unit tests for ConfigManager
 */

import { App, Plugin } from 'obsidian';
import { ConfigManager } from '../src/services/ConfigManager';
import { CONFIG_VERSION } from '../src/types/config';
import { getPreset } from '../src/config/presets';

jest.mock('../src/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('ConfigManager', () => {
  let plugin: Plugin;
  let manager: ConfigManager;

  beforeEach(() => {
    const app = new App();
    plugin = new Plugin(app, { id: 'test', name: 'Test', version: '4.0.0' });
    manager = new ConfigManager(plugin);
  });

  describe('initialize', () => {
    it('should use default preset on first run (null data)', async () => {
      jest.spyOn(plugin, 'loadData').mockResolvedValue(null);
      jest.spyOn(plugin, 'saveData').mockResolvedValue();

      await manager.initialize();

      expect(manager.isFirstRun).toBe(true);
      expect(manager.get().version).toBe(CONFIG_VERSION);
      expect(manager.getScanMode()).toBe('folder');
    });

    it('should migrate v1 settings', async () => {
      const v1Data = {
        sourceMappings: {
          basePath: '/old/base',
          dashboard: 'dash.md',
          outputDir: 'output/',
        },
        reports: { weekly: { enabled: true, filename: 'weekly.xlsx' } },
      };
      jest.spyOn(plugin, 'loadData').mockResolvedValue(v1Data);
      jest.spyOn(plugin, 'saveData').mockResolvedValue();

      await manager.initialize();

      expect(manager.isFirstRun).toBe(false);
      expect(manager.get().version).toBe(CONFIG_VERSION);
      expect(manager.getSources().basePath).toBe('/old/base');
      expect(manager.getSources().dashboard).toBe('dash.md');
      expect(manager.getScanMode()).toBe('files'); // existing user
    });

    it('should upgrade older v2 config', async () => {
      const v2Config = {
        ...getPreset('korean-default'),
        version: '2.0',
        locale: 'ko',
      };
      jest.spyOn(plugin, 'loadData').mockResolvedValue(v2Config);
      jest.spyOn(plugin, 'saveData').mockResolvedValue();

      await manager.initialize();

      expect(manager.get().version).toBe(CONFIG_VERSION);
      expect(manager.get().sources.taskMasters).toBeDefined();
    });

    it('should load valid v4 config directly', async () => {
      const v4Config = getPreset('english-default');
      v4Config.version = CONFIG_VERSION;
      v4Config.scanMode = 'folder';
      v4Config.scanFolders = ['docs/'];
      jest.spyOn(plugin, 'loadData').mockResolvedValue(v4Config);
      jest.spyOn(plugin, 'saveData').mockResolvedValue();

      await manager.initialize();

      expect(manager.get().version).toBe(CONFIG_VERSION);
      expect(manager.getLocale()).toBe('en');
      expect(manager.getScanMode()).toBe('folder');
    });

    it('should be idempotent (second call is no-op)', async () => {
      jest.spyOn(plugin, 'loadData').mockResolvedValue(null);
      const saveSpy = jest.spyOn(plugin, 'saveData').mockResolvedValue();

      await manager.initialize();
      await manager.initialize();

      // saveData called only once (from first initialize)
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getters', () => {
    beforeEach(async () => {
      jest.spyOn(plugin, 'loadData').mockResolvedValue(null);
      jest.spyOn(plugin, 'saveData').mockResolvedValue();
      await manager.initialize();
    });

    it('should return config sections', () => {
      expect(manager.get()).toBeDefined();
      expect(manager.getLocale()).toBeDefined();
      expect(manager.getLocaleStrings()).toBeDefined();
      expect(manager.getParsing()).toBeDefined();
      expect(manager.getReports()).toBeDefined();
      expect(manager.getStyle()).toBeDefined();
      expect(manager.getSources()).toBeDefined();
      expect(manager.getAdvanced()).toBeDefined();
    });

    it('should return raw data', () => {
      expect(manager.getRawData()).toBeNull(); // first run = null loadData
    });

    it('should return output config', () => {
      // Default preset may or may not have output
      const output = manager.getOutputConfig();
      expect(output === null || typeof output === 'object').toBe(true);
    });

    it('should return scan folders', () => {
      expect(Array.isArray(manager.getScanFolders())).toBe(true);
    });
  });

  describe('setLocale', () => {
    beforeEach(async () => {
      jest.spyOn(plugin, 'loadData').mockResolvedValue(null);
      jest.spyOn(plugin, 'saveData').mockResolvedValue();
      await manager.initialize();
    });

    it('should change locale and apply preset strings', async () => {
      await manager.setLocale('ko');

      expect(manager.getLocale()).toBe('ko');
      const koreanPreset = getPreset('ko');
      expect(manager.getLocaleStrings().reports.weekly).toBe(koreanPreset.localeStrings.reports.weekly);
    });

    it('should skip preset strings for custom locale', async () => {
      const originalStrings = { ...manager.getLocaleStrings() };
      await manager.setLocale('custom');

      expect(manager.getLocale()).toBe('custom');
      // Strings should remain from previous preset (not overwritten)
      expect(manager.getLocaleStrings().reports).toEqual(originalStrings.reports);
    });
  });

  describe('update methods', () => {
    let saveSpy: jest.SpyInstance;

    beforeEach(async () => {
      jest.spyOn(plugin, 'loadData').mockResolvedValue(null);
      saveSpy = jest.spyOn(plugin, 'saveData').mockResolvedValue();
      await manager.initialize();
      saveSpy.mockClear();
    });

    it('should update parsing config', async () => {
      await manager.updateParsing({ task: { priorityIndicators: ['HIGH'] } as any });
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('should update reports config', async () => {
      await manager.updateReports({ weekly: { enabled: false } as any });
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('should update style config', async () => {
      await manager.updateStyle({ colors: { headerBackground: '#FF0000' } as any });
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('should update sources', async () => {
      await manager.updateSources({ basePath: '/new/path' } as any);
      expect(manager.getSources().basePath).toBe('/new/path');
    });

    it('should update advanced settings', async () => {
      await manager.updateAdvanced({ debugLogging: true });
      expect(manager.getAdvanced().debugLogging).toBe(true);
    });

    it('should update scan config', async () => {
      await manager.updateScanConfig('folder', ['src/', 'docs/']);
      expect(manager.getScanMode()).toBe('folder');
      expect(manager.getScanFolders()).toEqual(['src/', 'docs/']);
    });
  });

  describe('applyPreset', () => {
    beforeEach(async () => {
      jest.spyOn(plugin, 'loadData').mockResolvedValue(null);
      jest.spyOn(plugin, 'saveData').mockResolvedValue();
      await manager.initialize();
    });

    it('should apply preset while preserving sources', async () => {
      await manager.updateSources({ basePath: '/my/project' } as any);
      await manager.applyPreset('korean-default');

      expect(manager.getLocale()).toBe('ko');
      expect(manager.getSources().basePath).toBe('/my/project');
    });

    it('should preserve debug settings', async () => {
      await manager.updateAdvanced({ debugLogging: true });
      await manager.applyPreset('english-default');

      expect(manager.getAdvanced().debugLogging).toBe(true);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset to universal-default preset', async () => {
      jest.spyOn(plugin, 'loadData').mockResolvedValue(null);
      jest.spyOn(plugin, 'saveData').mockResolvedValue();
      await manager.initialize();

      await manager.setLocale('ko');
      await manager.resetToDefaults();

      const defaultPreset = getPreset('universal-default');
      expect(manager.getLocaleStrings().reports.weekly).toBe(defaultPreset.localeStrings.reports.weekly);
    });
  });

  describe('observer pattern', () => {
    let saveSpy: jest.SpyInstance;

    beforeEach(async () => {
      jest.spyOn(plugin, 'loadData').mockResolvedValue(null);
      saveSpy = jest.spyOn(plugin, 'saveData').mockResolvedValue();
      await manager.initialize();
    });

    it('should notify listeners on save', async () => {
      const listener = jest.fn();
      manager.subscribe(listener);

      await manager.updateAdvanced({ debugLogging: true });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ version: CONFIG_VERSION }));
    });

    it('should unsubscribe properly', async () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();
      await manager.updateAdvanced({ debugLogging: true });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should isolate listener errors', async () => {
      const badListener = jest.fn(() => { throw new Error('listener crash'); });
      const goodListener = jest.fn();

      manager.subscribe(badListener);
      manager.subscribe(goodListener);

      await manager.updateAdvanced({ debugLogging: true });

      expect(badListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('reload', () => {
    it('should reload config from disk', async () => {
      const initialConfig = getPreset('universal-default');
      initialConfig.version = CONFIG_VERSION;
      initialConfig.scanMode = 'folder';
      initialConfig.scanFolders = [];
      jest.spyOn(plugin, 'loadData').mockResolvedValue(initialConfig);
      jest.spyOn(plugin, 'saveData').mockResolvedValue();
      await manager.initialize();

      const updatedConfig = { ...initialConfig, locale: 'ko' as const };
      jest.spyOn(plugin, 'loadData').mockResolvedValue(updatedConfig);

      await manager.reload();
      expect(manager.getLocale()).toBe('ko');
    });
  });

  describe('export/import', () => {
    beforeEach(async () => {
      jest.spyOn(plugin, 'loadData').mockResolvedValue(null);
      jest.spyOn(plugin, 'saveData').mockResolvedValue();
      await manager.initialize();
    });

    it('should export config as JSON', () => {
      const json = manager.exportConfig();
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe(CONFIG_VERSION);
    });

    it('should import valid config', async () => {
      const config = getPreset('korean-default');
      config.version = CONFIG_VERSION;
      const json = JSON.stringify(config);

      await manager.importConfig(json);
      expect(manager.getLocale()).toBe('ko');
    });

    it('should throw on invalid JSON', async () => {
      await expect(manager.importConfig('not-json')).rejects.toThrow('Invalid JSON');
    });

    it('should throw on invalid config structure', async () => {
      await expect(manager.importConfig('{}')).rejects.toThrow('Invalid configuration');
    });
  });
});
