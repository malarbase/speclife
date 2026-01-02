/**
 * Merge workflow - merge PR, sync main, cleanup worktree
 */

import { execa } from 'execa';
import { type GitAdapter, createGitAdapter } from '../adapters/git-adapter.js';
import { type GitHubAdapter } from '../adapters/github-adapter.js';
import { type ClaudeCliAdapter, generateVersionAnalysisPrompt } from '../adapters/claude-cli-adapter.js';
import { type OpenSpecAdapter } from '../adapters/openspec-adapter.js';
import { type SpecLifeConfig } from '../config.js';
import { 
  SpecLifeError, 
  ErrorCodes, 
  type PullRequest, 
  type Release,
  type ProgressCallback,
  type VersionBumpOption,
  type VersionBumpType,
  type VersionAnalysis,
} from '../types.js';

export interface MergeOptions {
  /** Change ID to merge */
  changeId: string;
  /** Merge method: squash (default), merge, or rebase */
  method?: 'squash' | 'merge' | 'rebase';
  /** Delete local branch after merge */
  deleteBranch?: boolean;
  /** Remove worktree after merge (if in worktree) */
  removeWorktree?: boolean;
  /** Version bump type: 'auto' uses AI analysis, 'none' skips bump (default: 'auto') */
  versionBump?: VersionBumpOption;
  /** Create GitHub release after version bump (default: true when version is bumped) */
  createRelease?: boolean;
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
  /** Version analysis result (if versionBump was 'auto') */
  versionAnalysis?: VersionAnalysis;
  /** New version after bump (if version was bumped) */
  newVersion?: string;
  /** GitHub release created (if createRelease was enabled) */
  release?: Release;
}

interface MergeDependencies {
  git: GitAdapter;
  github: GitHubAdapter;
  config: SpecLifeConfig;
  /** Required for 'auto' version bump */
  claudeCli?: ClaudeCliAdapter;
  /** Required for 'auto' version bump */
  openspec?: OpenSpecAdapter;
}

/**
 * Analyze the change to determine appropriate version bump
 */
async function analyzeVersionBump(
  changeId: string,
  prNumber: number,
  deps: Required<Pick<MergeDependencies, 'github' | 'claudeCli' | 'openspec'>>,
  onProgress?: ProgressCallback
): Promise<VersionAnalysis> {
  const { github, claudeCli, openspec } = deps;
  
  onProgress?.({ type: 'step_completed', message: 'Reading proposal for version analysis' });
  
  // Read the proposal
  const proposal = await openspec.readProposal(changeId);
  
  // Get PR diff
  onProgress?.({ type: 'step_completed', message: 'Fetching PR diff for analysis' });
  const diff = await github.getPullRequestDiff(prNumber);
  
  // Generate prompt and run analysis
  onProgress?.({ type: 'step_completed', message: 'Analyzing changes with AI' });
  const prompt = generateVersionAnalysisPrompt({
    changeId,
    proposal,
    diff,
  });
  
  const result = await claudeCli.run(prompt, {
    cwd: process.cwd(),
    maxTokens: 1000,
  });
  
  if (!result.success) {
    throw new SpecLifeError(
      ErrorCodes.AI_ERROR,
      `Version analysis failed: ${result.stderr}`,
      { changeId }
    );
  }
  
  // Parse the response
  const { parseVersionAnalysisResponse } = await import('../adapters/claude-cli-adapter.js');
  const analysis = parseVersionAnalysisResponse(result.stdout);
  
  if (!analysis) {
    // Default to patch if parsing fails
    return {
      bump: 'patch',
      reasoning: 'Could not parse AI response; defaulting to patch bump',
    };
  }
  
  return analysis;
}

/**
 * Bump package versions using npm version
 */
async function bumpVersion(
  bumpType: VersionBumpType,
  cwd: string,
  onProgress?: ProgressCallback
): Promise<string> {
  onProgress?.({ type: 'step_completed', message: `Bumping version (${bumpType})` });
  
  // Run npm version for all workspaces
  const result = await execa('npm', [
    'version',
    bumpType,
    '--workspaces',
    '--no-git-tag-version',
  ], {
    cwd,
    reject: false,
  });
  
  if (result.exitCode !== 0) {
    throw new SpecLifeError(
      ErrorCodes.CONFIG_INVALID,
      `Failed to bump version: ${result.stderr}`,
      { bumpType }
    );
  }
  
  // Get the new version from root package.json
  const pkgResult = await execa('node', [
    '-p',
    'require("./package.json").version',
  ], { cwd });
  
  return pkgResult.stdout.trim();
}

/**
 * Extract the "Why" section from a proposal
 */
