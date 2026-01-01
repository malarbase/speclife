/**
 * Adapters for external services
 */

export { createGitAdapter, type GitAdapter } from './git-adapter.js';
export { createGitHubAdapter, type GitHubAdapter } from './github-adapter.js';
export { createOpenSpecAdapter, type OpenSpecAdapter } from './openspec-adapter.js';
// AI adapter will be added in Phase 3
// export { createAIAdapter, type AIAdapter } from './ai-adapter.js';

