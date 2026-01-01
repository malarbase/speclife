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

/** SpecLife configuration schema */
export interface SpecLifeConfig {
  /** OpenSpec directory location (default: "openspec") */
  specDir: string;
  
  /** AI provider to use */
  aiProvider: 'claude' | 'openai' | 'gemini';
  
  /** AI model identifier */
  aiModel: string;
  
  /** Implementation mode for speclife_implement (default: "claude-cli") */
  implementMode: ImplementMode;
  
  /** GitHub configuration */
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
}

/** Default configuration values */
const defaults: Partial<SpecLifeConfig> = {
  specDir: 'openspec',
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

