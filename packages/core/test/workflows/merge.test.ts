/**
 * Merge workflow tests
 * 
 * Tests PR merge, branch cleanup, and worktree removal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mergeWorkflow } from '../../src/workflows/merge.js';
import { 
  createMockGitAdapter, 
  createMockGitHubAdapter,
  type MockGitAdapter,
  type MockGitHubAdapter,
} from '../helpers.js';
import type { SpecLifeConfig } from '../../src/config.js';
import { SpecLifeError } from '../../src/types.js';

describe('mergeWorkflow', () => {
  let mockGit: MockGitAdapter;
  let mockGithub: MockGitHubAdapter;
  let mockConfig: SpecLifeConfig;

  beforeEach(() => {
    mockGit = createMockGitAdapter();
    mockGithub = createMockGitHubAdapter({
      getPullRequestByBranch: vi.fn().mockResolvedValue({
        number: 42,
        url: 'https://github.com/test/repo/pull/42',
        state: 'open',
        draft: false,
        mergeable: true,
      }),
      getPullRequest: vi.fn().mockResolvedValue({
        number: 42,
        url: 'https://github.com/test/repo/pull/42',
        state: 'open',
        draft: false,
        mergeable: true,
      }),
      isPullRequestMergeable: vi.fn().mockResolvedValue({ mergeable: true }),
      mergePullRequest: vi.fn().mockResolvedValue(undefined),
    });
    mockConfig = {
      specDir: 'openspec',
      aiProvider: 'claude',
      aiModel: 'claude-sonnet-4-20250514',
      github: {
        owner: 'test-owner',
        repo: 'test-repo',
        baseBranch: 'main',
      },
      createDraftPR: false,
    } as SpecLifeConfig;
  });

  describe('PR lookup', () => {
    it('throws when no PR exists for branch', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      await expect(mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      )).rejects.toThrow(SpecLifeError);
    });

    it('throws when PR is already merged', async () => {
      mockGithub.getPullRequest = vi.fn().mockResolvedValue({
        number: 42,
        url: 'https://github.com/test/repo/pull/42',
        state: 'merged',
        draft: false,
      });

      await expect(mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      )).rejects.toThrow(/already merged/);
    });

    it('throws when PR is not mergeable', async () => {
      mockGithub.isPullRequestMergeable = vi.fn().mockResolvedValue({
        mergeable: false,
        reason: 'Conflicts detected',
      });

      await expect(mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      )).rejects.toThrow(/not mergeable/);
    });
  });

  describe('merge', () => {
    it('merges with squash by default', async () => {
      await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(mockGithub.mergePullRequest).toHaveBeenCalledWith(42, 'squash');
    });

    it('merges with specified method', async () => {
      await mergeWorkflow(
        { changeId: 'add-feature', method: 'rebase' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(mockGithub.mergePullRequest).toHaveBeenCalledWith(42, 'rebase');
    });

    it('returns merged PR info', async () => {
      mockGithub.getPullRequest = vi.fn()
        .mockResolvedValueOnce({ number: 42, state: 'open', draft: false, mergeable: true })
        .mockResolvedValueOnce({ number: 42, state: 'merged', draft: false });

      const result = await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(result.pullRequest.number).toBe(42);
    });
  });

  describe('main branch sync', () => {
    it('checks out base branch after merge', async () => {
      await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(mockGit.checkout).toHaveBeenCalledWith('main');
    });

    it('pulls latest from origin', async () => {
      await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(mockGit.pull).toHaveBeenCalledWith('origin', 'main');
    });

    it('continues when pull fails', async () => {
      mockGit.pull.mockRejectedValue(new Error('Pull failed'));

      const result = await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(result.mainSynced).toBe(false);
    });

    it('reports mainSynced true on success', async () => {
      const result = await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(result.mainSynced).toBe(true);
    });
  });

  describe('branch cleanup', () => {
    it('deletes local branch by default', async () => {
      await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(mockGit.deleteBranch).toHaveBeenCalledWith('spec/add-feature', true);
    });

    it('skips branch deletion when deleteBranch is false', async () => {
      await mergeWorkflow(
        { changeId: 'add-feature', deleteBranch: false },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(mockGit.deleteBranch).not.toHaveBeenCalled();
    });

    it('continues when branch deletion fails', async () => {
      mockGit.deleteBranch.mockRejectedValue(new Error('Branch not found'));

      const result = await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(result.branchDeleted).toBe(false);
    });

    it('reports branchDeleted true on success', async () => {
      const result = await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(result.branchDeleted).toBe(true);
    });
  });

  describe('worktree cleanup', () => {
    it('removes worktree when present', async () => {
      mockGit.listWorktrees.mockResolvedValue([
        { path: '/worktrees/add-feature', branch: 'spec/add-feature' },
      ]);

      const result = await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(mockGit.removeWorktree).toHaveBeenCalledWith('/worktrees/add-feature');
      expect(result.worktreeRemoved).toBe(true);
      expect(result.worktreePath).toBe('/worktrees/add-feature');
    });

    it('skips worktree removal when removeWorktree is false', async () => {
      mockGit.listWorktrees.mockResolvedValue([
        { path: '/worktrees/add-feature', branch: 'spec/add-feature' },
      ]);

      await mergeWorkflow(
        { changeId: 'add-feature', removeWorktree: false },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(mockGit.removeWorktree).not.toHaveBeenCalled();
    });

    it('does nothing when no worktree exists', async () => {
      mockGit.listWorktrees.mockResolvedValue([]);

      const result = await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(mockGit.removeWorktree).not.toHaveBeenCalled();
      expect(result.worktreeRemoved).toBe(false);
    });

    it('continues when worktree removal fails', async () => {
      mockGit.listWorktrees.mockResolvedValue([
        { path: '/worktrees/add-feature', branch: 'spec/add-feature' },
      ]);
      mockGit.removeWorktree.mockRejectedValue(new Error('Worktree busy'));

      const result = await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(result.worktreeRemoved).toBe(false);
    });
  });

  describe('repoPath', () => {
    it('returns main worktree path', async () => {
      mockGit.getMainWorktreePath.mockResolvedValue('/main/repo');

      const result = await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig }
      );

      expect(result.repoPath).toBe('/main/repo');
    });
  });

  describe('progress callbacks', () => {
    it('calls progress callback at each step', async () => {
      const progressFn = vi.fn();

      await mergeWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, config: mockConfig },
        progressFn
      );

      expect(progressFn).toHaveBeenCalled();
      expect(progressFn).toHaveBeenCalledWith(expect.objectContaining({
        type: 'step_completed',
      }));
    });
  });
});

