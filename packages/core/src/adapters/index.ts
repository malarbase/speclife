/**
 * Adapters for external services
 */

export { createGitAdapter, type GitAdapter } from './git-adapter.js';
export { createGitHubAdapter, type GitHubAdapter } from './github-adapter.js';
export { createOpenSpecAdapter, type OpenSpecAdapter } from './openspec-adapter.js';

// Environment adapters for worktree setup
export {
  type EnvironmentAdapter,
  type EnvironmentRegistry,
  type BootstrapStrategy,
  type DetectionResult,
  type BootstrapResult,
  type MonorepoInfo,
  type WorkspacePackage,
  createEnvironmentRegistry,
  createDefaultEnvironmentRegistry,
  createNodejsAdapter,
  createPythonAdapter,
  createGoAdapter,
  createRustAdapter,
  detectMonorepo,
  patchTsconfigForMonorepo,
} from './environment-adapter.js';

// AI/Implementation adapters
export {
  createClaudeCliAdapter,
  generateImplementationPrompt,
  generateVersionAnalysisPrompt,
  parseVersionAnalysisResponse,
  type ClaudeCliAdapter,
  type ClaudeCliOptions,
  type ClaudeCliResult,
} from './claude-cli-adapter.js';

export {
  createClaudeSdkAdapter,
  generateAgenticSystemPrompt,
  type ClaudeSdkAdapter,
  type AgenticLoopOptions,
  type AgenticLoopResult,
} from './claude-sdk-adapter.js';

export {
  createCursorAdapter,
  type CursorAdapter,
  type CursorResult,
} from './cursor-adapter.js';

