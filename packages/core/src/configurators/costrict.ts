/**
 * CoStrict editor configurator
 * Strict spec-driven AI coding assistant
 *
 * Uses .cospec/openspec/commands/ directory structure
 */

import { access, mkdir, symlink, unlink, lstat, readdir } from 'fs/promises';
import { join } from 'path';
import { EditorConfigurator, type ConfigureResult, type ConfigureOptions } from './base.js';

export class CostrictConfigurator extends EditorConfigurator {
  readonly name = 'CoStrict';
  readonly id = 'costrict';
  readonly description = 'Strict spec-driven AI coding assistant';
  readonly configDir = '.cospec';
  readonly supportsDashPrefix = false;

  async isAvailable(_projectPath: string): Promise<boolean> {
    return true;
  }

  async isConfigured(projectPath: string): Promise<boolean> {
    try {
      const dir = join(projectPath, this.configDir, 'openspec', 'commands');
      const files = await readdir(dir);
      return files.some((f: string) => f.startsWith('speclife-') && f.endsWith('.md'));
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
    const targetDir = join(projectPath, this.configDir, 'openspec', 'commands');

    try {
      await mkdir(targetDir, { recursive: true });

      const commands = await this.discoverCommands(sourceDir);
      for (const cmd of commands) {
        const dashFile = join(targetDir, `speclife-${cmd}.md`);
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
    const dir = join(projectPath, this.configDir, 'openspec', 'commands');
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (file.startsWith('speclife-') && file.endsWith('.md')) {
          const fp = join(dir, file);
          const s = await lstat(fp);
          if (s.isSymbolicLink()) await unlink(fp);
        }
      }
    } catch {
      // Ignore
    }
  }

  private async discoverCommands(sourceDir: string): Promise<string[]> {
    try {
      const files = await readdir(sourceDir);
      return files
        .filter((f: string) => f.endsWith('.md'))
        .map((f: string) => f.replace('.md', ''));
    } catch {
      return [];
    }
  }
}
