/**
 * Tests for editor configurator registry
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  EditorRegistry,
  CursorConfigurator,
  ClaudeCodeConfigurator,
  VSCodeConfigurator,
  WindsurfConfigurator,
  QwenConfigurator,
  GeminiConfigurator,
  AntigravityConfigurator,
} from '../../src/configurators/index.js';

describe('EditorRegistry', () => {
  beforeEach(() => {
    EditorRegistry.clear();
  });
  
  afterEach(() => {
    // Re-register defaults for other tests
    EditorRegistry.register(new CursorConfigurator());
    EditorRegistry.register(new ClaudeCodeConfigurator());
    EditorRegistry.register(new VSCodeConfigurator());
    EditorRegistry.register(new WindsurfConfigurator());
    EditorRegistry.register(new QwenConfigurator());
    EditorRegistry.register(new GeminiConfigurator());
    EditorRegistry.register(new AntigravityConfigurator());
  });
  
  describe('register', () => {
    it('registers an editor', () => {
      const cursor = new CursorConfigurator();
      EditorRegistry.register(cursor);
      
      expect(EditorRegistry.get('cursor')).toBe(cursor);
    });
    
    it('replaces existing editor with same id', () => {
      const cursor1 = new CursorConfigurator();
      const cursor2 = new CursorConfigurator();
      
      EditorRegistry.register(cursor1);
      EditorRegistry.register(cursor2);
      
      expect(EditorRegistry.get('cursor')).toBe(cursor2);
    });
  });
  
  describe('unregister', () => {
    it('removes an editor', () => {
      EditorRegistry.register(new CursorConfigurator());
      EditorRegistry.unregister('cursor');
      
      expect(EditorRegistry.get('cursor')).toBeUndefined();
    });
    
    it('handles non-existent id gracefully', () => {
      expect(() => EditorRegistry.unregister('nonexistent')).not.toThrow();
    });
  });
  
  describe('get', () => {
    it('returns undefined for unknown id', () => {
      expect(EditorRegistry.get('unknown')).toBeUndefined();
    });
  });
  
  describe('getAll', () => {
    it('returns all registered editors', () => {
      EditorRegistry.register(new CursorConfigurator());
      EditorRegistry.register(new ClaudeCodeConfigurator());
      
      const all = EditorRegistry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map(e => e.id)).toContain('cursor');
      expect(all.map(e => e.id)).toContain('claude-code');
    });
    
    it('returns empty array when none registered', () => {
      expect(EditorRegistry.getAll()).toHaveLength(0);
    });
  });
  
  describe('getIds', () => {
    it('returns all editor ids', () => {
      EditorRegistry.register(new CursorConfigurator());
      EditorRegistry.register(new VSCodeConfigurator());
      
      const ids = EditorRegistry.getIds();
      expect(ids).toContain('cursor');
      expect(ids).toContain('vscode');
    });
  });
  
  describe('getAvailable', () => {
    let tempDir: string;
    
    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'speclife-registry-test-'));
    });
    
    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });
    
    it('returns editors that are available', async () => {
      // Cursor and Claude Code are always "available"
      EditorRegistry.register(new CursorConfigurator());
      EditorRegistry.register(new ClaudeCodeConfigurator());
      
      const available = await EditorRegistry.getAvailable(tempDir);
      expect(available.length).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('getConfigured', () => {
    let tempDir: string;
    
    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'speclife-registry-test-'));
    });
    
    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });
    
    it('returns editors that are configured', async () => {
      EditorRegistry.register(new CursorConfigurator());
      EditorRegistry.register(new ClaudeCodeConfigurator());
      
      // Create .cursor/commands/speclife to simulate configuration
      await mkdir(join(tempDir, '.cursor', 'commands', 'speclife'), { recursive: true });
      
      const configured = await EditorRegistry.getConfigured(tempDir);
      expect(configured.map(e => e.id)).toContain('cursor');
    });
    
    it('returns empty array when none configured', async () => {
      EditorRegistry.register(new CursorConfigurator());
      
      const configured = await EditorRegistry.getConfigured(tempDir);
      expect(configured).toHaveLength(0);
    });
  });
  
  describe('clear', () => {
    it('removes all editors', () => {
      EditorRegistry.register(new CursorConfigurator());
      EditorRegistry.register(new ClaudeCodeConfigurator());
      
      EditorRegistry.clear();
      
      expect(EditorRegistry.getAll()).toHaveLength(0);
    });
  });
});

describe('CursorConfigurator', () => {
  let tempDir: string;
  let cursor: CursorConfigurator;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speclife-cursor-test-'));
    cursor = new CursorConfigurator();
    
    // Create source commands directory
    await mkdir(join(tempDir, 'openspec', 'commands', 'speclife'), { recursive: true });
    await writeFile(join(tempDir, 'openspec', 'commands', 'speclife', 'start.md'), '# Start');
    await writeFile(join(tempDir, 'openspec', 'commands', 'speclife', 'ship.md'), '# Ship');
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  it('has correct metadata', () => {
    expect(cursor.name).toBe('Cursor');
    expect(cursor.id).toBe('cursor');
    expect(cursor.configDir).toBe('.cursor');
    expect(cursor.supportsDashPrefix).toBe(true);
  });
  
  it('isAvailable returns true', async () => {
    expect(await cursor.isAvailable(tempDir)).toBe(true);
  });
  
  it('isConfigured returns false when not configured', async () => {
    expect(await cursor.isConfigured(tempDir)).toBe(false);
  });
  
  it('configure creates symlinks', async () => {
    const result = await cursor.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(result.success).toBe(true);
    expect(result.filesModified.length).toBeGreaterThan(0);
  });
  
  it('isConfigured returns true after configure', async () => {
    await cursor.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(await cursor.isConfigured(tempDir)).toBe(true);
  });
  
  it('unconfigure removes configuration', async () => {
    await cursor.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    await cursor.unconfigure(tempDir);
    
    expect(await cursor.isConfigured(tempDir)).toBe(false);
  });
  
  it('configure with force overwrites existing', async () => {
    await cursor.configure({ projectPath: tempDir, specDir: 'openspec' });
    const result = await cursor.configure({ projectPath: tempDir, specDir: 'openspec', force: true });
    
    expect(result.success).toBe(true);
    expect(result.filesModified.length).toBeGreaterThan(0);
  });
});

describe('ClaudeCodeConfigurator', () => {
  let tempDir: string;
  let claudeCode: ClaudeCodeConfigurator;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speclife-claude-test-'));
    claudeCode = new ClaudeCodeConfigurator();
    
    // Create source commands directory
    await mkdir(join(tempDir, 'openspec', 'commands', 'speclife'), { recursive: true });
    await writeFile(join(tempDir, 'openspec', 'commands', 'speclife', 'start.md'), '# Start');
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  it('has correct metadata', () => {
    expect(claudeCode.name).toBe('Claude Code');
    expect(claudeCode.id).toBe('claude-code');
    expect(claudeCode.configDir).toBe('.claude');
    expect(claudeCode.supportsDashPrefix).toBe(false);
  });
  
  it('configure creates directory symlink only (no dash prefix)', async () => {
    const result = await claudeCode.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(result.success).toBe(true);
    // Should only create the speclife directory symlink, no dash-prefixed files
    expect(result.filesModified.length).toBe(1);
    expect(result.filesModified[0]).toContain('speclife');
  });
});

describe('VSCodeConfigurator', () => {
  let tempDir: string;
  let vscode: VSCodeConfigurator;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speclife-vscode-test-'));
    vscode = new VSCodeConfigurator();
    
    // Create .vscode directory to simulate VS Code project
    await mkdir(join(tempDir, '.vscode'), { recursive: true });
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  it('has correct metadata', () => {
    expect(vscode.name).toBe('VS Code');
    expect(vscode.id).toBe('vscode');
    expect(vscode.configDir).toBe('.vscode');
    expect(vscode.supportsDashPrefix).toBe(false);
  });
  
  it('isAvailable returns true when .vscode exists', async () => {
    expect(await vscode.isAvailable(tempDir)).toBe(true);
  });
  
  it('configure creates settings.json and tasks.json', async () => {
    const result = await vscode.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(result.success).toBe(true);
    expect(result.filesModified.some(f => f.includes('settings.json'))).toBe(true);
    expect(result.filesModified.some(f => f.includes('tasks.json'))).toBe(true);
  });
  
  it('includes warning about limited slash command support', async () => {
    const result = await vscode.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(result.warnings.some(w => w.includes('limited'))).toBe(true);
  });
});

describe('WindsurfConfigurator', () => {
  let tempDir: string;
  let windsurf: WindsurfConfigurator;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speclife-windsurf-test-'));
    windsurf = new WindsurfConfigurator();
    
    await mkdir(join(tempDir, 'openspec', 'commands', 'speclife'), { recursive: true });
    await writeFile(join(tempDir, 'openspec', 'commands', 'speclife', 'start.md'), '# Start');
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  it('has correct metadata', () => {
    expect(windsurf.name).toBe('Windsurf');
    expect(windsurf.id).toBe('windsurf');
    expect(windsurf.configDir).toBe('.windsurf');
    expect(windsurf.supportsDashPrefix).toBe(true);
  });
  
  it('configure creates symlinks', async () => {
    const result = await windsurf.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(result.success).toBe(true);
    expect(result.filesModified.length).toBeGreaterThan(0);
  });
});

describe('QwenConfigurator', () => {
  let tempDir: string;
  let qwen: QwenConfigurator;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speclife-qwen-test-'));
    qwen = new QwenConfigurator();
    
    // Create source commands directory
    await mkdir(join(tempDir, 'openspec', 'commands', 'speclife'), { recursive: true });
    await writeFile(join(tempDir, 'openspec', 'commands', 'speclife', 'start.md'), '# Start');
    await writeFile(join(tempDir, 'openspec', 'commands', 'speclife', 'ship.md'), '# Ship');
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  it('has correct metadata', () => {
    expect(qwen.name).toBe('Qwen Code');
    expect(qwen.id).toBe('qwen');
    expect(qwen.configDir).toBe('.qwen');
    expect(qwen.supportsDashPrefix).toBe(true);
  });
  
  it('isAvailable returns true', async () => {
    expect(await qwen.isAvailable(tempDir)).toBe(true);
  });
  
  it('isConfigured returns false when not configured', async () => {
    expect(await qwen.isConfigured(tempDir)).toBe(false);
  });
  
  it('configure creates symlinks including dash-prefixed', async () => {
    const result = await qwen.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(result.success).toBe(true);
    expect(result.filesModified.length).toBeGreaterThan(1); // Directory + dash-prefixed files
  });
  
  it('isConfigured returns true after configure', async () => {
    await qwen.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(await qwen.isConfigured(tempDir)).toBe(true);
  });
  
  it('unconfigure removes configuration', async () => {
    await qwen.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    await qwen.unconfigure(tempDir);
    
    expect(await qwen.isConfigured(tempDir)).toBe(false);
  });
});

describe('GeminiConfigurator', () => {
  let tempDir: string;
  let gemini: GeminiConfigurator;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speclife-gemini-test-'));
    gemini = new GeminiConfigurator();
    
    // Create source commands directory
    await mkdir(join(tempDir, 'openspec', 'commands', 'speclife'), { recursive: true });
    await writeFile(join(tempDir, 'openspec', 'commands', 'speclife', 'start.md'), '# Start');
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  it('has correct metadata', () => {
    expect(gemini.name).toBe('Gemini CLI');
    expect(gemini.id).toBe('gemini');
    expect(gemini.configDir).toBe('.gemini');
    expect(gemini.supportsDashPrefix).toBe(false);
  });
  
  it('isAvailable returns true', async () => {
    expect(await gemini.isAvailable(tempDir)).toBe(true);
  });
  
  it('configure creates directory symlink only (no dash prefix)', async () => {
    const result = await gemini.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(result.success).toBe(true);
    // Should only create the speclife directory symlink, no dash-prefixed files
    expect(result.filesModified.length).toBe(1);
    expect(result.filesModified[0]).toContain('speclife');
  });
  
  it('isConfigured returns true after configure', async () => {
    await gemini.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(await gemini.isConfigured(tempDir)).toBe(true);
  });
  
  it('unconfigure removes configuration', async () => {
    await gemini.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    await gemini.unconfigure(tempDir);
    
    expect(await gemini.isConfigured(tempDir)).toBe(false);
  });
});

describe('AntigravityConfigurator', () => {
  let tempDir: string;
  let antigravity: AntigravityConfigurator;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speclife-antigravity-test-'));
    antigravity = new AntigravityConfigurator();
    
    // Create source commands directory
    await mkdir(join(tempDir, 'openspec', 'commands', 'speclife'), { recursive: true });
    await writeFile(join(tempDir, 'openspec', 'commands', 'speclife', 'start.md'), '# Start');
    await writeFile(join(tempDir, 'openspec', 'commands', 'speclife', 'ship.md'), '# Ship');
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  it('has correct metadata', () => {
    expect(antigravity.name).toBe('Antigravity');
    expect(antigravity.id).toBe('antigravity');
    expect(antigravity.configDir).toBe('.agent');
    expect(antigravity.supportsDashPrefix).toBe(false);
  });
  
  it('isAvailable returns true', async () => {
    expect(await antigravity.isAvailable(tempDir)).toBe(true);
  });
  
  it('isConfigured returns false when not configured', async () => {
    expect(await antigravity.isConfigured(tempDir)).toBe(false);
  });
  
  it('creates flat dash-prefixed files in workflows directory', async () => {
    const result = await antigravity.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(result.success).toBe(true);
    // Should create speclife-start.md and speclife-ship.md
    expect(result.filesModified.length).toBe(2);
    expect(result.filesModified.some(f => f.includes('speclife-start.md'))).toBe(true);
    expect(result.filesModified.some(f => f.includes('speclife-ship.md'))).toBe(true);
    expect(result.filesModified.every(f => f.includes('workflows'))).toBe(true);
  });
  
  it('isConfigured checks for speclife-*.md files in workflows', async () => {
    // Create a speclife-*.md file manually
    await mkdir(join(tempDir, '.agent', 'workflows'), { recursive: true });
    await writeFile(join(tempDir, '.agent', 'workflows', 'speclife-start.md'), '# Start');
    
    expect(await antigravity.isConfigured(tempDir)).toBe(true);
  });
  
  it('isConfigured returns true after configure', async () => {
    await antigravity.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    expect(await antigravity.isConfigured(tempDir)).toBe(true);
  });
  
  it('unconfigure removes configuration', async () => {
    await antigravity.configure({
      projectPath: tempDir,
      specDir: 'openspec',
    });
    
    await antigravity.unconfigure(tempDir);
    
    expect(await antigravity.isConfigured(tempDir)).toBe(false);
  });
  
  it('getDetectionPaths returns agent directory', () => {
    const paths = antigravity.getDetectionPaths();
    expect(paths).toContain('.agent');
  });
  
  it('configure with force overwrites existing', async () => {
    await antigravity.configure({ projectPath: tempDir, specDir: 'openspec' });
    const result = await antigravity.configure({ projectPath: tempDir, specDir: 'openspec', force: true });
    
    expect(result.success).toBe(true);
    expect(result.filesModified.length).toBe(2);
  });
});
