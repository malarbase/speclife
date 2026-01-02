/**
 * Test helper utilities
 */

import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

/**
 * Create a temporary directory for testing
 */
export async function createTempDir(prefix = 'speclife-test-'): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

/**
 * Remove a temporary directory
 */
export async function removeTempDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

/**
 * Initialize a git repo in a directory
 */
export async function initGitRepo(dir: string): Promise<void> {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: dir, stdio: 'pipe' });
  
  // Create initial commit so we have a valid repo
  await writeFile(join(dir, 'README.md'), '# Test Repo\n');
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: 'pipe' });
}

/**
 * Create openspec directory structure
 */
export async function createOpenSpecStructure(dir: string): Promise<void> {
  await mkdir(join(dir, 'openspec', 'changes'), { recursive: true });
  await mkdir(join(dir, 'openspec', 'specs'), { recursive: true });
  
  // Create minimal project.md
  await writeFile(
    join(dir, 'openspec', 'project.md'),
    '# Test Project\n\nA test project for unit tests.\n'
  );
}

/**
 * Create a mock change in the openspec structure
 */
export async function createMockChange(
  dir: string,
  changeId: string,
  options: {
    proposal?: string;
    tasks?: string;
  } = {}
): Promise<void> {
  const changeDir = join(dir, 'openspec', 'changes', changeId);
  await mkdir(changeDir, { recursive: true });
  
  await writeFile(
    join(changeDir, 'proposal.md'),
    options.proposal ?? `## Why\nTest change for ${changeId}\n\n## What Changes\n- Test changes\n`
  );
  
  await writeFile(
    join(changeDir, 'tasks.md'),
    options.tasks ?? `## 1. Implementation\n- [ ] 1.1 First task\n- [ ] 1.2 Second task\n`
  );
}

/**
 * Create a speclife config file
 */
export async function createSpecLifeConfig(
  dir: string,
  config: Record<string, unknown> = {}
): Promise<void> {
  const defaultConfig = {
    specDir: 'openspec',
    aiProvider: 'claude',
    aiModel: 'claude-sonnet-4-20250514',
    github: {
      owner: 'test-owner',
      repo: 'test-repo',
      baseBranch: 'main',
    },
    testCommand: 'npm test',
    createDraftPR: false,
    ...config,
  };
  
  await writeFile(
    join(dir, '.specliferc.json'),
    JSON.stringify(defaultConfig, null, 2)
  );
}

/**
 * Mock GitAdapter factory
 */
export function createMockGitAdapter(overrides: Partial<MockGitAdapter> = {}): MockGitAdapter {
  return {
    createBranch: vi.fn().mockResolvedValue(undefined),
    checkout: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue('abc123'),
    push: vi.fn().mockResolvedValue(undefined),
    getCurrentBranch: vi.fn().mockResolvedValue('main'),
    branchExists: vi.fn().mockResolvedValue(false),
    status: vi.fn().mockResolvedValue({ current: 'main', staged: [], unstaged: [], untracked: [] }),
    pull: vi.fn().mockResolvedValue(undefined),
    deleteBranch: vi.fn().mockResolvedValue(undefined),
    createWorktree: vi.fn().mockResolvedValue(undefined),
    removeWorktree: vi.fn().mockResolvedValue(undefined),
    listWorktrees: vi.fn().mockResolvedValue([]),
    getMainWorktreePath: vi.fn().mockResolvedValue('/mock/main/repo'),
    // Tag operations for releases
    getLatestTag: vi.fn().mockResolvedValue(null),
    getCommitsSince: vi.fn().mockResolvedValue([]),
    createTag: vi.fn().mockResolvedValue(undefined),
    tagExists: vi.fn().mockResolvedValue(false),
    // Diff operation
    diff: vi.fn().mockResolvedValue(''),
    ...overrides,
  };
}

// Import vi for mocking
import { vi } from 'vitest';

export interface MockGitAdapter {
  createBranch: ReturnType<typeof vi.fn>;
  checkout: ReturnType<typeof vi.fn>;
  add: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
  push: ReturnType<typeof vi.fn>;
  getCurrentBranch: ReturnType<typeof vi.fn>;
  branchExists: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
  pull: ReturnType<typeof vi.fn>;
  deleteBranch: ReturnType<typeof vi.fn>;
  createWorktree: ReturnType<typeof vi.fn>;
  removeWorktree: ReturnType<typeof vi.fn>;
  listWorktrees: ReturnType<typeof vi.fn>;
  getMainWorktreePath: ReturnType<typeof vi.fn>;
  // Tag operations for releases
  getLatestTag: ReturnType<typeof vi.fn>;
  getCommitsSince: ReturnType<typeof vi.fn>;
  createTag: ReturnType<typeof vi.fn>;
  tagExists: ReturnType<typeof vi.fn>;
  // Diff operation
  diff: ReturnType<typeof vi.fn>;
}

/**
 * Mock GitHubAdapter factory
 */
export function createMockGitHubAdapter(overrides: Partial<MockGitHubAdapter> = {}): MockGitHubAdapter {
  return {
    createPullRequest: vi.fn().mockResolvedValue({
      number: 1,
      url: 'https://github.com/test/repo/pull/1',
      state: 'open',
      draft: false,
      mergeable: true,
    }),
    getPullRequest: vi.fn().mockResolvedValue({
      number: 1,
      url: 'https://github.com/test/repo/pull/1',
      state: 'open',
      draft: false,
      mergeable: true,
    }),
    getPullRequestByBranch: vi.fn().mockResolvedValue(null),
    isPullRequestMergeable: vi.fn().mockResolvedValue({ mergeable: true }),
    mergePullRequest: vi.fn().mockResolvedValue(undefined),
    updatePullRequest: vi.fn().mockResolvedValue({
      number: 1,
      url: 'https://github.com/test/repo/pull/1',
      state: 'open',
      draft: false,
      mergeable: true,
    }),
    markPullRequestReady: vi.fn().mockResolvedValue({
      number: 1,
      url: 'https://github.com/test/repo/pull/1',
      state: 'open',
      draft: false,
      mergeable: true,
    }),
    enableAutoMerge: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

export interface MockGitHubAdapter {
  createPullRequest: ReturnType<typeof vi.fn>;
  getPullRequest: ReturnType<typeof vi.fn>;
  getPullRequestByBranch: ReturnType<typeof vi.fn>;
  isPullRequestMergeable: ReturnType<typeof vi.fn>;
  mergePullRequest: ReturnType<typeof vi.fn>;
  updatePullRequest: ReturnType<typeof vi.fn>;
  markPullRequestReady: ReturnType<typeof vi.fn>;
  enableAutoMerge: ReturnType<typeof vi.fn>;
}

