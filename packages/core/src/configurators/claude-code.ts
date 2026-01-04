/**
 * Claude Code (Anthropic) editor configurator
 */

import { access, mkdir, symlink, unlink, lstat, readlink } from 'fs/promises';
import { join } from 'path';
import { EditorConfigurator, type ConfigureResult, type ConfigureOptions } from './base.js';

export class ClaudeCodeConfigurator extends EditorConfigurator {
  readonly name = 'Claude Code';
  readonly id = 'claude-code';
  readonly description = 'Claude-powered agentic IDE from Anthropic';
  readonly configDir = '.claude';
  readonly supportsDashPrefix = false; // Claude Code uses subdirectory format only
  
  async isAvailable(_projectPath: string): Promise<boolean> {
    // Claude Code is always available as a supported editor
    return true;
  }
  
  async isConfigured(projectPath: string): Promise<boolean> {
    try {
      const commandsDir = join(projectPath, this.configDir, 'commands', 'speclife');
      await access(commandsDir);
      return true;
    } catch {
      return false;
    }
  }
  
  async configure(options: ConfigureOptions): Promise<ConfigureResult> {
    const { projectPath, specDir, force = false } = options;
    const result: ConfigureResult = {
      success: true,
      filesModified: [],
      filesSkipped: [],
      warnings: [],
    };
    
    const sourceDir = join(projectPath, specDir, 'commands', 'speclife');
    const editorCommandsBase = join(projectPath, this.configDir, 'commands');
    const editorCommandsDir = join(editorCommandsBase, 'speclife');
    
    try {
      // Ensure editor commands directory exists
      await mkdir(editorCommandsBase, { recursive: true });
      
      // Create symlink for speclife/ directory
      try {
        const stats = await lstat(editorCommandsDir);
        if (stats.isSymbolicLink()) {
          if (force) {
            await unlink(editorCommandsDir);
            await symlink(sourceDir, editorCommandsDir);
            result.filesModified.push(editorCommandsDir);
          } else {
            // Check if symlink points to correct location
            const target = await readlink(editorCommandsDir);
            if (target !== sourceDir) {
              result.warnings.push(`Existing symlink points to ${target}, not ${sourceDir}`);
            }
            result.filesSkipped.push(editorCommandsDir);
          }
        } else {
          result.warnings.push(`${editorCommandsDir} exists but is not a symlink`);
          result.filesSkipped.push(editorCommandsDir);
        }
      } catch {
        // Symlink doesn't exist, create it
        await symlink(sourceDir, editorCommandsDir);
        result.filesModified.push(editorCommandsDir);
      }
      
      // Claude Code doesn't need dash-prefixed symlinks
      // It only supports the subdirectory format: /speclife/command
      
    } catch (err) {
      result.success = false;
      result.warnings.push(`Configuration failed: ${err}`);
    }
    
    return result;
  }
  
  async unconfigure(projectPath: string): Promise<void> {
    const editorCommandsDir = join(projectPath, this.configDir, 'commands', 'speclife');
    
    try {
      const stats = await lstat(editorCommandsDir);
      if (stats.isSymbolicLink()) {
        await unlink(editorCommandsDir);
      }
    } catch {
      // Ignore errors during cleanup
    }
  }
}

