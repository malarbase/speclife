/**
 * Adapters for external services
 * 
 * DEPRECATION NOTES:
 * - GitHub adapter: Use @github MCP or gh CLI instead
 * - AI adapters: Removed - the agent IS the AI, use slash commands
 */

export { createGitAdapter, type GitAdapter } from './git-adapter.js';
export { createOpenSpecAdapter, type OpenSpecAdapter } from './openspec-adapter.js';

// GitHub adapter (deprecated but kept for backward compatibility)
export { createGitHubAdapter, type GitHubAdapter } from './github-adapter.js';

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
