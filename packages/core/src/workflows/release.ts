/**
 * Release workflow for speclife_release
 * 
 * Creates a release PR with version bump, changelog, and git tag.
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { type GitAdapter } from '../adapters/git-adapter.js';
import { type GitHubAdapter } from '../adapters/github-adapter.js';
import {
  type ReleaseOptions,
  type ReleaseResult,
  type VersionBumpType,
  type CommitInfo,
  type ProgressCallback,
  SpecLifeError,
  ErrorCodes,
} from '../types.js';

/** Parse a conventional commit message */
export function parseConventionalCommit(message: string): { type?: string; scope?: string; isBreaking: boolean; description: string } {
  // Match conventional commit format: type(scope)!: description
  const match = message.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  
  if (!match) {
    return { isBreaking: message.includes('BREAKING CHANGE'), description: message };
  }
  
  const [, type, scope, bang, description] = match;
  const isBreaking = !!bang || message.includes('BREAKING CHANGE');
  
  return { type, scope, isBreaking, description };
}

/** Determine version bump type from commits */
export function suggestVersionBump(commits: CommitInfo[], currentVersion: string): VersionBumpType {
  const isPreV1 = currentVersion.startsWith('0.');
  
  // Check for breaking changes
  const hasBreaking = commits.some(c => c.isBreaking);
  if (hasBreaking) {
    // Pre-1.0: breaking changes bump minor, not major
    return isPreV1 ? 'minor' : 'major';
  }
  
  // Check for features
  const hasFeature = commits.some(c => c.type === 'feat');
  if (hasFeature) {
    return 'minor';
  }
  
  // Default to patch
  return 'patch';
}

/** Bump a semver version */
export function bumpVersion(version: string, bumpType: VersionBumpType): string {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new SpecLifeError(ErrorCodes.CONFIG_INVALID, `Invalid version format: ${version}`);
  }
  
  let [, major, minor, patch] = match.map(Number);
  
  switch (bumpType) {
    case 'major':
      major++;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor++;
      patch = 0;
      break;
    case 'patch':
      patch++;
      break;
  }
  
  return `${major}.${minor}.${patch}`;
}

