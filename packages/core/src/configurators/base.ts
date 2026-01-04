/**
 * Base interface for editor configurators
 * Each editor has its own configurator that handles setup specifics
 */

import type { SpecLifeConfig } from '../config.js';

/** Editor configuration result */
export interface ConfigureResult {
  /** Whether configuration was successful */
  success: boolean;
  /** Files that were created or modified */
  filesModified: string[];
  /** Files that were skipped (already exist) */
  filesSkipped: string[];
  /** Any warnings during configuration */
  warnings: string[];
}

/** Options for editor configuration */
export interface ConfigureOptions {
  /** Project root path */
  projectPath: string;
  /** Spec directory name (e.g., "openspec") */
  specDir: string;
  /** Force overwrite existing files */
  force?: boolean;
  /** SpecLife config for context */
  config?: SpecLifeConfig;
}

/**
 * Abstract base class for editor configurators
 * Implement this to add support for new editors
 */
export abstract class EditorConfigurator {
  /** Human-readable name of the editor */
  abstract readonly name: string;
  
  /** Short identifier for the editor (used in commands) */
  abstract readonly id: string;
  
  /** Description of the editor */
  abstract readonly description: string;
  
  /** Directory name used by this editor (e.g., ".cursor", ".vscode") */
  abstract readonly configDir: string;
  
  /** Whether this editor supports dash-prefixed commands (e.g., /speclife-start) */
  abstract readonly supportsDashPrefix: boolean;
  
  /**
   * Check if this editor is available on the system
   * (e.g., check if its config directory exists or CLI is installed)
   */
  abstract isAvailable(projectPath: string): Promise<boolean>;
  
  /**
   * Check if this editor is already configured for SpecLife
   */
  abstract isConfigured(projectPath: string): Promise<boolean>;
  
  /**
   * Configure the editor for SpecLife
   * Creates symlinks or copies command files
   */
  abstract configure(options: ConfigureOptions): Promise<ConfigureResult>;
  
  /**
   * Remove SpecLife configuration from this editor
   */
  abstract unconfigure(projectPath: string): Promise<void>;
  
  /**
   * Get detection hints for this editor
   * @returns Array of paths to check for editor detection
   */
  getDetectionPaths(): string[] {
    return [this.configDir];
  }
}

