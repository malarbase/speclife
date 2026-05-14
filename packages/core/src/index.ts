/*
 * SpecLife - Git and GitHub automation for spec-driven development
 * Copyright (C) 2026 malarbase
 */

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
  isAutoReleaseAllowed,
  type SpecLifeConfig,
  type GitConfig,
  type WorktreeConfig,
  type EnvironmentBootstrapConfig,
  type ReleaseConfig,
  type ReleaseAutoConfig,
} from './config.js';

// Re-export adapters
export * from './adapters/index.js';

// Re-export workflows
export * from './workflows/index.js';

// Re-export utilities
export * from './utils/index.js';

// Re-export editor configurators
export {
  EditorConfigurator,
  EditorRegistry,
  CursorConfigurator,
  ClaudeCodeConfigurator,
  VSCodeConfigurator,
  WindsurfConfigurator,
  detectEditors,
  sortByPreference,
  formatDetectionSummary,
  initializeEditorRegistry,
  type ConfigureResult,
  type ConfigureOptions,
  type EditorDetectionResult,
} from './configurators/index.js';

// Re-export shell completions
export {
  generateCompletions,
  getInstallInstructions,
  getSupportedShells,
  getGenerator,
  getCommandDefinitions,
  BashGenerator,
  ZshGenerator,
  FishGenerator,
  type Shell,
  type CompletionGenerator,
  type CommandDef,
} from './completions/index.js';
