/**
 * Preset Loader
 * Manages language presets for the plugin configuration
 * v2.0 - Added Japanese and Minimal presets
 */

import { PluginConfig, LocaleCode } from '../../types/config';
import koreanDefault from './korean-default.json';
import englishDefault from './english-default.json';
import japaneseDefault from './japanese-default.json';
import minimal from './minimal.json';

export type PresetName = 'korean-default' | 'english-default' | 'japanese-default' | 'minimal';

const presets: Record<PresetName, PluginConfig> = {
  'korean-default': koreanDefault as unknown as PluginConfig,
  'english-default': englishDefault as unknown as PluginConfig,
  'japanese-default': japaneseDefault as unknown as PluginConfig,
  'minimal': minimal as unknown as PluginConfig,
};

/**
 * Get a preset configuration by name
 * Returns a deep copy to prevent mutation
 */
export function getPreset(name: PresetName | LocaleCode | string): PluginConfig {
  // Map locale codes to preset names
  const localeToPreset: Record<string, PresetName> = {
    'ko': 'korean-default',
    'en': 'english-default',
    'ja': 'japanese-default',
    'custom': 'minimal',
    'korean-default': 'korean-default',
    'english-default': 'english-default',
    'japanese-default': 'japanese-default',
    'minimal': 'minimal',
  };

  const presetName = localeToPreset[name] || 'korean-default';
  const preset = presets[presetName as PresetName];

  // Return a deep copy to prevent mutation
  return JSON.parse(JSON.stringify(preset));
}

/**
 * Get all available preset names
 */
export function getPresetNames(): PresetName[] {
  return Object.keys(presets) as PresetName[];
}

/**
 * Get preset display names for UI
 */
export function getPresetDisplayNames(): Record<PresetName, string> {
  return {
    'korean-default': '한국어 (Korean)',
    'english-default': 'English',
    'japanese-default': '日本語 (Japanese)',
    'minimal': 'Minimal',
  };
}

/**
 * Check if a preset name is valid
 */
export function isValidPreset(name: string): name is PresetName {
  return name in presets;
}

/**
 * Get the default preset name
 */
export function getDefaultPresetName(): PresetName {
  return 'korean-default';
}
