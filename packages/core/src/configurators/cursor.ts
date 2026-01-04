/**
 * Cursor editor configurator
 */

import { access, mkdir, symlink, unlink, readdir, lstat, readlink } from 'fs/promises';
import { join } from 'path';
import { EditorConfigurator, type ConfigureResult, type ConfigureOptions } from './base.js';

export class CursorConfigurator extends EditorConfigurator {
  readonly name = 'Cursor';
  readonly id = 'cursor';
  readonly description = 'AI-first code editor with Claude integration';
  readonly configDir = '.cursor';
  readonly supportsDashPrefix = true;
  
  async isAvailable(_projectPath: string): Promise<boolean> {
    // Cursor is always "available" as a supported editor
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
      
      // Create dash-prefixed symlinks for Cursor
      const slashCommands = await this.discoverCommands(sourceDir);
      
      for (const cmd of slashCommands) {
        const dashFile = join(editorCommandsBase, `speclife-${cmd}.md`);
        const targetFile = join('speclife', `${cmd}.md`);
        
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
    const editorCommandsBase = join(projectPath, this.configDir, 'commands');
    const editorCommandsDir = join(editorCommandsBase, 'speclife');
    
    try {
      // Remove speclife directory symlink
      const stats = await lstat(editorCommandsDir);
      if (stats.isSymbolicLink()) {
        await unlink(editorCommandsDir);
      }
      
      // Remove dash-prefixed symlinks
      const files = await readdir(editorCommandsBase);
      for (const file of files) {
        if (file.startsWith('speclife-') && file.endsWith('.md')) {
          const filePath = join(editorCommandsBase, file);
          const fileStats = await lstat(filePath);
          if (fileStats.isSymbolicLink()) {
            await unlink(filePath);
          }
        }
      }
    } catch {
      // Ignore errors during cleanup
    }
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

