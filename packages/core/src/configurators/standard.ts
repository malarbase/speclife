/**
 * Standard editor configurator
 *
 * Handles common editor configuration patterns to reduce duplication across
 * the ~20+ editors that SpecLife supports. Each editor only needs metadata
 * (name, id, configDir, commandPattern) rather than a full class.
 *
 * Patterns map to OpenSpec's supported-tools.md delivery conventions,
 * adapted for SpecLife's `speclife-` prefix and `.md` files.
 */

import { access, mkdir, symlink, unlink, lstat, readlink, readdir } from 'fs/promises';
import { join } from 'path';
import { EditorConfigurator, type ConfigureResult, type ConfigureOptions } from './base.js';

/** Command delivery patterns */
export type CommandPattern =
  | 'commands-subdir-dash'   // <configDir>/commands/speclife/ symlink + speclife-*.md dash files
  | 'commands-subdir-only'   // <configDir>/commands/speclife/ symlink only
  | 'workflows-flat'         // <configDir>/workflows/speclife-*.md flat symlinks
  | 'prompts-flat'           // <configDir>/prompts/speclife-*.md flat symlinks
  | 'custom';                // Fully custom — provide override methods

/** Options for constructing a StandardEditorConfigurator */
export interface StandardEditorOptions {
  name: string;
  id: string;
  description: string;
  configDir: string;
  commandPattern: CommandPattern;
  /** Additional detection paths beyond configDir */
  extraDetectionPaths?: string[];
  /** File extension for generated files (default: .md) */
  fileExtension?: string;
  /** Override configure for custom patterns */
  customConfigure?: (options: ConfigureOptions) => Promise<ConfigureResult>;
  /** Override isConfigured for custom patterns */
  customIsConfigured?: (projectPath: string) => Promise<boolean>;
  /** Override unconfigure for custom patterns */
  customUnconfigure?: (projectPath: string) => Promise<void>;
}

/**
 * Standard editor configurator that handles common patterns.
 *
 * Most editors fit one of four patterns:
 * - commands-subdir-dash: Cursor, Qwen, RooCode, OpenCode, etc.
 * - commands-subdir-only: Claude Code, Gemini, CodeBuddy, etc.
 * - workflows-flat: Antigravity, Kilo Code, Windsurf
 * - prompts-flat: Pi, Amazon Q, Continue, GitHub Copilot, Kiro
 */
export class StandardEditorConfigurator extends EditorConfigurator {
  private readonly opts: Required<Pick<StandardEditorOptions, 'fileExtension'>> & StandardEditorOptions;

  constructor(options: StandardEditorOptions) {
    super();
    this.opts = {
      fileExtension: '.md',
      ...options,
    };
  }

  get name(): string { return this.opts.name; }
  get id(): string { return this.opts.id; }
  get description(): string { return this.opts.description; }
  get configDir(): string { return this.opts.configDir; }

  get supportsDashPrefix(): boolean {
    return (
      this.opts.commandPattern === 'commands-subdir-dash' ||
      this.opts.commandPattern === 'workflows-flat' ||
      this.opts.commandPattern === 'prompts-flat'
    );
  }

  async isAvailable(_projectPath: string): Promise<boolean> {
    return true;
  }

  async isConfigured(projectPath: string): Promise<boolean> {
    if (this.opts.customIsConfigured) {
      return this.opts.customIsConfigured(projectPath);
    }

    switch (this.opts.commandPattern) {
      case 'commands-subdir-dash':
      case 'commands-subdir-only': {
        try {
          const dir = join(projectPath, this.configDir, 'commands', 'speclife');
          await access(dir);
          return true;
        } catch {
          return false;
        }
      }
      case 'workflows-flat': {
        try {
          const dir = join(projectPath, this.configDir, 'workflows');
          const files = await readdir(dir);
          return files.some((f: string) => f.startsWith('speclife-') && f.endsWith(this.opts.fileExtension));
        } catch {
          return false;
        }
      }
      case 'prompts-flat': {
        try {
          const dir = join(projectPath, this.configDir, 'prompts');
          const files = await readdir(dir);
          return files.some((f: string) => f.startsWith('speclife-') && f.endsWith(this.opts.fileExtension));
        } catch {
          return false;
        }
      }
      default:
        return false;
    }
  }

  async configure(options: ConfigureOptions): Promise<ConfigureResult> {
    if (this.opts.customConfigure) {
      return this.opts.customConfigure(options);
    }

    const { projectPath, specDir, force = false } = options;
    const result: ConfigureResult = {
      success: true,
      filesModified: [],
      filesSkipped: [],
      warnings: [],
    };

    const sourceDir = join(projectPath, specDir, 'commands', 'speclife');
    const ext = this.opts.fileExtension;

    try {
      switch (this.opts.commandPattern) {
        case 'commands-subdir-dash':
        case 'commands-subdir-only': {
          await this.configureCommandsSubdir(projectPath, sourceDir, result, force, ext);
          break;
        }
        case 'workflows-flat': {
          await this.configureFlatFiles(projectPath, 'workflows', sourceDir, result, force, ext);
          break;
        }
        case 'prompts-flat': {
          await this.configureFlatFiles(projectPath, 'prompts', sourceDir, result, force, ext);
          break;
        }
      }
    } catch (err) {
      result.success = false;
      result.warnings.push(`Configuration failed: ${err}`);
    }

    return result;
  }

