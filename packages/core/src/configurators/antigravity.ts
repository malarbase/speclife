/**
 * Antigravity editor configurator
 * Google's AI-powered IDE using .agent directory with flat workflow files
 */

import { access, mkdir, symlink, unlink, lstat, readdir } from 'fs/promises';
import { join } from 'path';
import { EditorConfigurator, type ConfigureResult, type ConfigureOptions } from './base.js';

export class AntigravityConfigurator extends EditorConfigurator {
  readonly name = 'Antigravity';
  readonly id = 'antigravity';
  readonly description = "Google's AI-powered IDE";
  readonly configDir = '.agent';
  readonly supportsDashPrefix = false; // Dash-prefix IS the primary format, not secondary
  
  async isAvailable(_projectPath: string): Promise<boolean> {
    // Antigravity is always available as a supported editor
    return true;
  }
  
  async isConfigured(projectPath: string): Promise<boolean> {
    try {
      // Check if any speclife-*.md files exist in .agent/workflows/
      const workflowsDir = join(projectPath, this.configDir, 'workflows');
      const files = await readdir(workflowsDir);
      return files.some(f => f.startsWith('speclife-') && f.endsWith('.md'));
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
    // Antigravity uses flat files: .agent/workflows/speclife-<cmd>.md
    const workflowsDir = join(projectPath, this.configDir, 'workflows');
    
    try {
      // Ensure workflows directory exists
      await mkdir(workflowsDir, { recursive: true });
      
      // Discover available commands
      const commands = await this.discoverCommands(sourceDir);
      
      // Create individual symlinks for each command
      for (const cmd of commands) {
        const dashFile = join(workflowsDir, `speclife-${cmd}.md`);
        const targetFile = join(sourceDir, `${cmd}.md`);
        
        try {
          await access(dashFile);
          if (force) {
            await unlink(dashFile);
            await symlink(targetFile, dashFile);
            result.filesModified.push(dashFile);
          } else {
            result.filesSkipped.push(dashFile);
          }
        } catch {
          // File doesn't exist, create symlink
          try {
            await symlink(targetFile, dashFile);
            result.filesModified.push(dashFile);
          } catch (err) {
            result.warnings.push(`Failed to create ${dashFile}: ${err}`);
          }
        }
      }
    } catch (err) {
      result.success = false;
      result.warnings.push(`Configuration failed: ${err}`);
    }
    
    return result;
  }
  
  async unconfigure(projectPath: string): Promise<void> {
    const workflowsDir = join(projectPath, this.configDir, 'workflows');
    
    try {
      // Remove all speclife-*.md symlinks
      const files = await readdir(workflowsDir);
      for (const file of files) {
        if (file.startsWith('speclife-') && file.endsWith('.md')) {
          const filePath = join(workflowsDir, file);
          const stats = await lstat(filePath);
          if (stats.isSymbolicLink()) {
            await unlink(filePath);
          }
        }
      }
    } catch {
      // Ignore errors during cleanup
    }
  }
  
  /**
   * Override detection paths for Antigravity
   */
  override getDetectionPaths(): string[] {
    return [this.configDir, join(this.configDir, 'workflows')];
  }
  
  private async discoverCommands(sourceDir: string): Promise<string[]> {
    try {
      const files = await readdir(sourceDir);
      return files
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', ''));
    } catch {
      return [];
    }
  }
}