function extractWhySection(proposal: string): string {
  const lines = proposal.split('\n');
  let inWhySection = false;
  const whyLines: string[] = [];
  
  for (const line of lines) {
    if (line.match(/^##?\s*Why/i)) {
      inWhySection = true;
      continue;
    }
    if (inWhySection && line.match(/^##?\s/)) {
      // Next section started
      break;
    }
    if (inWhySection) {
      whyLines.push(line);
    }
  }
  
  return whyLines.join('\n').trim() || 'No description provided.';
}

/**
 * Generate release notes from the change proposal and version analysis
 */
function generateReleaseNotes(
  changeId: string,
  proposal: string,
  versionAnalysis?: VersionAnalysis
): string {
  const sections: string[] = [];
  
  // Title from change ID
  const title = changeId.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  sections.push(`## ${title}`);
  sections.push('');
  
  // Why section from proposal
  const why = extractWhySection(proposal);
  sections.push(why);
  sections.push('');
  
  // Version analysis if available
  if (versionAnalysis) {
    sections.push(`### Version Bump: ${versionAnalysis.bump}`);
    sections.push('');
    sections.push(versionAnalysis.reasoning);
    sections.push('');
  }
  
  sections.push('---');
  sections.push('*Released via [SpecLife](https://github.com/malarbase/speclife)*');
  
  return sections.join('\n');
}

/**
 * Merge a submitted change: merge PR, sync main, cleanup
 */
export async function mergeWorkflow(
  options: MergeOptions,
  deps: MergeDependencies,
  onProgress?: ProgressCallback
): Promise<MergeResult> {
  const { changeId, method = 'squash', deleteBranch = true, removeWorktree = true, versionBump = 'auto', createRelease = true } = options;
  const { git, github, config, claudeCli, openspec } = deps;

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

  // Analyze version bump if set to 'auto'
  let versionAnalysis: VersionAnalysis | undefined;
  let bumpType: VersionBumpType | undefined;
  
  if (versionBump === 'auto') {
    if (!claudeCli || !openspec) {
      throw new SpecLifeError(
        ErrorCodes.CONFIG_INVALID,
        "Version bump 'auto' requires claudeCli and openspec adapters",
        { changeId }
      );
    }
    
    versionAnalysis = await analyzeVersionBump(changeId, pr.number, { github, claudeCli, openspec }, onProgress);
    bumpType = versionAnalysis.bump;
    
    onProgress?.({ 
      type: 'step_completed', 
      message: `Version analysis: ${versionAnalysis.bump} - ${versionAnalysis.reasoning}`,
      data: { versionAnalysis }
    });
  } else if (versionBump !== 'none') {
    bumpType = versionBump;
  }

  // Find worktree for this branch (if any)
  let worktreePath: string | undefined;
  
  const worktrees = await git.listWorktrees();
  
  for (const wt of worktrees) {
    if (wt.branch === branch) {
      worktreePath = wt.path;
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

  // Execute version bump if needed (always from main repo, not worktree)
  let newVersion: string | undefined;
  let versionCommitSha: string | undefined;
  if (bumpType && mainSynced) {
    // Get the main repo path - version bump must happen there, not in a worktree
    const mainRepoPath = await git.getMainWorktreePath();
    
    newVersion = await bumpVersion(bumpType, mainRepoPath, onProgress);
    
    // Create a git adapter for the main repo to commit/push
    const mainGit = createGitAdapter(mainRepoPath);
    
    // Commit version bump
    onProgress?.({ type: 'step_completed', message: `Committing version bump to ${newVersion}` });
    await mainGit.add(['package.json', 'package-lock.json', 'packages/*/package.json']);
    versionCommitSha = await mainGit.commit(`chore: release v${newVersion}`);
    
    // Push to remote
    onProgress?.({ type: 'step_completed', message: 'Pushing version bump' });
    await mainGit.push('origin', baseBranch);
  }

  // Create GitHub release if requested and version was bumped
  let release: Release | undefined;
  if (createRelease && newVersion && versionCommitSha) {
    onProgress?.({ type: 'step_completed', message: `Creating tag v${newVersion}` });
    
    // Create tag via GitHub API
    const tag = `v${newVersion}`;
    await github.createTag({
      tag,
      sha: versionCommitSha,
      message: `Release ${tag}`,
    });
    
    // Read proposal for release notes
    let proposal = '';
    if (openspec) {
      try {
        proposal = await openspec.readProposal(changeId);
      } catch {
        // Proposal might not exist; continue with minimal notes
      }
    }
    
    // Generate release notes
    const releaseNotes = generateReleaseNotes(changeId, proposal, versionAnalysis);
    
    // Create GitHub release
    onProgress?.({ type: 'step_completed', message: `Creating GitHub release ${tag}` });
    release = await github.createRelease({
      tag,
      name: tag,
      body: releaseNotes,
    });
    
    onProgress?.({ type: 'step_completed', message: `Released: ${release.url}` });
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
  if (removeWorktree && worktreePath) {
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
    versionAnalysis,
    newVersion,
    release,
  };
}

