/**
 * Worktree workflow - manage git worktrees for isolated change development
 */

import { type GitAdapter } from '../adapters/git-adapter.js';
import {
  type EnvironmentRegistry,
  type BootstrapResult,
  createDefaultEnvironmentRegistry,
} from '../adapters/environment-adapter.js';
import { type SpecLifeConfig } from '../config.js';
import { SpecLifeError, ErrorCodes, type ProgressCallback } from '../types.js';

export interface WorktreeCreateOptions {
  /** Change identifier (kebab-case) */
  changeId: string;
  /** Base branch to create worktree from (defaults to config.git.baseBranch) */
  baseBranch?: string;
  /** Skip environment bootstrap */
  skipBootstrap?: boolean;
}

export interface WorktreeCreateResult {
  /** Created branch name */
  branch: string;
  /** Worktree path */
  worktreePath: string;
  /** Environment bootstrap results */
  bootstrapResults?: BootstrapResult[];
}

export interface WorktreeRemoveOptions {
  /** Change identifier */
  changeId: string;
  /** Force removal even if there are uncommitted changes */
  force?: boolean;
}

export interface WorktreeRemoveResult {
  /** Removed branch name */
  branch: string;
  /** Removed worktree path */
  worktreePath: string;
}

export interface WorktreeListResult {
  /** List of active worktrees */
  worktrees: Array<{
    changeId: string;
    branch: string;
    path: string;
  }>;
}

interface WorktreeDependencies {
  git: GitAdapter;
  config: SpecLifeConfig;
  environmentRegistry?: EnvironmentRegistry;
}

/**
 * Create a new worktree for isolated change development
 */
export async function worktreeCreate(
  options: WorktreeCreateOptions,
  deps: WorktreeDependencies,
  onProgress?: ProgressCallback
): Promise<WorktreeCreateResult> {
  const { changeId, baseBranch, skipBootstrap = false } = options;
  const { git, config, environmentRegistry } = deps;
  
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
  const base = baseBranch ?? config.git?.baseBranch ?? 'main';
  
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
  
  // Create worktree
  onProgress?.({ type: 'step_completed', message: `Creating worktree at ${worktreePath}` });
  await git.createWorktree(worktreePath, branch, base);
  
  // Bootstrap environment
  let bootstrapResults: BootstrapResult[] | undefined;
  if (!skipBootstrap) {
    const registry = environmentRegistry ?? createDefaultEnvironmentRegistry();
    const strategy = config.worktree?.bootstrap?.strategy ?? 'symlink';
    
    onProgress?.({ type: 'step_completed', message: 'Bootstrapping environments' });
    
    const sourceRoot = process.cwd();
    bootstrapResults = await registry.bootstrapAll(
      worktreePath,
      sourceRoot,
      strategy,
      onProgress
    );
    
    const successful = bootstrapResults.filter(r => r.success);
    if (successful.length > 0) {
      onProgress?.({
        type: 'step_completed',
        message: `Bootstrapped: ${successful.map(r => r.environment).join(', ')}`,
      });
    }
  }
  
  onProgress?.({ type: 'step_completed', message: 'Worktree created' });
  
  return {
    branch,
    worktreePath,
    bootstrapResults,
  };
}

/**
 * Remove a worktree and its branch
 */
export async function worktreeRemove(
  options: WorktreeRemoveOptions,
  deps: Pick<WorktreeDependencies, 'git' | 'config'>,
  onProgress?: ProgressCallback
): Promise<WorktreeRemoveResult> {
  const { changeId, force = false } = options;
  const { git, config } = deps;
  
  const branchPrefix = config.git?.branchPrefix ?? 'spec/';
  const worktreeDir = config.git?.worktreeDir ?? 'worktrees';
  
  const branch = `${branchPrefix}${changeId}`;
  const worktreePath = `${worktreeDir}/${changeId}`;
  
  // Remove worktree
  onProgress?.({ type: 'step_completed', message: `Removing worktree at ${worktreePath}` });
  await git.removeWorktree(worktreePath, force);
  
  // Delete local branch (remote branch may have been deleted by PR merge)
  onProgress?.({ type: 'step_completed', message: `Deleting branch ${branch}` });
  try {
    await git.deleteBranch(branch, force);
  } catch {
    // Branch may already be deleted or merged
    onProgress?.({ type: 'step_completed', message: 'Branch already deleted or merged' });
  }
  
  onProgress?.({ type: 'step_completed', message: 'Worktree removed' });
  
  return {
    branch,
    worktreePath,
  };
}

/**
 * List all active worktrees
 */
export async function worktreeList(
  deps: Pick<WorktreeDependencies, 'git' | 'config'>,
  _onProgress?: ProgressCallback
): Promise<WorktreeListResult> {
  const { git, config } = deps;
  
  const branchPrefix = config.git?.branchPrefix ?? 'spec/';
  const worktreeDir = config.git?.worktreeDir ?? 'worktrees';
  
  const worktrees = await git.listWorktrees();
  
  // Filter to only spec worktrees
  const specWorktrees = worktrees
    .filter(wt => wt.branch?.startsWith(branchPrefix) && wt.path.includes(worktreeDir))
    .map(wt => ({
      changeId: wt.branch!.replace(branchPrefix, ''),
      branch: wt.branch!,
      path: wt.path,
    }));
  
  return { worktrees: specWorktrees };
}

