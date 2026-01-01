/**
 * Configuration loading and validation
 */

import { cosmiconfig } from 'cosmiconfig';
import { SpecLifeError, ErrorCodes } from './types.js';

/** SpecLife configuration schema */
export interface SpecLifeConfig {
  /** OpenSpec directory location (default: "openspec") */
  specDir: string;
  
  /** AI provider to use */
  aiProvider: 'claude' | 'openai' | 'gemini';
  
  /** AI model identifier */
  aiModel: string;
  
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
}

/** Default configuration values */
const defaults: Partial<SpecLifeConfig> = {
  specDir: 'openspec',
  aiProvider: 'claude',
  aiModel: 'claude-sonnet-4-20250514',
  github: {
    owner: '',
    repo: '',
    baseBranch: 'main',
  },
  testCommand: 'npm test',
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
  } as SpecLifeConfig;
  
  // Apply environment variable overrides
  if (process.env.SPECLIFE_AI_PROVIDER) {
    config.aiProvider = process.env.SPECLIFE_AI_PROVIDER as SpecLifeConfig['aiProvider'];
  }
  if (process.env.SPECLIFE_AI_MODEL) {
    config.aiModel = process.env.SPECLIFE_AI_MODEL;
  }
  
  // Validate required fields
  validateConfig(config);
  
  return config;
}

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
}

