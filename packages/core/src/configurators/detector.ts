/**
 * Editor detection utilities
 * Auto-detect which editors are installed and configured
 */

import { access } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { EditorRegistry } from './registry.js';
import type { EditorConfigurator } from './base.js';

/** Detection result for a single editor */
export interface EditorDetectionResult {
  /** Editor configurator */
  editor: EditorConfigurator;
  /** Whether the editor appears to be installed */
  installed: boolean;
  /** Whether SpecLife is configured for this editor */
  configured: boolean;
  /** Detection method used */
  detectionMethod: 'config-dir' | 'cli' | 'process';
}

/**
 * Detect all editors that appear to be installed/available
 * @param projectPath Project root path
 * @returns Array of detection results for available editors
 */
export async function detectEditors(projectPath: string): Promise<EditorDetectionResult[]> {
  const results: EditorDetectionResult[] = [];
  const editors = EditorRegistry.getAll();
  
  for (const editor of editors) {
    const result = await detectEditor(editor, projectPath);
    results.push(result);
  }
  
  return results;
}

/**
 * Detect a single editor
 * @param editor Editor configurator to check
 * @param projectPath Project root path
 * @returns Detection result
 */
async function detectEditor(
  editor: EditorConfigurator,
  projectPath: string
): Promise<EditorDetectionResult> {
  let installed = false;
  let detectionMethod: EditorDetectionResult['detectionMethod'] = 'config-dir';
  
  // Method 1: Check for config directory in project
  const configDir = join(projectPath, editor.configDir);
  try {
    await access(configDir);
    installed = true;
    detectionMethod = 'config-dir';
  } catch {
    // Config dir doesn't exist, try other methods
  }
  
  // Method 2: Check for CLI if not detected yet
  if (!installed) {
    installed = await checkEditorCLI(editor.id);
    if (installed) {
      detectionMethod = 'cli';
    }
  }
  
  // Check if configured
  const configured = await editor.isConfigured(projectPath);
  
  return {
    editor,
    installed,
    configured,
    detectionMethod,
  };
}

/**
 * Check if editor CLI is available in PATH
 * @param editorId Editor identifier
 * @returns true if CLI found
 */
function checkEditorCLI(editorId: string): Promise<boolean> {
  const cliCommands: Record<string, string[]> = {
    cursor: ['cursor'],
    'claude-code': ['claude'],
    vscode: ['code'],
    windsurf: ['windsurf'],
  };
  
  const commands = cliCommands[editorId] ?? [];
  
  for (const cmd of commands) {
    try {
      // Check if command exists using 'which' on Unix or 'where' on Windows
      const checkCmd = process.platform === 'win32' ? 'where' : 'which';
      execSync(`${checkCmd} ${cmd}`, { stdio: 'ignore' });
      return Promise.resolve(true);
    } catch {
      // Command not found
    }
  }
  
  return Promise.resolve(false);
}

/**
 * Get editors sorted by likely preference
 * Detected editors first, then alphabetical
 * @param results Detection results
 * @returns Sorted results
 */
export function sortByPreference(results: EditorDetectionResult[]): EditorDetectionResult[] {
  return [...results].sort((a, b) => {
    // Installed editors first
    if (a.installed && !b.installed) return -1;
    if (!a.installed && b.installed) return 1;
    
    // Among installed, configured first
    if (a.configured && !b.configured) return -1;
    if (!a.configured && b.configured) return 1;
    
    // Alphabetical by name
    return a.editor.name.localeCompare(b.editor.name);
  });
}

/**
 * Get a summary of detected editors for display
 * @param results Detection results
 * @returns Human-readable summary
 */
export function formatDetectionSummary(results: EditorDetectionResult[]): string {
  const lines: string[] = [];
  
  const installed = results.filter(r => r.installed);
  const configured = results.filter(r => r.configured);
  
  if (installed.length === 0) {
    lines.push('No editors detected. You can still configure any supported editor.');
  } else {
    lines.push(`Detected ${installed.length} editor(s):`);
    for (const result of installed) {
      const status = result.configured ? ' (configured)' : '';
      lines.push(`  • ${result.editor.name}${status}`);
    }
  }
  
  if (configured.length > 0 && configured.length < installed.length) {
    const unconfigured = installed.filter(r => !r.configured);
    lines.push(`\nNot yet configured: ${unconfigured.map(r => r.editor.name).join(', ')}`);
  }
  
  return lines.join('\n');
}

