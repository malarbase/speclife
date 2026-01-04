/**
 * Global configuration management
 * XDG-compliant configuration storage for cross-platform support
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

/** Global configuration schema */
export interface GlobalConfig {
  /** Default AI provider (claude, openai, gemini) */
  aiProvider?: 'claude' | 'openai' | 'gemini';
  /** Default AI model identifier */
  aiModel?: string;
  /** Default editor for init */
  defaultEditor?: string;
  /** User preferences */
  preferences?: {
    /** Show colors in output (default: true) */
    colors?: boolean;
    /** Show progress spinners (default: true) */
    spinners?: boolean;
    /** Default output format for commands (default: 'text') */
    outputFormat?: 'text' | 'json';
  };
}

/** Default global config values */
const defaultGlobalConfig: GlobalConfig = {
  aiProvider: 'claude',
  aiModel: 'claude-sonnet-4-20250514',
  preferences: {
    colors: true,
    spinners: true,
    outputFormat: 'text',
  },
};

/**
 * Get the XDG-compliant config directory for SpecLife
 * @returns Path to the global config directory
 */
export function getGlobalConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  
  if (xdgConfigHome) {
    return join(xdgConfigHome, 'speclife');
  }
  
  // Windows uses APPDATA
  if (platform() === 'win32') {
    const appData = process.env.APPDATA;
    if (appData) {
      return join(appData, 'speclife');
    }
    return join(homedir(), 'AppData', 'Roaming', 'speclife');
  }
  
  // macOS and Linux follow XDG spec default
  return join(homedir(), '.config', 'speclife');
}

/**
 * Get the path to the global config file
 * @returns Path to config.yaml
 */
export function getGlobalConfigPath(): string {
  return join(getGlobalConfigDir(), 'config.yaml');
}

/**
 * Check if global config exists
 * @returns true if config file exists
 */
export function globalConfigExists(): boolean {
  return existsSync(getGlobalConfigPath());
}

/**
 * Load the global configuration
 * Returns defaults merged with user settings
 * @returns Global config object
 */
export async function getGlobalConfig(): Promise<GlobalConfig> {
  const configPath = getGlobalConfigPath();
  
  try {
    const content = await readFile(configPath, 'utf-8');
    const userConfig = parseYaml(content) as GlobalConfig;
    
    // Deep merge with defaults
    return {
      ...defaultGlobalConfig,
      ...userConfig,
      preferences: {
        ...defaultGlobalConfig.preferences,
        ...userConfig?.preferences,
      },
    };
  } catch {
    // Return defaults if file doesn't exist or is invalid
    return { ...defaultGlobalConfig };
  }
}

/**
 * Save the global configuration
 * @param config Config to save (will be merged with existing)
 */
export async function saveGlobalConfig(config: Partial<GlobalConfig>): Promise<void> {
  const configDir = getGlobalConfigDir();
  const configPath = getGlobalConfigPath();
  
  // Ensure directory exists
  await mkdir(configDir, { recursive: true });
  
  // Load existing config and merge
  const existing = await getGlobalConfig();
  const merged: GlobalConfig = {
    ...existing,
    ...config,
    preferences: {
      ...existing.preferences,
      ...config.preferences,
    },
  };
  
  // Write YAML with comments
  const content = `# SpecLife Global Configuration
# This file stores user preferences that apply to all projects.
# Project-specific settings in .specliferc.yaml override these.

${stringifyYaml(merged)}`;
  
  await writeFile(configPath, content, 'utf-8');
}

/**
 * Get a specific config value
 * @param key Config key path (e.g., 'aiProvider' or 'preferences.colors')
 * @returns Config value or undefined
 */
export async function getGlobalConfigValue<T = unknown>(key: string): Promise<T | undefined> {
  const config = await getGlobalConfig();
  const parts = key.split('.');
  
  let value: unknown = config;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  
  return value as T;
}

/**
 * Set a specific config value
 * @param key Config key path (e.g., 'aiProvider' or 'preferences.colors')
 * @param value Value to set
 */
export async function setGlobalConfigValue(key: string, value: unknown): Promise<void> {
  const config = await getGlobalConfig();
  const parts = key.split('.');
  
  // Navigate to the right level and set value
  let target: Record<string, unknown> = config as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in target) || typeof target[part] !== 'object') {
      target[part] = {};
    }
    target = target[part] as Record<string, unknown>;
  }
  
  const lastPart = parts[parts.length - 1];
  target[lastPart] = value;
  
  await saveGlobalConfig(config);
}

/**
 * Unset a specific config value (remove from file)
 * @param key Config key path
 */
export async function unsetGlobalConfigValue(key: string): Promise<void> {
  const configPath = getGlobalConfigPath();
  const configDir = getGlobalConfigDir();
  
  // Read raw user config (not merged with defaults)
  let userConfig: Record<string, unknown> = {};
  try {
    const content = await readFile(configPath, 'utf-8');
    userConfig = (parseYaml(content) as Record<string, unknown>) ?? {};
  } catch {
    // File doesn't exist, nothing to unset
    return;
  }
  
  const parts = key.split('.');
  
  // Navigate to the right level and delete
  let target = userConfig;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in target) || typeof target[part] !== 'object') {
      return; // Key path doesn't exist
    }
    target = target[part] as Record<string, unknown>;
  }
  
  const lastPart = parts[parts.length - 1];
  delete target[lastPart];
  
  // Ensure directory exists and write directly (don't merge)
  await mkdir(configDir, { recursive: true });
  const content = `# SpecLife Global Configuration
# This file stores user preferences that apply to all projects.
# Project-specific settings in .specliferc.yaml override these.

${stringifyYaml(userConfig)}`;
  
  await writeFile(configPath, content, 'utf-8');
}

/**
 * Reset global config to defaults
 */
export async function resetGlobalConfig(): Promise<void> {
  await saveGlobalConfig(defaultGlobalConfig);
}

/**
 * List all config keys and values
 * @param config Config object (defaults to current global config)
 * @returns Flat map of key paths to values
 */
export async function listGlobalConfig(
  config?: GlobalConfig
): Promise<Map<string, unknown>> {
  const cfg = config ?? await getGlobalConfig();
  const result = new Map<string, unknown>();
  
  function flatten(obj: Record<string, unknown>, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value as Record<string, unknown>, path);
      } else {
        result.set(path, value);
      }
    }
  }
  
  flatten(cfg as unknown as Record<string, unknown>);
  return result;
}

