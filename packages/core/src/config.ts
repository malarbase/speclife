/**
 * Configuration loading and validation
 */

import { cosmiconfig } from 'cosmiconfig';
import { SpecLifeError, ErrorCodes, type ImplementMode } from './types.js';
import type { BootstrapStrategy } from './adapters/environment-adapter.js';

/** Per-environment bootstrap configuration */
export interface EnvironmentBootstrapConfig {
  /** Override strategy for this environment */
  strategy?: BootstrapStrategy;
  /** Whether to enable this environment (default: true) */
  enabled?: boolean;
}

/** Worktree configuration */
export interface WorktreeConfig {
  /** Bootstrap configuration for environment setup */
  bootstrap: {
    /** Default bootstrap strategy (default: "symlink") */
    strategy: BootstrapStrategy;
    /** Per-environment overrides */
    environments?: Record<string, EnvironmentBootstrapConfig>;
  };
}

/** Auto-release configuration by version bump type */
export interface ReleaseAutoConfig {
  /** Auto-release for patch bumps (default: true) */
  patch?: boolean;
  /** Auto-release for minor bumps (default: true) */
  minor?: boolean;
  /** Auto-release for major bumps (default: false - requires manual) */
  major?: boolean;
}

/** Release configuration */
export interface ReleaseConfig {
  /** 
   * Auto-release configuration.
   * - If boolean: enables/disables auto-release for all types (except major)
   * - If object: fine-grained control per bump type
   * Default: { patch: true, minor: true, major: false }
   */
  auto?: ReleaseAutoConfig | boolean;
}

/** Git configuration (new minimal config) */
export interface GitConfig {
  /** Base branch for new changes (default: "main") */
  baseBranch?: string;
  /** Branch prefix for change branches (default: "spec/") */
  branchPrefix?: string;
  /** Directory for worktrees (default: "worktrees") */
  worktreeDir?: string;
}

/** SpecLife configuration schema */
export interface SpecLifeConfig {
  /** OpenSpec directory location (default: "openspec") */
  specDir: string;
  
  /** Git configuration (new minimal config) */
  git?: GitConfig;
  
  /** AI provider to use (deprecated - use slash commands) */
  aiProvider: 'claude' | 'openai' | 'gemini';
  
  /** AI model identifier (deprecated - use slash commands) */
  aiModel: string;
  
  /** Implementation mode for speclife_implement (deprecated - use /openspec-apply) */
  implementMode: ImplementMode;
  
  /** GitHub configuration (deprecated - owner/repo auto-detected) */
  github: {
    owner: string;
    repo: string;
    baseBranch: string;
  };
  
  /** Command to run tests */
  testCommand: string;
  
  /** Optional build command */
  buildCommand?: string;
  
  /** Files to always include in AI context */
  contextFiles?: string[];
  
  /** Worktree configuration */
  worktree: WorktreeConfig;
  
  /** Create draft PR during init (default: true) */
  createDraftPR: boolean;
  
  /** Release configuration */
  release: ReleaseConfig;
}

/**
 * Merge auto-release configuration
 * Handles both boolean and object forms
 */
function mergeAutoReleaseConfig(
  defaultConfig?: ReleaseAutoConfig | boolean,
  userConfig?: ReleaseAutoConfig | boolean
): ReleaseAutoConfig {
  // If user provided boolean, expand it
  if (typeof userConfig === 'boolean') {
    return {
      patch: userConfig,
      minor: userConfig,
      major: false, // Major always defaults to false for safety
    };
  }
  
  // If user provided object, merge with defaults
  const defaultObj = typeof defaultConfig === 'boolean'
    ? { patch: defaultConfig, minor: defaultConfig, major: false }
    : defaultConfig ?? {};
    
  return {
    patch: userConfig?.patch ?? defaultObj.patch ?? true,
    minor: userConfig?.minor ?? defaultObj.minor ?? true,
    major: userConfig?.major ?? defaultObj.major ?? false,
  };
}

/**
 * Check if auto-release is allowed for a given bump type
 */
export function isAutoReleaseAllowed(
  config: SpecLifeConfig,
  bumpType: 'major' | 'minor' | 'patch'
): boolean {
  const autoConfig = config.release?.auto;
  
  if (autoConfig === undefined) {
    // Default: auto for patch/minor, manual for major
    return bumpType !== 'major';
  }
  
  if (typeof autoConfig === 'boolean') {
    return bumpType === 'major' ? false : autoConfig;
  }
  
  return autoConfig[bumpType] ?? (bumpType !== 'major');
}

