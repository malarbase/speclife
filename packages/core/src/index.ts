/*
 * SpecLife - Git and GitHub automation for spec-driven development
 * Copyright (C) 2026 malarbase
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
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

// Re-export global config
export {
  getGlobalConfigDir,
  getGlobalConfigPath,
  globalConfigExists,
  getGlobalConfig,
  saveGlobalConfig,
  getGlobalConfigValue,
  setGlobalConfigValue,
  unsetGlobalConfigValue,
  resetGlobalConfig,
  listGlobalConfig,
  type GlobalConfig,
} from './global-config.js';

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

