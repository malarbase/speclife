/**
 * Submit workflow tests
 * 
 * Tests commit flow, PR creation, and archiving.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { submitWorkflow } from '../../src/workflows/submit.js';
import { 
  createMockGitAdapter, 
  createMockGitHubAdapter,
  type MockGitAdapter,
  type MockGitHubAdapter,
} from '../helpers.js';
import type { SpecLifeConfig } from '../../src/config.js';
import { SpecLifeError } from '../../src/types.js';
import type { OpenSpecAdapter } from '../../src/adapters/openspec-adapter.js';

// Mock openspec adapter
function createMockOpenSpecAdapter(overrides: Partial<MockOpenSpecAdapter> = {}): MockOpenSpecAdapter {
  return {
    scaffoldChange: vi.fn().mockResolvedValue({ proposalPath: '', tasksPath: '' }),
    readChange: vi.fn().mockResolvedValue({
      proposal: {
        why: 'Add a new feature for users',
        whatChanges: ['Update API', 'Add tests'],
      },
    }),
    readProposal: vi.fn().mockResolvedValue(''),
    listChanges: vi.fn().mockResolvedValue([]),
    changeExists: vi.fn().mockResolvedValue(true),
    archiveChange: vi.fn().mockResolvedValue(undefined),
    updateTasks: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

type MockOpenSpecAdapter = {
  [K in keyof OpenSpecAdapter]: ReturnType<typeof vi.fn>;
};

describe('submitWorkflow', () => {
  let mockGit: MockGitAdapter;
  let mockGithub: MockGitHubAdapter;
  let mockOpenspec: MockOpenSpecAdapter;
  let mockConfig: SpecLifeConfig;

  beforeEach(() => {
    mockGit = createMockGitAdapter({
      getCurrentBranch: vi.fn().mockResolvedValue('spec/add-feature'),
      status: vi.fn().mockResolvedValue({
        current: 'spec/add-feature',
        staged: ['src/index.ts'],
        unstaged: [],
        untracked: [],
      }),
    });
    mockGithub = createMockGitHubAdapter();
    mockOpenspec = createMockOpenSpecAdapter();
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

  describe('branch validation', () => {
    it('throws when not on correct branch', async () => {
      mockGit.getCurrentBranch.mockResolvedValue('main');

      await expect(submitWorkflow(
        { changeId: 'add-feature' },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      )).rejects.toThrow(SpecLifeError);
    });

    it('proceeds when on correct branch', async () => {
      mockGit.getCurrentBranch.mockResolvedValue('spec/add-feature');
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      const result = await submitWorkflow(
        { changeId: 'add-feature', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(result.branch).toBe('spec/add-feature');
    });
  });

  describe('change existence', () => {
    it('throws when change does not exist', async () => {
      mockOpenspec.changeExists.mockResolvedValue(false);

      await expect(submitWorkflow(
        { changeId: 'nonexistent' },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      )).rejects.toThrow(SpecLifeError);
    });
  });

  describe('commit flow', () => {
    it('stages and commits when there are changes', async () => {
      mockGit.status.mockResolvedValue({
        current: 'spec/add-feature',
        staged: [],
        unstaged: ['src/api.ts'],
        untracked: ['src/new.ts'],
      });
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      await submitWorkflow(
        { changeId: 'add-feature', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(mockGit.add).toHaveBeenCalledWith(['.']);
      expect(mockGit.commit).toHaveBeenCalled();
    });

    it('uses custom commit message when provided', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      await submitWorkflow(
        { changeId: 'add-feature', commitMessage: 'Custom commit', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(mockGit.commit).toHaveBeenCalledWith('Custom commit');
    });

    it('generates commit message from proposal', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      await submitWorkflow(
        { changeId: 'add-feature', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(mockGit.commit).toHaveBeenCalledWith(expect.stringContaining('feat:'));
    });

    it('uses fix type for fix- prefixed changeId', async () => {
      mockGit.getCurrentBranch.mockResolvedValue('spec/fix-bug');
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      await submitWorkflow(
        { changeId: 'fix-bug', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(mockGit.commit).toHaveBeenCalledWith(expect.stringContaining('fix:'));
    });
  });

  describe('push', () => {
    it('pushes to origin', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      await submitWorkflow(
        { changeId: 'add-feature', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(mockGit.push).toHaveBeenCalledWith('origin', 'spec/add-feature');
    });
  });

  describe('PR creation', () => {
    it('creates PR when none exists', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      const result = await submitWorkflow(
        { changeId: 'add-feature', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(result.prCreated).toBe(true);
      expect(mockGithub.createPullRequest).toHaveBeenCalledWith(expect.objectContaining({
        head: 'spec/add-feature',
        base: 'main',
      }));
    });

    it('creates draft PR when requested', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      await submitWorkflow(
        { changeId: 'add-feature', draft: true, skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(mockGithub.createPullRequest).toHaveBeenCalledWith(expect.objectContaining({
        draft: true,
      }));
    });

    it('skips PR creation when PR already exists', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue({
        number: 42,
        url: 'https://github.com/test/repo/pull/42',
        state: 'open',
        draft: false,
      });

      const result = await submitWorkflow(
        { changeId: 'add-feature', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(result.prCreated).toBe(false);
      expect(result.pullRequest.number).toBe(42);
      expect(mockGithub.createPullRequest).not.toHaveBeenCalled();
    });

    it('marks draft PR ready when submitting non-draft', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue({
        number: 43,
        url: 'https://github.com/test/repo/pull/43',
        state: 'open',
        draft: true,
      });

      const result = await submitWorkflow(
        { changeId: 'add-feature', draft: false, skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(result.prMarkedReady).toBe(true);
      expect(mockGithub.markPullRequestReady).toHaveBeenCalledWith(43);
    });
  });

  describe('archiving', () => {
    it('archives change by default', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      const result = await submitWorkflow(
        { changeId: 'add-feature', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(result.archived).toBe(true);
      expect(mockOpenspec.archiveChange).toHaveBeenCalledWith('add-feature');
    });

    it('commits and pushes archive', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      await submitWorkflow(
        { changeId: 'add-feature', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      // Should be called twice: once for changes, once for archive
      expect(mockGit.commit).toHaveBeenCalledTimes(2);
      expect(mockGit.push).toHaveBeenCalledTimes(2);
    });

    it('skips archiving when skipArchive is true', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      const result = await submitWorkflow(
        { changeId: 'add-feature', skipArchive: true, skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      expect(result.archived).toBe(false);
      expect(mockOpenspec.archiveChange).not.toHaveBeenCalled();
    });
  });

  describe('progress callbacks', () => {
    it('calls progress callback at each step', async () => {
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);
      const progressFn = vi.fn();

      await submitWorkflow(
        { changeId: 'add-feature', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig },
        progressFn
      );

      expect(progressFn).toHaveBeenCalled();
      expect(progressFn).toHaveBeenCalledWith(expect.objectContaining({
        type: 'step_completed',
      }));
    });
  });

  describe('no changes scenario', () => {
    it('handles when there are no changes to commit', async () => {
      mockGit.status.mockResolvedValue({
        current: 'spec/add-feature',
        staged: [],
        unstaged: [],
        untracked: [],
      });
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);

      const result = await submitWorkflow(
        { changeId: 'add-feature', skipValidation: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      // Should still create PR even without code changes
      expect(result.pullRequest).toBeDefined();
      // First commit call is skipped (no changes), but archive still commits
      expect(mockGit.commit).toHaveBeenCalledTimes(1);
      expect(mockGit.commit).toHaveBeenCalledWith(expect.stringContaining('archive'));
    });

    it('skips all commits when no changes and skipArchive', async () => {
      mockGit.status.mockResolvedValue({
        current: 'spec/add-feature',
        staged: [],
        unstaged: [],
        untracked: [],
      });
      mockGithub.getPullRequestByBranch = vi.fn().mockResolvedValue(null);
      mockGit.commit.mockClear();

      const result = await submitWorkflow(
        { changeId: 'add-feature', skipValidation: true, skipArchive: true },
        { git: mockGit, github: mockGithub, openspec: mockOpenspec, config: mockConfig }
      );

      // No commits at all when no changes and skipArchive
      expect(mockGit.commit).not.toHaveBeenCalled();
      expect(result.pullRequest).toBeDefined();
    });
  });
});

