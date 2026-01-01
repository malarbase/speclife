/**
 * Merge workflow - merge PR, sync main, cleanup worktree
 */

import { type GitAdapter } from '../adapters/git-adapter.js';
import { type GitHubAdapter } from '../adapters/github-adapter.js';
import { type SpecLifeConfig } from '../config.js';
import { SpecLifeError, ErrorCodes, type PullRequest, type ProgressCallback } from '../types.js';

export interface MergeOptions {
  /** Change ID to merge */
  changeId: string;
  /** Merge method: squash (default), merge, or rebase */
  method?: 'squash' | 'merge' | 'rebase';
  /** Delete local branch after merge */
  deleteBranch?: boolean;
  /** Remove worktree after merge (if in worktree) */
  removeWorktree?: boolean;
}

export interface MergeResult {
  /** PR that was merged */
  pullRequest: PullRequest;
  /** Whether main was synced */
  mainSynced: boolean;
  /** Whether local branch was deleted */
  branchDeleted: boolean;
  /** Whether worktree was removed */
  worktreeRemoved: boolean;
  /** Path to worktree that was removed (if any) */
  worktreePath?: string;
}

interface MergeDependencies {
  git: GitAdapter;
  github: GitHubAdapter;
  config: SpecLifeConfig;
}

/**
 * Merge a submitted change: merge PR, sync main, cleanup
 */
export async function mergeWorkflow(
  options: MergeOptions,
  deps: MergeDependencies,
  onProgress?: ProgressCallback
): Promise<MergeResult> {
  const { changeId, method = 'squash', deleteBranch = true, removeWorktree = true } = options;
  const { git, github, config } = deps;

  const branch = `spec/${changeId}`;
  const baseBranch = config.github.baseBranch;

  // Find PR for this branch
  onProgress?.({ type: 'step_completed', message: `Looking for PR for branch ${branch}` });
  const pr = await github.getPullRequestByBranch(branch);

  if (!pr) {
    throw new SpecLifeError(
      ErrorCodes.CHANGE_NOT_FOUND,
      `No open PR found for branch '${branch}'. Submit the change first with speclife_submit.`,
      { changeId, branch }
    );
  }

  // Get full PR details including mergeable status
  const fullPr = await github.getPullRequest(pr.number);

  // Check if already merged
  if (fullPr.state === 'merged') {
    throw new SpecLifeError(
      ErrorCodes.CONFIG_INVALID,
      `PR #${pr.number} is already merged`,
      { prNumber: pr.number }
    );
  }

  // Check if PR is mergeable
  const mergeableCheck = await github.isPullRequestMergeable(pr.number);
  if (!mergeableCheck.mergeable) {
    throw new SpecLifeError(
      ErrorCodes.CONFIG_INVALID,
      `PR #${pr.number} is not mergeable: ${mergeableCheck.reason ?? 'unknown reason'}`,
      { prNumber: pr.number, reason: mergeableCheck.reason }
    );
  }

  // Detect if we're in a worktree
  let worktreePath: string | undefined;
  let isInWorktree = false;
  
  const worktrees = await git.listWorktrees();
  const currentBranch = await git.getCurrentBranch();
  
  for (const wt of worktrees) {
    if (wt.branch === currentBranch || wt.branch === branch) {
      // We're likely in a worktree if we're on the branch being merged
      worktreePath = wt.path;
      isInWorktree = worktrees.length > 1; // Main repo + at least one worktree
      break;
    }
  }

  // Merge the PR
  onProgress?.({ type: 'step_completed', message: `Merging PR #${pr.number} (${method})` });
  await github.mergePullRequest(pr.number, method);

  // Get updated PR state
  const mergedPr = await github.getPullRequest(pr.number);

  // Checkout main branch
  onProgress?.({ type: 'step_completed', message: `Checking out ${baseBranch}` });
  await git.checkout(baseBranch);

  // Pull latest changes
  onProgress?.({ type: 'step_completed', message: `Pulling latest ${baseBranch}` });
  let mainSynced = false;
  try {
    await git.pull('origin', baseBranch);
    mainSynced = true;
  } catch {
    // Pull might fail in worktree scenarios; continue with cleanup
  }

  // Delete local branch
  let branchDeleted = false;
  if (deleteBranch) {
    onProgress?.({ type: 'step_completed', message: `Deleting local branch ${branch}` });
    try {
      await git.deleteBranch(branch, true); // Force delete since it's merged
      branchDeleted = true;
    } catch {
      // Branch might not exist locally; that's okay
    }
  }

  // Remove worktree if applicable
  let worktreeRemoved = false;
  if (removeWorktree && isInWorktree && worktreePath) {
    onProgress?.({ type: 'step_completed', message: `Removing worktree at ${worktreePath}` });
    try {
      await git.removeWorktree(worktreePath);
      worktreeRemoved = true;
    } catch {
      // Worktree removal might fail; report but don't throw
    }
  }

  onProgress?.({ type: 'step_completed', message: 'Merge complete' });

  return {
    pullRequest: mergedPr,
    mainSynced,
    branchDeleted,
    worktreeRemoved,
    worktreePath: worktreeRemoved ? worktreePath : undefined,
  };
}

