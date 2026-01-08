/**
 * Antigravity editor configurator
 * AI-powered coding assistant using .agent directory
 */

import { access, mkdir, symlink, unlink, lstat, readlink } from 'fs/promises';
import { join } from 'path';
import { EditorConfigurator, type ConfigureResult, type ConfigureOptions } from './base.js';

export class AntigravityConfigurator extends EditorConfigurator {
  readonly name = 'Antigravity';
  readonly id = 'antigravity';
  readonly description = 'AI-powered coding assistant';
  readonly configDir = '.agent';
  readonly supportsDashPrefix = false; // Uses workflows directory format
  
  async isAvailable(_projectPath: string): Promise<boolean> {
    // Antigravity is always available as a supported editor
    return true;
  }
  
  async isConfigured(projectPath: string): Promise<boolean> {
    try {
      // Note: Antigravity uses "workflows" instead of "commands"
      const workflowsDir = join(projectPath, this.configDir, 'workflows', 'speclife');
      await access(workflowsDir);
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
    // Note: Antigravity uses "workflows" instead of "commands"
    const editorWorkflowsBase = join(projectPath, this.configDir, 'workflows');
    const editorWorkflowsDir = join(editorWorkflowsBase, 'speclife');
    
    try {
      // Ensure editor workflows directory exists
      await mkdir(editorWorkflowsBase, { recursive: true });
      
      // Create symlink for speclife/ directory
      try {
        const stats = await lstat(editorWorkflowsDir);
        if (stats.isSymbolicLink()) {
          if (force) {
            await unlink(editorWorkflowsDir);
            await symlink(sourceDir, editorWorkflowsDir);
            result.filesModified.push(editorWorkflowsDir);
          } else {
            // Check if symlink points to correct location
            const target = await readlink(editorWorkflowsDir);
            if (target !== sourceDir) {
              result.warnings.push(`Existing symlink points to ${target}, not ${sourceDir}`);
            }
            result.filesSkipped.push(editorWorkflowsDir);
          }
        } else {
          result.warnings.push(`${editorWorkflowsDir} exists but is not a symlink`);
          result.filesSkipped.push(editorWorkflowsDir);
        }
      } catch {
        // Symlink doesn't exist, create it
        await symlink(sourceDir, editorWorkflowsDir);
        result.filesModified.push(editorWorkflowsDir);
      }
      
      // Antigravity doesn't use dash-prefixed symlinks
      
    } catch (err) {
      result.success = false;
      result.warnings.push(`Configuration failed: ${err}`);
    }
    
    return result;
  }
  
  async unconfigure(projectPath: string): Promise<void> {
    const editorWorkflowsDir = join(projectPath, this.configDir, 'workflows', 'speclife');
    
    try {
      const stats = await lstat(editorWorkflowsDir);
      if (stats.isSymbolicLink()) {
        await unlink(editorWorkflowsDir);
      }
    } catch {
      // Ignore errors during cleanup
    }
  }
  
  /**
   * Override detection paths for Antigravity
   * Uses "workflows" instead of "commands"
   */
  override getDetectionPaths(): string[] {
    return [this.configDir, join(this.configDir, 'workflows')];
  }
}
