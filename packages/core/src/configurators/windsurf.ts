/**
 * Windsurf editor configurator
 * Codeium's AI-powered editor
 */

import { access, mkdir, symlink, unlink, lstat, readlink } from 'fs/promises';
import { join } from 'path';
import { EditorConfigurator, type ConfigureResult, type ConfigureOptions } from './base.js';

export class WindsurfConfigurator extends EditorConfigurator {
  readonly name = 'Windsurf';
  readonly id = 'windsurf';
  readonly description = "Codeium's AI-powered code editor";
  readonly configDir = '.windsurf';
  readonly supportsDashPrefix = true;
  
  async isAvailable(_projectPath: string): Promise<boolean> {
    // Windsurf is always available as a supported editor
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

