/**
 * Workflows for spec-driven development
 * 
 * DEPRECATION NOTES:
 * - implementWorkflow: Deprecated - use /openspec-apply slash command
 * - GitHub-dependent workflows: May show deprecation warnings
 */

export { initWorkflow, type InitOptions, type InitResult } from './init.js';
export { statusWorkflow, type StatusOptions, type StatusResult } from './status.js';
export { submitWorkflow, type SubmitOptions, type SubmitResult } from './submit.js';
export { mergeWorkflow, type MergeOptions, type MergeResult } from './merge.js';
export { implementWorkflow, type ImplementDependencies } from './implement.js';
export {
  releaseWorkflow,
  parseConventionalCommit,
  suggestVersionBump,
  bumpVersion,
  generateChangelog,
} from './release.js';

// Worktree management
export {
  worktreeCreate,
  worktreeRemove,
  worktreeList,
  type WorktreeCreateOptions,
  type WorktreeCreateResult,
  type WorktreeRemoveOptions,
  type WorktreeRemoveResult,
  type WorktreeListResult,
} from './worktree.js';

