/**
 * Init workflow - create branch and scaffold change proposal
 * 
 * Note: This is the legacy init workflow used by the MCP server.
 * For new projects, use:
 * - `speclife worktree create` CLI command
 * - `/speclife start` slash command
 */

import { type GitAdapter } from '../adapters/git-adapter.js';
import { type OpenSpecAdapter, createOpenSpecAdapter } from '../adapters/openspec-adapter.js';
import {
  type EnvironmentRegistry,
  type BootstrapResult,
  createDefaultEnvironmentRegistry,
} from '../adapters/environment-adapter.js';
import { type SpecLifeConfig } from '../config.js';
import { SpecLifeError, ErrorCodes, type ProgressCallback } from '../types.js';

export interface InitOptions {
  /** Change identifier (kebab-case) */
  changeId: string;
  /** Brief description for the proposal */
  description?: string;
  /** Disable worktree creation (create branch in current worktree instead) */
  noWorktree?: boolean;
  /** Skip environment bootstrap (dependencies won't be set up) */
  skipBootstrap?: boolean;
  /** Preview changes without applying */
  dryRun?: boolean;
  /** Skip draft PR creation (deprecated - use slash commands) */
  skipDraftPR?: boolean;
  /** Generate tasks using AI (deprecated - use slash commands) */
  generateTasks?: boolean;
}

export interface InitResult {
  /** Created branch name */
  branch: string;
  /** Worktree path (if worktree created) */
  worktreePath?: string;
  /** Path to proposal.md */
  proposalPath: string;
  /** Path to tasks.md */
  tasksPath: string;
  /** Environment bootstrap results (if bootstrap ran) */
  bootstrapResults?: BootstrapResult[];
}

interface InitDependencies {
  git: GitAdapter;
  openspec: OpenSpecAdapter;
  config: SpecLifeConfig;
  /** Environment registry (uses default if not provided) */
  environmentRegistry?: EnvironmentRegistry;
}

/**
 * Initialize a new change
 * 
 * By default, creates a worktree for isolated development.
 * Use noWorktree to create a branch in the current worktree instead.
 * 
 * @deprecated Use `speclife worktree create` or `/speclife start` instead.
 */
export async function initWorkflow(
  options: InitOptions,
  deps: InitDependencies,
  onProgress?: ProgressCallback
): Promise<InitResult> {
  const { changeId, description, noWorktree = false, skipBootstrap = false, dryRun = false } = options;
  const { git, openspec, config, environmentRegistry } = deps;
  
  // Validate changeId format (kebab-case)
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(changeId)) {
    throw new SpecLifeError(
      ErrorCodes.CONFIG_INVALID,
      `Invalid changeId format: "${changeId}". Must be kebab-case (e.g., "add-user-auth")`,
      { changeId }
    );
  }
  
  const branchPrefix = config.git?.branchPrefix ?? 'spec/';
  const worktreeDir = config.git?.worktreeDir ?? 'worktrees';
  const baseBranch = config.git?.baseBranch ?? config.github?.baseBranch ?? 'main';
  
  const branch = `${branchPrefix}${changeId}`;
  const worktreePath = `${worktreeDir}/${changeId}`;
  
  // Check if branch already exists
  if (await git.branchExists(branch)) {
    throw new SpecLifeError(
      ErrorCodes.BRANCH_EXISTS,
      `Branch '${branch}' already exists`,
      { branch }
    );
  }
  
  if (dryRun) {
    const basePath = noWorktree ? '' : `${worktreePath}/`;
    return {
      branch,
      worktreePath: noWorktree ? undefined : worktreePath,
      proposalPath: `${basePath}openspec/changes/${changeId}/proposal.md`,
      tasksPath: `${basePath}openspec/changes/${changeId}/tasks.md`,
    };
  }
  
  if (noWorktree) {
    // Legacy mode: create branch in current worktree
    onProgress?.({ type: 'step_completed', message: `Creating branch ${branch}` });
    await git.createBranch(branch, baseBranch);
    
    // Scaffold proposal files in current directory
    onProgress?.({ type: 'step_completed', message: 'Scaffolding proposal files' });
    const { proposalPath, tasksPath } = await openspec.scaffoldChange(changeId, { description });
    
    onProgress?.({ type: 'step_completed', message: 'Initialization complete' });
    
    return {
      branch,
      proposalPath,
      tasksPath,
    };
  }
  
  // Default: Create worktree for isolated development
  onProgress?.({ type: 'step_completed', message: `Creating worktree at ${worktreePath}` });
  await git.createWorktree(worktreePath, branch, baseBranch);
  
  // Bootstrap environment (unless skipped)
  let bootstrapResults: BootstrapResult[] | undefined;
  if (!skipBootstrap) {
    const registry = environmentRegistry ?? createDefaultEnvironmentRegistry();
    const strategy = config.worktree?.bootstrap?.strategy ?? 'symlink';
    
    onProgress?.({ type: 'step_completed', message: 'Detecting and bootstrapping environments' });
    
    const sourceRoot = process.cwd();
    
    bootstrapResults = await registry.bootstrapAll(
      worktreePath,
      sourceRoot,
      strategy,
      onProgress
    );
    
    const successful = bootstrapResults.filter(r => r.success);
    const failed = bootstrapResults.filter(r => !r.success);
    
    if (successful.length > 0) {
      onProgress?.({
        type: 'step_completed',
        message: `Bootstrapped ${successful.length} environment(s): ${successful.map(r => r.environment).join(', ')}`,
        data: { results: successful },
      });
    }
    
    if (failed.length > 0) {
      onProgress?.({
        type: 'step_completed',
        message: `Warning: ${failed.length} environment(s) failed to bootstrap: ${failed.map(r => r.message).join('; ')}`,
        data: { results: failed },
      });
    }
  }
  
  // Create OpenSpec adapter for the worktree
  const worktreeOpenspec = createOpenSpecAdapter({
    projectRoot: worktreePath,
    specDir: config.specDir,
  });
  
  // Scaffold proposal files in worktree
  onProgress?.({ type: 'step_completed', message: 'Scaffolding proposal files in worktree' });
  const { proposalPath, tasksPath } = await worktreeOpenspec.scaffoldChange(changeId, { description });
  
  onProgress?.({ type: 'step_completed', message: 'Initialization complete' });
  
  return {
    branch,
    worktreePath,
    proposalPath,
    tasksPath,
    bootstrapResults,
  };
}
