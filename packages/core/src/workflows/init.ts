/**
 * Init workflow - create branch and scaffold change proposal
 */

import { type GitAdapter } from '../adapters/git-adapter.js';
import { type OpenSpecAdapter, createOpenSpecAdapter } from '../adapters/openspec-adapter.js';
import { type SpecLifeConfig } from '../config.js';
import { SpecLifeError, ErrorCodes, type ProgressCallback } from '../types.js';

export interface InitOptions {
  /** Change identifier (kebab-case) */
  changeId: string;
  /** Brief description for the proposal */
  description?: string;
  /** Disable worktree creation (create branch in current worktree instead) */
  noWorktree?: boolean;
  /** Preview changes without applying */
  dryRun?: boolean;
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
}

interface InitDependencies {
  git: GitAdapter;
  openspec: OpenSpecAdapter;
  config: SpecLifeConfig;
}

/**
 * Initialize a new change
 * 
 * By default, creates a worktree for isolated development.
 * Use noWorktree to create a branch in the current worktree instead.
 */
export async function initWorkflow(
  options: InitOptions,
  deps: InitDependencies,
  onProgress?: ProgressCallback
): Promise<InitResult> {
  const { changeId, description, noWorktree = false, dryRun = false } = options;
  const { git, openspec, config } = deps;
  
  // Validate changeId format (kebab-case)
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(changeId)) {
    throw new SpecLifeError(
      ErrorCodes.CONFIG_INVALID,
      `Invalid changeId format: "${changeId}". Must be kebab-case (e.g., "add-user-auth")`,
      { changeId }
    );
  }
  
  const branch = `spec/${changeId}`;
  const worktreePath = `worktrees/${changeId}`;
  
  // Check if branch already exists
  if (await git.branchExists(branch)) {
    throw new SpecLifeError(
      ErrorCodes.BRANCH_EXISTS,
      `Branch '${branch}' already exists`,
      { branch }
    );
  }
  
  // For worktree mode, check if change exists in main repo's openspec
  // For non-worktree mode, check current directory
  // TODO: Improve change existence check for worktree mode
  
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
    await git.createBranch(branch, config.github.baseBranch);
    
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
  await git.createWorktree(worktreePath, branch);
  
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
  };
}
