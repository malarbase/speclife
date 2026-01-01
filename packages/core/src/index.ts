/**
 * @speclife/core
 * 
 * Core library for SpecLife - adapters and workflows for spec-driven development.
 */

// Re-export types
export * from './types.js';

// Re-export config
export {
  loadConfig,
  type SpecLifeConfig,
  type WorktreeConfig,
  type EnvironmentBootstrapConfig,
} from './config.js';

// Re-export adapters
export * from './adapters/index.js';

// Re-export workflows
export * from './workflows/index.js';

