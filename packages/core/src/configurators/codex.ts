/**
 * Codex editor configurator
 * OpenAI's Codex CLI
 *
 * Commands are installed globally in ~/.codex/prompts/ (or $CODEX_HOME/prompts/)
 * rather than in the project directory.
 */

import { access, mkdir, symlink, unlink, lstat, readdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { EditorConfigurator, type ConfigureResult, type ConfigureOptions } from './base.js';

export class CodexConfigurator extends EditorConfigurator {
  readonly name = 'Codex';
  readonly id = 'codex';
  readonly description = "OpenAI's Codex CLI";
  readonly configDir = '.codex';
  readonly supportsDashPrefix = false;

  private getGlobalPromptsDir(): string {
    const codexHome = process.env.CODEX_HOME;
    if (codexHome) {
      return join(codexHome, 'prompts');
    }
    return join(homedir(), '.codex', 'prompts');
  }

  async isAvailable(_projectPath: string): Promise<boolean> {
    return true;
  }

  async isConfigured(_projectPath: string): Promise<boolean> {
    try {
      const dir = this.getGlobalPromptsDir();
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
    const targetDir = this.getGlobalPromptsDir();

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

  async unconfigure(_projectPath: string): Promise<void> {
    const dir = this.getGlobalPromptsDir();
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
