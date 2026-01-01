/**
 * Submit workflow - commit, push, create PR, and archive change
 */

import { type GitAdapter } from '../adapters/git-adapter.js';
import { type GitHubAdapter } from '../adapters/github-adapter.js';
import { type OpenSpecAdapter } from '../adapters/openspec-adapter.js';
import { type SpecLifeConfig } from '../config.js';
import { SpecLifeError, ErrorCodes, type PullRequest, type ProgressCallback } from '../types.js';

export interface SubmitOptions {
  /** Change ID to submit */
  changeId: string;
  /** Create PR as draft */
  draft?: boolean;
  /** Custom commit message (defaults to proposal-based message) */
  commitMessage?: string;
  /** Skip archiving the change */
  skipArchive?: boolean;
}

export interface SubmitResult {
  /** Commit SHA */
  commitSha: string;
  /** Branch that was pushed */
  branch: string;
  /** Created or existing PR */
  pullRequest: PullRequest;
  /** Whether PR was newly created or already existed */
  prCreated: boolean;
  /** Whether an existing draft PR was marked ready for review */
  prMarkedReady: boolean;
  /** Whether change was archived */
  archived: boolean;
}

interface SubmitDependencies {
  git: GitAdapter;
  github: GitHubAdapter;
  openspec: OpenSpecAdapter;
  config: SpecLifeConfig;
}

/**
 * Submit a change: commit, push, create PR, archive
 */
export async function submitWorkflow(
  options: SubmitOptions,
  deps: SubmitDependencies,
  onProgress?: ProgressCallback
): Promise<SubmitResult> {
  const { changeId, draft = false, commitMessage, skipArchive = false } = options;
  const { git, github, openspec, config } = deps;

  const branch = `spec/${changeId}`;

  // Verify we're on the right branch
  const currentBranch = await git.getCurrentBranch();
  if (currentBranch !== branch) {
    throw new SpecLifeError(
      ErrorCodes.CONFIG_INVALID,
      `Must be on branch '${branch}' to submit. Currently on '${currentBranch}'`,
      { expected: branch, actual: currentBranch }
    );
  }

  // Check if change exists
  if (!await openspec.changeExists(changeId)) {
    throw new SpecLifeError(
      ErrorCodes.CHANGE_NOT_FOUND,
      `Change '${changeId}' not found`,
      { changeId }
    );
  }

  // Get git status
  const status = await git.status();
  const hasChanges = status.staged.length > 0 || 
                     status.unstaged.length > 0 || 
                     status.untracked.length > 0;

  // Read change for PR body
  const change = await openspec.readChange(changeId);
  
  // Generate commit message from proposal if not provided
  const message = commitMessage ?? generateCommitMessage(changeId, change.proposal.why);

  let commitSha = '';
  
  if (hasChanges) {
    // Stage all changes
    onProgress?.({ type: 'step_completed', message: 'Staging changes' });
    await git.add(['.']);

    // Commit
    onProgress?.({ type: 'step_completed', message: `Committing: ${message}` });
    commitSha = await git.commit(message);
  } else {
    // Get the current commit SHA even if no new changes
    const headStatus = await git.status();
    commitSha = headStatus.current ?? 'HEAD';
  }

  // Push to remote
  onProgress?.({ type: 'step_completed', message: `Pushing to origin/${branch}` });
  await git.push('origin', branch);

  // Check if PR already exists
  let pullRequest = await github.getPullRequestByBranch(branch);
  let prCreated = false;
  let prMarkedReady = false;

  if (!pullRequest) {
    // Create PR
    onProgress?.({ type: 'step_completed', message: 'Creating pull request' });
    
    const prBody = generatePRBody(change);
    pullRequest = await github.createPullRequest({
      title: generatePRTitle(changeId, change.proposal.why),
      body: prBody,
      head: branch,
      base: config.github.baseBranch,
      draft,
    });
    prCreated = true;
  } else {
    onProgress?.({ type: 'step_completed', message: `PR #${pullRequest.number} already exists` });
    
    // If the existing PR is a draft and we're not creating as draft, mark it ready
    if (pullRequest.draft && !draft) {
      onProgress?.({ type: 'step_completed', message: `Marking PR #${pullRequest.number} ready for review` });
      pullRequest = await github.markPullRequestReady(pullRequest.number);
      prMarkedReady = true;
    }
  }

  // Archive the change
  let archived = false;
  if (!skipArchive) {
    onProgress?.({ type: 'step_completed', message: 'Archiving change' });
    await openspec.archiveChange(changeId);
    
    // Commit and push the archive
    await git.add(['.']);
    await git.commit(`chore: archive ${changeId} change`);
    await git.push('origin', branch);
    archived = true;
  }

  onProgress?.({ type: 'step_completed', message: 'Submit complete' });

  return {
    commitSha,
    branch,
    pullRequest,
    prCreated,
    prMarkedReady,
    archived,
  };
}

/**
 * Generate a commit message from change ID and description
 */
function generateCommitMessage(changeId: string, why: string): string {
  // Extract first line/sentence of the why
  const firstLine = why.split('\n')[0].trim();
  const summary = firstLine.length > 50 
    ? firstLine.slice(0, 47) + '...'
    : firstLine;
  
  // Determine conventional commit type from changeId
  let type = 'feat';
  if (changeId.startsWith('fix-')) type = 'fix';
  else if (changeId.startsWith('refactor-')) type = 'refactor';
  else if (changeId.startsWith('docs-')) type = 'docs';
  else if (changeId.startsWith('test-')) type = 'test';
  else if (changeId.startsWith('chore-')) type = 'chore';
  
  return `${type}: ${summary}`;
}

/**
 * Generate PR title from change
 */
function generatePRTitle(changeId: string, why: string): string {
  const firstLine = why.split('\n')[0].trim();
  if (firstLine.length > 72) {
    return firstLine.slice(0, 69) + '...';
  }
  return firstLine || changeId.replace(/-/g, ' ');
}

/**
 * Generate PR body from change proposal
 */
function generatePRBody(change: { proposal: { why: string; whatChanges: string[] } }): string {
  const lines = [
    '## Why',
    change.proposal.why,
    '',
    '## What Changes',
  ];

  for (const item of change.proposal.whatChanges) {
    lines.push(`- ${item}`);
  }

  lines.push('', '---', '*Created with [SpecLife](https://github.com/malarbase/speclife)*');

  return lines.join('\n');
}

