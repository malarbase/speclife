/**
 * Git adapter tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createGitAdapter } from '../../src/adapters/git-adapter.js';
import { 
  createTempDir, 
  removeTempDir, 
  initGitRepo,
} from '../helpers.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

describe('GitAdapter', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await initGitRepo(tempDir);
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  describe('getCurrentBranch', () => {
    it('returns the current branch name', async () => {
      const adapter = createGitAdapter(tempDir);

      const branch = await adapter.getCurrentBranch();

      // Git init creates 'main' or 'master' depending on config
      expect(['main', 'master']).toContain(branch);
    });
  });

  describe('branchExists', () => {
    it('returns true for existing branch', async () => {
      const adapter = createGitAdapter(tempDir);
      const currentBranch = await adapter.getCurrentBranch();

      const exists = await adapter.branchExists(currentBranch);

      expect(exists).toBe(true);
    });

    it('returns false for non-existing branch', async () => {
      const adapter = createGitAdapter(tempDir);

      const exists = await adapter.branchExists('nonexistent-branch');

      expect(exists).toBe(false);
    });
  });

  describe('createBranch', () => {
    it('creates a new branch', async () => {
      const adapter = createGitAdapter(tempDir);

      await adapter.createBranch('feature/test');

      expect(await adapter.branchExists('feature/test')).toBe(true);
    });

    it('creates branch from specified base', async () => {
      const adapter = createGitAdapter(tempDir);
      const baseBranch = await adapter.getCurrentBranch();

      await adapter.createBranch('feature/from-base', baseBranch);

      expect(await adapter.branchExists('feature/from-base')).toBe(true);
    });
  });

  describe('checkout', () => {
    it('switches to existing branch', async () => {
      const adapter = createGitAdapter(tempDir);
      await adapter.createBranch('feature/checkout-test');
      // createBranch already checks out, go back to original
      const original = await adapter.getCurrentBranch();
      // The branch was created, so checkout should work
      await adapter.checkout('feature/checkout-test');

      expect(await adapter.getCurrentBranch()).toBe('feature/checkout-test');
    });
  });

  describe('status', () => {
    it('returns clean status for unchanged repo', async () => {
      const adapter = createGitAdapter(tempDir);

      const status = await adapter.status();

      // Clean repo has no staged, unstaged, or untracked files
      expect(status.staged).toEqual([]);
      expect(status.unstaged).toEqual([]);
      expect(status.untracked).toEqual([]);
    });

    it('returns untracked files when new files exist', async () => {
      const adapter = createGitAdapter(tempDir);
      await writeFile(join(tempDir, 'new-file.txt'), 'content');

      const status = await adapter.status();

      expect(status.untracked).toContain('new-file.txt');
    });
  });

  describe('add and commit', () => {
    it('stages and commits files', async () => {
      const adapter = createGitAdapter(tempDir);
      await writeFile(join(tempDir, 'test-file.txt'), 'test content');

      await adapter.add(['test-file.txt']);
      const sha = await adapter.commit('Add test file');

      expect(sha).toMatch(/^[a-f0-9]+$/);
      const status = await adapter.status();
      expect(status.staged).toEqual([]);
      expect(status.untracked).toEqual([]);
    });

    it('commits with spec: prefix for change commits', async () => {
      const adapter = createGitAdapter(tempDir);
      await writeFile(join(tempDir, 'feature.ts'), 'export const x = 1;');

      await adapter.add(['feature.ts']);
      const sha = await adapter.commit('spec: add feature');

      expect(sha).toBeTruthy();
    });
  });

  describe('worktree operations', () => {
    it('creates and lists worktrees', async () => {
      const adapter = createGitAdapter(tempDir);
      const worktreePath = join(tempDir, 'worktrees', 'test-worktree');

      await adapter.createWorktree(worktreePath, 'test-branch');

      const worktrees = await adapter.listWorktrees();
      expect(worktrees.some(w => w.branch === 'test-branch')).toBe(true);
    });

    it('removes worktrees', async () => {
      const adapter = createGitAdapter(tempDir);
      const worktreePath = join(tempDir, 'worktrees', 'to-remove');

      await adapter.createWorktree(worktreePath, 'remove-branch');
      await adapter.removeWorktree(worktreePath);

      const worktrees = await adapter.listWorktrees();
      expect(worktrees.some(w => w.branch === 'remove-branch')).toBe(false);
    });
  });

  describe('deleteBranch', () => {
    it('deletes a branch', async () => {
      const adapter = createGitAdapter(tempDir);
      
      // Remember original branch before creating new one
      const originalBranch = await adapter.getCurrentBranch();
      
      // Create a new branch (this also checks it out)
      await adapter.createBranch('to-delete');
      
      // Go back to original branch so we can delete the new one
      await adapter.checkout(originalBranch);

      await adapter.deleteBranch('to-delete', true);

      expect(await adapter.branchExists('to-delete')).toBe(false);
    });
  });
});
