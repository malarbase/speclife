/**
 * Tests for global configuration system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// We need to mock the home directory for testing
const originalHome = process.env.HOME;
const originalXdgConfig = process.env.XDG_CONFIG_HOME;

describe('GlobalConfig', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speclife-config-test-'));
    process.env.XDG_CONFIG_HOME = tempDir;
    // Clear module cache to pick up new env
    vi.resetModules();
  });
  
  afterEach(async () => {
    process.env.HOME = originalHome;
    process.env.XDG_CONFIG_HOME = originalXdgConfig;
    await rm(tempDir, { recursive: true, force: true });
  });
  
  describe('getGlobalConfigDir', () => {
    it('uses XDG_CONFIG_HOME when set', async () => {
      const { getGlobalConfigDir } = await import('../src/global-config.js');
      const dir = getGlobalConfigDir();
      expect(dir).toBe(join(tempDir, 'speclife'));
    });
    
    it('falls back to ~/.config on Unix without XDG', async () => {
      delete process.env.XDG_CONFIG_HOME;
      process.env.HOME = tempDir;
      vi.resetModules();
      const { getGlobalConfigDir } = await import('../src/global-config.js');
      const dir = getGlobalConfigDir();
      expect(dir).toBe(join(tempDir, '.config', 'speclife'));
    });
  });
  
  describe('getGlobalConfigPath', () => {
    it('returns path to config.yaml', async () => {
      const { getGlobalConfigPath } = await import('../src/global-config.js');
      const path = getGlobalConfigPath();
      expect(path).toBe(join(tempDir, 'speclife', 'config.yaml'));
    });
  });
  
  describe('getGlobalConfig', () => {
    it('returns defaults when no config exists', async () => {
      const { getGlobalConfig } = await import('../src/global-config.js');
      const config = await getGlobalConfig();
      
      expect(config.aiProvider).toBe('claude');
      expect(config.aiModel).toBe('claude-sonnet-4-20250514');
      expect(config.preferences?.colors).toBe(true);
      expect(config.preferences?.spinners).toBe(true);
    });
    
    it('merges user config with defaults', async () => {
      const { getGlobalConfig, saveGlobalConfig } = await import('../src/global-config.js');
      
      await saveGlobalConfig({ aiProvider: 'openai' });
      const config = await getGlobalConfig();
      
      expect(config.aiProvider).toBe('openai');
      // Defaults should still be present
      expect(config.aiModel).toBe('claude-sonnet-4-20250514');
      expect(config.preferences?.colors).toBe(true);
    });
  });
  
  describe('saveGlobalConfig', () => {
    it('creates config directory if not exists', async () => {
      const { saveGlobalConfig, getGlobalConfigPath } = await import('../src/global-config.js');
      
      await saveGlobalConfig({ aiProvider: 'gemini' });
      
      const content = await readFile(getGlobalConfigPath(), 'utf-8');
      expect(content).toContain('aiProvider: gemini');
    });
    
    it('preserves existing values', async () => {
      const { saveGlobalConfig, getGlobalConfig } = await import('../src/global-config.js');
      
      await saveGlobalConfig({ aiProvider: 'openai' });
      await saveGlobalConfig({ aiModel: 'gpt-4' });
      
      const config = await getGlobalConfig();
      expect(config.aiProvider).toBe('openai');
      expect(config.aiModel).toBe('gpt-4');
    });
  });
  
  describe('getGlobalConfigValue', () => {
    it('gets top-level value', async () => {
      const { getGlobalConfigValue, saveGlobalConfig } = await import('../src/global-config.js');
      
      await saveGlobalConfig({ aiProvider: 'openai' });
      const value = await getGlobalConfigValue('aiProvider');
      
      expect(value).toBe('openai');
    });
    
    it('gets nested value', async () => {
      const { getGlobalConfigValue, saveGlobalConfig } = await import('../src/global-config.js');
      
      await saveGlobalConfig({ preferences: { colors: false } });
      const value = await getGlobalConfigValue('preferences.colors');
      
      expect(value).toBe(false);
    });
    
    it('returns undefined for missing key', async () => {
      const { getGlobalConfigValue } = await import('../src/global-config.js');
      
      const value = await getGlobalConfigValue('nonexistent.key');
      expect(value).toBeUndefined();
    });
  });
  
  describe('setGlobalConfigValue', () => {
    it('sets top-level value', async () => {
      const { setGlobalConfigValue, getGlobalConfigValue } = await import('../src/global-config.js');
      
      await setGlobalConfigValue('aiProvider', 'gemini');
      const value = await getGlobalConfigValue('aiProvider');
      
      expect(value).toBe('gemini');
    });
    
    it('sets nested value', async () => {
      const { setGlobalConfigValue, getGlobalConfigValue } = await import('../src/global-config.js');
      
      await setGlobalConfigValue('preferences.spinners', false);
      const value = await getGlobalConfigValue('preferences.spinners');
      
      expect(value).toBe(false);
    });
    
    it('creates intermediate objects', async () => {
      const { setGlobalConfigValue, getGlobalConfig } = await import('../src/global-config.js');
      
      await setGlobalConfigValue('custom.nested.value', 'test');
      const config = await getGlobalConfig();
      
      expect((config as any).custom?.nested?.value).toBe('test');
    });
  });
  
  describe('unsetGlobalConfigValue', () => {
    it('removes a value from config file', async () => {
      const { setGlobalConfigValue, unsetGlobalConfigValue, getGlobalConfigPath } = await import('../src/global-config.js');
      
      await setGlobalConfigValue('defaultEditor', 'cursor');
      await unsetGlobalConfigValue('defaultEditor');
      
      // Check the raw file content - the key should not be present
      const content = await readFile(getGlobalConfigPath(), 'utf-8');
      expect(content).not.toContain('defaultEditor: cursor');
    });
    
    it('handles missing keys gracefully', async () => {
      const { unsetGlobalConfigValue } = await import('../src/global-config.js');
      
      // Should not throw
      await expect(unsetGlobalConfigValue('nonexistent.key')).resolves.toBeUndefined();
    });
  });
  
  describe('resetGlobalConfig', () => {
    it('resets to defaults', async () => {
      const { setGlobalConfigValue, resetGlobalConfig, getGlobalConfig } = await import('../src/global-config.js');
      
      await setGlobalConfigValue('aiProvider', 'openai');
      await setGlobalConfigValue('preferences.colors', false);
      
      await resetGlobalConfig();
      
      const config = await getGlobalConfig();
      expect(config.aiProvider).toBe('claude');
      expect(config.preferences?.colors).toBe(true);
    });
  });
  
  describe('listGlobalConfig', () => {
    it('returns flat map of all values', async () => {
      const { listGlobalConfig } = await import('../src/global-config.js');
      
      const entries = await listGlobalConfig();
      
      expect(entries.get('aiProvider')).toBe('claude');
      expect(entries.get('preferences.colors')).toBe(true);
      expect(entries.get('preferences.spinners')).toBe(true);
    });
  });
  
  describe('globalConfigExists', () => {
    it('returns false when no config', async () => {
      const { globalConfigExists } = await import('../src/global-config.js');
      expect(globalConfigExists()).toBe(false);
    });
    
    it('returns true after saving', async () => {
      const { globalConfigExists, saveGlobalConfig } = await import('../src/global-config.js');
      
      await saveGlobalConfig({ aiProvider: 'claude' });
      expect(globalConfigExists()).toBe(true);
    });
  });
});