/** Default configuration values */
const defaults: Partial<SpecLifeConfig> = {
  specDir: 'openspec',
  git: {
    baseBranch: 'main',
    branchPrefix: 'spec/',
    worktreeDir: 'worktrees',
  },
  aiProvider: 'claude',
  aiModel: 'claude-sonnet-4-20250514',
  implementMode: 'claude-cli',
  github: {
    owner: '',
    repo: '',
    baseBranch: 'main',
  },
  testCommand: 'npm test',
  worktree: {
    bootstrap: {
      strategy: 'symlink',
    },
  },
  createDraftPR: true,
  release: {
    auto: {
      patch: true,
      minor: true,
      major: false,
    },
  },
};

/**
 * Load configuration from standard locations
 * 
 * Search order:
 * 1. .specliferc.yaml
 * 2. .specliferc.json
 * 3. speclife.config.js
 * 4. package.json "speclife" key
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<SpecLifeConfig> {
  const explorer = cosmiconfig('speclife', {
    searchPlaces: [
      '.specliferc.yaml',
      '.specliferc.yml',
      '.specliferc.json',
      '.specliferc',
      'speclife.config.js',
      'speclife.config.cjs',
      'package.json',
    ],
  });

  const result = await explorer.search(cwd);
  const fileConfig = result?.config ?? {};
  
  // Merge with defaults
  const config: SpecLifeConfig = {
    ...defaults,
    ...fileConfig,
    git: {
      ...defaults.git,
      ...fileConfig.git,
    },
    github: {
      ...defaults.github,
      ...fileConfig.github,
    },
    worktree: {
      ...defaults.worktree,
      ...fileConfig.worktree,
      bootstrap: {
        ...defaults.worktree?.bootstrap,
        ...fileConfig.worktree?.bootstrap,
      },
    },
    release: {
      ...defaults.release,
      ...fileConfig.release,
      auto: mergeAutoReleaseConfig(
        defaults.release?.auto,
        fileConfig.release?.auto
      ),
    },
  } as SpecLifeConfig;
  
  // Apply environment variable overrides
  if (process.env.SPECLIFE_AI_PROVIDER) {
    config.aiProvider = process.env.SPECLIFE_AI_PROVIDER as SpecLifeConfig['aiProvider'];
  }
  if (process.env.SPECLIFE_AI_MODEL) {
    config.aiModel = process.env.SPECLIFE_AI_MODEL;
  }
  if (process.env.SPECLIFE_IMPLEMENT_MODE) {
    config.implementMode = process.env.SPECLIFE_IMPLEMENT_MODE as ImplementMode;
  }
  
  // Validate required fields
  validateConfig(config);
  
  return config;
}

/** Valid bootstrap strategies */
const validBootstrapStrategies: BootstrapStrategy[] = ['symlink', 'install', 'none'];

/** Valid implementation modes */
const validImplementModes: ImplementMode[] = ['claude-cli', 'claude-sdk', 'cursor'];

/**
 * Validate configuration
 */
function validateConfig(config: SpecLifeConfig): void {
  if (!config.specDir) {
    throw new SpecLifeError(
      ErrorCodes.CONFIG_INVALID,
      'specDir is required',
      { field: 'specDir' }
    );
  }
  
  if (!['claude', 'openai', 'gemini'].includes(config.aiProvider)) {
    throw new SpecLifeError(
      ErrorCodes.CONFIG_INVALID,
      `Invalid aiProvider: ${config.aiProvider}. Must be one of: claude, openai, gemini`,
      { field: 'aiProvider', value: config.aiProvider }
    );
  }
  
  // Validate implementMode
  if (config.implementMode && !validImplementModes.includes(config.implementMode)) {
    throw new SpecLifeError(
      ErrorCodes.CONFIG_INVALID,
      `Invalid implementMode: ${config.implementMode}. Must be one of: ${validImplementModes.join(', ')}`,
      { field: 'implementMode', value: config.implementMode }
    );
  }
  
  // Validate worktree.bootstrap.strategy
  if (config.worktree?.bootstrap?.strategy) {
    if (!validBootstrapStrategies.includes(config.worktree.bootstrap.strategy)) {
      throw new SpecLifeError(
        ErrorCodes.CONFIG_INVALID,
        `Invalid worktree.bootstrap.strategy: ${config.worktree.bootstrap.strategy}. Must be one of: ${validBootstrapStrategies.join(', ')}`,
        { field: 'worktree.bootstrap.strategy', value: config.worktree.bootstrap.strategy }
      );
    }
  }
  
  // Validate per-environment strategies
  if (config.worktree?.bootstrap?.environments) {
    for (const [envName, envConfig] of Object.entries(config.worktree.bootstrap.environments)) {
      if (envConfig.strategy && !validBootstrapStrategies.includes(envConfig.strategy)) {
        throw new SpecLifeError(
          ErrorCodes.CONFIG_INVALID,
          `Invalid worktree.bootstrap.environments.${envName}.strategy: ${envConfig.strategy}. Must be one of: ${validBootstrapStrategies.join(', ')}`,
          { field: `worktree.bootstrap.environments.${envName}.strategy`, value: envConfig.strategy }
        );
      }
    }
  }
}