  async unconfigure(projectPath: string): Promise<void> {
    if (this.opts.customUnconfigure) {
      return this.opts.customUnconfigure(projectPath);
    }

    const ext = this.opts.fileExtension;

    try {
      switch (this.opts.commandPattern) {
        case 'commands-subdir-dash':
        case 'commands-subdir-only': {
          await this.unconfigureCommandsSubdir(projectPath, ext);
          break;
        }
        case 'workflows-flat': {
          await this.unconfigureFlatFiles(projectPath, 'workflows', ext);
          break;
        }
        case 'prompts-flat': {
          await this.unconfigureFlatFiles(projectPath, 'prompts', ext);
          break;
        }
      }
    } catch {
      // Ignore errors during cleanup
    }
  }

  override getDetectionPaths(): string[] {
    const paths = [this.configDir];
    if (this.opts.extraDetectionPaths) {
      paths.push(...this.opts.extraDetectionPaths);
    }
    return paths;
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  private async configureCommandsSubdir(
    projectPath: string,
    sourceDir: string,
    result: ConfigureResult,
    force: boolean,
    ext: string,
  ): Promise<void> {
    const base = join(projectPath, this.configDir, 'commands');
    const sub = join(base, 'speclife');

    await mkdir(base, { recursive: true });

    // Create/replace speclife/ directory symlink
    try {
      const stats = await lstat(sub);
      if (stats.isSymbolicLink()) {
        if (force) {
          await unlink(sub);
          await symlink(sourceDir, sub);
          result.filesModified.push(sub);
        } else {
          const target = await readlink(sub);
          if (target !== sourceDir) {
            result.warnings.push(`Existing symlink points to ${target}, not ${sourceDir}`);
          }
          result.filesSkipped.push(sub);
        }
      } else {
        result.warnings.push(`${sub} exists but is not a symlink`);
        result.filesSkipped.push(sub);
      }
    } catch {
      await symlink(sourceDir, sub);
      result.filesModified.push(sub);
    }

    // Dash-prefixed symlinks (only for commands-subdir-dash)
    if (this.opts.commandPattern === 'commands-subdir-dash') {
      const commands = await this.discoverCommands(sourceDir, '.md');
      for (const cmd of commands) {
        const dashFile = join(base, `speclife-${cmd}${ext}`);
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
          try {
            await symlink(targetFile, dashFile);
            result.filesModified.push(dashFile);
          } catch (err) {
            result.warnings.push(`Failed to create ${dashFile}: ${err}`);
          }
        }
      }
    }
  }

  private async unconfigureCommandsSubdir(projectPath: string, ext: string): Promise<void> {
    const base = join(projectPath, this.configDir, 'commands');
    const sub = join(base, 'speclife');

    try {
      const stats = await lstat(sub);
      if (stats.isSymbolicLink()) {
        await unlink(sub);
      }
    } catch {
      // Ignore
    }

    if (this.opts.commandPattern === 'commands-subdir-dash') {
      try {
        const files = await readdir(base);
        for (const file of files) {
          if (file.startsWith('speclife-') && file.endsWith(ext)) {
            const fp = join(base, file);
            const s = await lstat(fp);
            if (s.isSymbolicLink()) await unlink(fp);
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  private async configureFlatFiles(
    projectPath: string,
    subDir: string,
    sourceDir: string,
    result: ConfigureResult,
    force: boolean,
    ext: string,
  ): Promise<void> {
    const targetDir = join(projectPath, this.configDir, subDir);
    await mkdir(targetDir, { recursive: true });

    const commands = await this.discoverCommands(sourceDir, '.md');
    for (const cmd of commands) {
      const dashFile = join(targetDir, `speclife-${cmd}${ext}`);
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
  }

  private async unconfigureFlatFiles(
    projectPath: string,
    subDir: string,
    ext: string,
  ): Promise<void> {
    const dir = join(projectPath, this.configDir, subDir);
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (file.startsWith('speclife-') && file.endsWith(ext)) {
          const fp = join(dir, file);
          const s = await lstat(fp);
          if (s.isSymbolicLink()) await unlink(fp);
        }
      }
    } catch {
      // Ignore
    }
  }

  private async discoverCommands(sourceDir: string, ext: string): Promise<string[]> {
    try {
      const files = await readdir(sourceDir);
      return files
        .filter((f: string) => f.endsWith(ext))
        .map((f: string) => f.slice(0, -ext.length));
    } catch {
      return [];
    }
  }
}
