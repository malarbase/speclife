/**
 * VS Code editor configurator
 * Sets up tasks.json for command integration
 */

import { access, mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { EditorConfigurator, type ConfigureResult, type ConfigureOptions } from './base.js';

export class VSCodeConfigurator extends EditorConfigurator {
  readonly name = 'VS Code';
  readonly id = 'vscode';
  readonly description = 'Visual Studio Code with extensions';
  readonly configDir = '.vscode';
  readonly supportsDashPrefix = false;
  
  async isAvailable(projectPath: string): Promise<boolean> {
    try {
      // Check if .vscode directory exists
      await access(join(projectPath, this.configDir));
      return true;
    } catch {
      return false;
    }
  }
  
  async isConfigured(projectPath: string): Promise<boolean> {
    try {
      const settingsPath = join(projectPath, this.configDir, 'settings.json');
      const content = await readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      return settings['speclife.enabled'] === true;
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
    
    const vscodeDir = join(projectPath, this.configDir);
    const settingsPath = join(vscodeDir, 'settings.json');
    
    try {
      // Ensure .vscode directory exists
      await mkdir(vscodeDir, { recursive: true });
      
      // Update settings.json to mark speclife as configured
      let settings: Record<string, unknown> = {};
      try {
        const content = await readFile(settingsPath, 'utf-8');
        settings = JSON.parse(content);
      } catch {
        // File doesn't exist or is invalid, start fresh
      }
      
      if (settings['speclife.enabled'] && !force) {
        result.filesSkipped.push(settingsPath);
      } else {
        settings['speclife.enabled'] = true;
        settings['speclife.specDir'] = specDir;
        
        await writeFile(
          settingsPath,
          JSON.stringify(settings, null, 2),
          'utf-8'
        );
        result.filesModified.push(settingsPath);
      }
      
      // Create tasks.json for CLI commands
      const tasksPath = join(vscodeDir, 'tasks.json');
      const tasksConfig = this.createTasksConfig();
      
      try {
        await access(tasksPath);
        if (force) {
          await writeFile(tasksPath, JSON.stringify(tasksConfig, null, 2), 'utf-8');
          result.filesModified.push(tasksPath);
        } else {
          result.filesSkipped.push(tasksPath);
        }
      } catch {
        await writeFile(tasksPath, JSON.stringify(tasksConfig, null, 2), 'utf-8');
        result.filesModified.push(tasksPath);
      }
      
      result.warnings.push(
        'VS Code has limited slash command support. Consider using Cursor or Claude Code for full experience.'
      );
      
    } catch (err) {
      result.success = false;
      result.warnings.push(`Configuration failed: ${err}`);
    }
    
    return result;
  }
  
  async unconfigure(projectPath: string): Promise<void> {
    const settingsPath = join(projectPath, this.configDir, 'settings.json');
    
    try {
      const content = await readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      delete settings['speclife.enabled'];
      delete settings['speclife.specDir'];
      await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch {
      // Ignore errors during cleanup
    }
  }
  
  private createTasksConfig(): object {
    return {
      version: '2.0.0',
      tasks: [
        {
          label: 'SpecLife: Status',
          type: 'shell',
          command: 'speclife status',
          group: 'none',
          presentation: {
            reveal: 'always',
            panel: 'new',
          },
        },
        {
          label: 'SpecLife: List Changes',
          type: 'shell',
          command: 'speclife list',
          group: 'none',
          presentation: {
            reveal: 'always',
            panel: 'new',
          },
        },
        {
          label: 'SpecLife: View Dashboard',
          type: 'shell',
          command: 'speclife view',
          group: 'none',
          presentation: {
            reveal: 'always',
            panel: 'new',
          },
        },
      ],
    };
  }
}

