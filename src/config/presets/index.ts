/**
 * Preset Loader
 * Manages language presets for the plugin configuration
 * v2.0 - Added Japanese and Minimal presets
 */

import { PluginConfig, LocaleCode, LocaleStrings } from '../../types/config';
import koreanDefault from './korean-default.json';
import englishDefault from './english-default.json';
import japaneseDefault from './japanese-default.json';
import minimal from './minimal.json';
import universalDefault from './universal-default.json';

export type PresetName = 'korean-default' | 'english-default' | 'japanese-default' | 'minimal' | 'universal-default';

const presets: Record<PresetName, PluginConfig> = {
  'korean-default': koreanDefault as unknown as PluginConfig,
  'english-default': englishDefault as unknown as PluginConfig,
  'japanese-default': japaneseDefault as unknown as PluginConfig,
  'minimal': minimal as unknown as PluginConfig,
  'universal-default': universalDefault as unknown as PluginConfig,
};

// Cache serialized JSON strings for presets (presets are immutable)
const presetJsonCache = new Map<PresetName, string>();

/**
 * Get a preset configuration by name
 * Returns a deep copy to prevent mutation (cached serialization)
 */
export function getPreset(name: PresetName | LocaleCode | string): PluginConfig {
  // Map locale codes to preset names
  const localeToPreset: Record<string, PresetName> = {
    'ko': 'korean-default',
    'en': 'english-default',
    'ja': 'japanese-default',
    'universal': 'universal-default',
    'custom': 'minimal',
    'korean-default': 'korean-default',
    'english-default': 'english-default',
    'japanese-default': 'japanese-default',
    'minimal': 'minimal',
    'universal-default': 'universal-default',
  };

  const presetName = (localeToPreset[name] || 'universal-default') as PresetName;
  let json = presetJsonCache.get(presetName);
  if (!json) {
    json = JSON.stringify(presets[presetName]);
    presetJsonCache.set(presetName, json);
  }

  return JSON.parse(json);
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
    'universal-default': 'Universal (Default)',
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
  return 'universal-default';
}

/**
 * Get default locale strings (English)
 * Shared fallback for all report generators when no ConfigManager is provided
 */
export function getDefaultLocaleStrings(): LocaleStrings {
  const preset = getPreset('english-default');
  return preset.localeStrings;
}
