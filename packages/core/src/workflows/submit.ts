/**
 * Submit workflow - commit, push, create PR, and archive change
 */

import { execa } from 'execa';
import { type GitAdapter } from '../adapters/git-adapter.js';
import { type GitHubAdapter } from '../adapters/github-adapter.js';
import { type OpenSpecAdapter } from '../adapters/openspec-adapter.js';
import { type SpecLifeConfig } from '../config.js';
import { SpecLifeError, ErrorCodes, type PullRequest, type ProgressCallback, type ValidationReport, type ValidationStatus } from '../types.js';

export interface SubmitOptions {
  /** Change ID to submit */
  changeId: string;
  /** Create PR as draft */
  draft?: boolean;
  /** Custom commit message (defaults to proposal-based message) */
  commitMessage?: string;
  /** Skip archiving the change */
  skipArchive?: boolean;
  /** Skip validation check */
  skipValidation?: boolean;
  /** Strict mode - fail on any validation warnings */
  strict?: boolean;
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
  /** Validation report (if validation was run) */
  validation?: ValidationReport;
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
  const { changeId, draft = false, commitMessage, skipArchive = false, skipValidation = false, strict = false } = options;
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

  // Run validation if not skipped
  let validation: ValidationReport | undefined;
  if (!skipValidation) {
    onProgress?.({ type: 'step_completed', message: 'Validating spec formatting and structure...' });
    try {
      const args = ['validate', changeId, '--json', '--no-interactive'];
      if (strict) {
        args.push('--strict');
      }
      
      const result = await execa('openspec', args, {
        cwd: process.cwd(),
        reject: false,
      });

      // Try to parse JSON output
      let output: Record<string, unknown> | undefined;
      try {
        output = JSON.parse(result.stdout);
      } catch {
        // If JSON parsing fails, treat as raw output
        validation = {
          status: result.exitCode === 0 ? 'pass' : 'fail',
          errors: result.exitCode !== 0 ? [result.stdout || result.stderr || 'Validation failed'] : [],
          warnings: [],
          output: result.stdout || result.stderr,
        };
      }

      if (output) {
        let status: ValidationStatus = 'pass';
        const errors = (output.errors as string[]) ?? [];
        const warnings = (output.warnings as string[]) ?? [];

        if (errors.length > 0 || output.valid === false) {
          status = 'fail';
        } else if (warnings.length > 0) {
          status = 'pass_with_warnings';
        }

        validation = {
          status,
          errors,
          warnings,
          output: result.stdout,
        };
      }

      if (validation) {
        onProgress?.({
          type: 'step_completed',
          message: `Validation: ${validation.status.toUpperCase().replace('_', ' ')}`,
        });

        if (strict && validation.status === 'pass_with_warnings') {
          throw new SpecLifeError(
            ErrorCodes.CONFIG_INVALID,
            `Validation failed in strict mode: ${validation.warnings.length} warnings`,
            { validation: validation as unknown as Record<string, unknown> }
          );
        }

        if (validation.status === 'fail') {
          throw new SpecLifeError(
            ErrorCodes.CONFIG_INVALID,
            `Validation failed: ${validation.errors.length} errors`,
            { validation: validation as unknown as Record<string, unknown> }
          );
        }
      }
    } catch (error) {
      if (error instanceof SpecLifeError) {
        throw error;
      }
      // openspec validate might not be available - continue without validation
      onProgress?.({ type: 'step_completed', message: `openspec validate not available: ${error instanceof Error ? error.message : String(error)}, proceeding` });
    }
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
    
    const prBody = generatePRBody(change, validation);
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

  // pullRequest is guaranteed non-null at this point
  // (either from getPullRequestByBranch or createPullRequest)
  return {
    commitSha,
    branch,
    pullRequest: pullRequest!,
    prCreated,
    prMarkedReady,
    archived,
    validation,
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
function generatePRBody(
  change: { proposal: { why: string; whatChanges: string[] } },
  validation?: ValidationReport
): string {
  const lines = [
    '## Why',
    change.proposal.why,
    '',
    '## What Changes',
  ];

  for (const item of change.proposal.whatChanges) {
    lines.push(`- ${item}`);
  }

  // Add validation section if validation was run
  if (validation) {
    lines.push('', '## Spec Validation');
    
    const statusEmoji = validation.status === 'pass' ? '✅' : 
                        validation.status === 'pass_with_warnings' ? '⚠️' : '❌';
    lines.push(`**Status:** ${statusEmoji} ${validation.status.replace(/_/g, ' ').toUpperCase()}`);
    
    if (validation.errors.length > 0) {
      lines.push('', '### Errors');
      for (const error of validation.errors) {
        lines.push(`- ❌ ${error}`);
      }
    }
    
    if (validation.warnings.length > 0) {
      lines.push('', '### Warnings');
      for (const warning of validation.warnings) {
        lines.push(`- ⚠️ ${warning}`);
      }
    }
  }

  lines.push('', '---', '*Created with [SpecLife](https://github.com/malarbase/speclife)*');

  return lines.join('\n');
}
