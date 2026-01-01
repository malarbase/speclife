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

// AI adapter will be added in Phase 3
// export { createAIAdapter, type AIAdapter } from './ai-adapter.js';