/** Generate changelog from commits */
export function generateChangelog(commits: CommitInfo[], version: string): string {
  const date = new Date().toISOString().split('T')[0];
  const lines: string[] = [`## [${version}](../../releases/tag/v${version}) (${date})`, ''];
  
  // Group commits by type
  const features = commits.filter(c => c.type === 'feat');
  const fixes = commits.filter(c => c.type === 'fix');
  const breaking = commits.filter(c => c.isBreaking);
  const other = commits.filter(c => !['feat', 'fix'].includes(c.type || '') && !c.isBreaking);
  
  if (breaking.length > 0) {
    lines.push('### ⚠ BREAKING CHANGES', '');
    for (const commit of breaking) {
      lines.push(`* ${commit.message}`);
    }
    lines.push('');
  }
  
  if (features.length > 0) {
    lines.push('### Features', '');
    for (const commit of features) {
      const parsed = parseConventionalCommit(commit.message);
      lines.push(`* ${parsed.description}`);
    }
    lines.push('');
  }
  
  if (fixes.length > 0) {
    lines.push('### Bug Fixes', '');
    for (const commit of fixes) {
      const parsed = parseConventionalCommit(commit.message);
      lines.push(`* ${parsed.description}`);
    }
    lines.push('');
  }
  
  if (other.length > 0) {
    lines.push('### Other Changes', '');
    for (const commit of other) {
      lines.push(`* ${commit.message}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/** Update package.json version in a directory */
async function updatePackageVersion(dir: string, version: string): Promise<void> {
  const pkgPath = join(dir, 'package.json');
  const content = await readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(content);
  pkg.version = version;
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

/** Main release workflow */
export async function releaseWorkflow(
  options: ReleaseOptions,
  adapters: {
    git: GitAdapter;
    github: GitHubAdapter;
    repoPath: string;
  },
  onProgress?: ProgressCallback
): Promise<ReleaseResult> {
  const { git, github, repoPath } = adapters;
  
  // Get latest tag
  onProgress?.({ type: 'step_completed', message: 'Finding latest release...' });
  const latestTag = await git.getLatestTag();
  const previousVersion = latestTag ? latestTag.replace(/^v/, '') : '0.0.0';
  
  // Get commits since last tag
  onProgress?.({ type: 'step_completed', message: 'Analyzing commits...' });
  const rawCommits = latestTag 
    ? await git.getCommitsSince(latestTag)
    : await git.getCommitsSince('HEAD~20'); // Fallback: last 20 commits
  
  if (rawCommits.length === 0) {
    throw new SpecLifeError(ErrorCodes.NO_CHANGES, 'No commits found since last release');
  }
  
  // Parse commits
  const commits: CommitInfo[] = rawCommits.map(({ sha, message }) => {
    const parsed = parseConventionalCommit(message);
    return {
      sha,
      message,
      type: parsed.type,
      scope: parsed.scope,
      isBreaking: parsed.isBreaking,
    };
  });
  
  // Determine version
  const bumpType = suggestVersionBump(commits, previousVersion);
  const newVersion = options.version || bumpVersion(previousVersion, bumpType);
  
  onProgress?.({ type: 'step_completed', message: `Version: ${previousVersion} → ${newVersion} (${bumpType})` });
  
  // Generate changelog
  const changelog = options.skipChangelog ? undefined : generateChangelog(commits, newVersion);
  
  // Dry run - return analysis without making changes
  if (options.dryRun) {
    return {
      version: newVersion,
      previousVersion,
      bumpType,
      commits,
      changelog,
    };
  }
  
  // Create release branch
  const releaseBranch = `release/v${newVersion}`;
  onProgress?.({ type: 'step_completed', message: `Creating branch: ${releaseBranch}` });
  await git.createBranch(releaseBranch, 'main');
  
  // Update package.json versions
  onProgress?.({ type: 'step_completed', message: 'Updating package versions...' });
  await updatePackageVersion(repoPath, newVersion);
  await updatePackageVersion(join(repoPath, 'packages/core'), newVersion);
  await updatePackageVersion(join(repoPath, 'packages/cli'), newVersion);
  await updatePackageVersion(join(repoPath, 'packages/mcp-server'), newVersion);
  
  // Commit changes
  await git.add(['.']);
  await git.commit(`chore(release): v${newVersion}`);
  
  // Push branch
  onProgress?.({ type: 'step_completed', message: 'Pushing release branch...' });
  await git.push('origin', releaseBranch, true);
  
  // Create PR
  onProgress?.({ type: 'step_completed', message: 'Creating release PR...' });
  const prBody = `## Release v${newVersion}

${changelog || 'No changelog generated.'}

---

When merged:
1. A git tag \`v${newVersion}\` will be created
2. A GitHub Release will be published
3. Packages will be published to npm

*Created with [SpecLife](https://github.com/malarbase/speclife)*`;

  const pr = await github.createPullRequest({
    title: `chore(release): v${newVersion}`,
    head: releaseBranch,
    base: 'main',
    body: prBody,
    draft: false,
  });
  
  onProgress?.({ type: 'step_completed', message: `Created PR #${pr.number}: ${pr.url}` });
  
  // Enable auto-merge if requested
  let autoMergeEnabled = false;
  if (options.autoMerge) {
    onProgress?.({ type: 'step_completed', message: 'Enabling auto-merge...' });
    autoMergeEnabled = await github.enableAutoMerge(pr.number, 'SQUASH');
    if (autoMergeEnabled) {
      onProgress?.({ type: 'step_completed', message: 'Auto-merge enabled - PR will merge when CI passes' });
    } else {
      onProgress?.({ type: 'step_completed', message: 'Auto-merge not available (check repo settings)' });
    }
  }
  
  return {
    version: newVersion,
    previousVersion,
    bumpType,
    commits,
    changelog,
    prUrl: pr.url,
    branch: releaseBranch,
    autoMergeEnabled,
  };
}

