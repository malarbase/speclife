/**
 * GitHub adapter tests
 * 
 * Uses mock Octokit to test PR CRUD operations without hitting the real API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Octokit before importing the adapter
vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => ({
      pulls: {
        create: vi.fn(),
        list: vi.fn(),
        get: vi.fn(),
        merge: vi.fn(),
      },
      graphql: vi.fn(),
    })),
  };
});

import { createGitHubAdapter } from '../../src/adapters/github-adapter.js';
import { Octokit } from '@octokit/rest';

describe('GitHubAdapter', () => {
  const mockOctokit = {
    pulls: {
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      merge: vi.fn(),
    },
    graphql: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (Octokit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockOctokit);
    // Set GITHUB_TOKEN for tests
    process.env.GITHUB_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  describe('createGitHubAdapter', () => {
    it('throws when GITHUB_TOKEN is missing', () => {
      delete process.env.GITHUB_TOKEN;

      expect(() => createGitHubAdapter('test', 'repo'))
        .toThrow();
    });

    it('creates adapter with token from env', () => {
      process.env.GITHUB_TOKEN = 'test-token';

      const adapter = createGitHubAdapter('test', 'repo');

      expect(adapter).toBeDefined();
    });
  });

  describe('createPullRequest', () => {
    it('creates a pull request', async () => {
      mockOctokit.pulls.create.mockResolvedValue({
        data: {
          number: 42,
          html_url: 'https://github.com/test/repo/pull/42',
          title: 'Test PR',
          body: 'Test body',
          state: 'open',
          mergeable: true,
          draft: false,
          merged: false,
          head: { ref: 'feature-branch', sha: 'abc123' },
          base: { ref: 'main' },
        },
      });

      const adapter = createGitHubAdapter('test', 'repo');
      const pr = await adapter.createPullRequest({
        title: 'Test PR',
        body: 'Test body',
        head: 'feature-branch',
        base: 'main',
      });

      expect(pr.number).toBe(42);
      expect(pr.url).toBe('https://github.com/test/repo/pull/42');
      expect(pr.state).toBe('open');
      expect(mockOctokit.pulls.create).toHaveBeenCalledWith({
        owner: 'test',
        repo: 'repo',
        title: 'Test PR',
        body: 'Test body',
        head: 'feature-branch',
        base: 'main',
        draft: undefined,
      });
    });

    it('creates a draft pull request', async () => {
      mockOctokit.pulls.create.mockResolvedValue({
        data: {
          number: 43,
          html_url: 'https://github.com/test/repo/pull/43',
          title: 'Draft PR',
          body: 'Draft body',
          state: 'open',
          mergeable: null,
          draft: true,
          merged: false,
          head: { ref: 'draft-branch', sha: 'def456' },
          base: { ref: 'main' },
        },
      });

      const adapter = createGitHubAdapter('test', 'repo');
      const pr = await adapter.createPullRequest({
        title: 'Draft PR',
        body: 'Draft body',
        head: 'draft-branch',
        base: 'main',
        draft: true,
      });

      expect(pr.draft).toBe(true);
      expect(mockOctokit.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({ draft: true })
      );
    });
  });

  describe('getPullRequestByBranch', () => {
    it('returns PR when found', async () => {
      mockOctokit.pulls.list.mockResolvedValue({
        data: [{
          number: 10,
          html_url: 'https://github.com/test/repo/pull/10',
          title: 'Feature PR',
          body: '',
          state: 'open',
          draft: false,
          merged: false,
          mergeable: true,
          head: { ref: 'spec/add-feature', sha: 'xyz789' },
          base: { ref: 'main' },
        }],
      });

      const adapter = createGitHubAdapter('test', 'repo');
      const pr = await adapter.getPullRequestByBranch('spec/add-feature');

      expect(pr).not.toBeNull();
      expect(pr?.number).toBe(10);
      expect(mockOctokit.pulls.list).toHaveBeenCalledWith({
        owner: 'test',
        repo: 'repo',
        head: 'test:spec/add-feature',
        state: 'open',
      });
    });

    it('returns null when no PR found', async () => {
      mockOctokit.pulls.list.mockResolvedValue({ data: [] });

      const adapter = createGitHubAdapter('test', 'repo');
      const pr = await adapter.getPullRequestByBranch('nonexistent-branch');

      expect(pr).toBeNull();
    });
  });

  describe('getPullRequest', () => {
    it('returns PR details', async () => {
      mockOctokit.pulls.get.mockResolvedValue({
        data: {
          number: 5,
          html_url: 'https://github.com/test/repo/pull/5',
          title: 'My PR',
          body: 'Description',
          state: 'open',
          mergeable: true,
          draft: false,
          merged: false,
          head: { ref: 'feature', sha: 'abc123' },
          base: { ref: 'main' },
        },
      });

      const adapter = createGitHubAdapter('test', 'repo');
      const pr = await adapter.getPullRequest(5);

      expect(pr.number).toBe(5);
      expect(pr.state).toBe('open');
      expect(pr.mergeable).toBe(true);
    });

    it('returns merged state correctly', async () => {
      mockOctokit.pulls.get.mockResolvedValue({
        data: {
          number: 6,
          html_url: 'https://github.com/test/repo/pull/6',
          title: 'Merged PR',
          body: '',
          state: 'closed',
          mergeable: false,
          draft: false,
          merged: true,
          head: { ref: 'feature', sha: 'def456' },
          base: { ref: 'main' },
        },
      });

      const adapter = createGitHubAdapter('test', 'repo');
      const pr = await adapter.getPullRequest(6);

      expect(pr.state).toBe('merged');
    });
  });

  describe('mergePullRequest', () => {
    it('merges PR with default method (squash)', async () => {
      mockOctokit.pulls.merge.mockResolvedValue({ data: { merged: true } });

      const adapter = createGitHubAdapter('test', 'repo');
      await adapter.mergePullRequest(1);

      expect(mockOctokit.pulls.merge).toHaveBeenCalledWith({
        owner: 'test',
        repo: 'repo',
        pull_number: 1,
        merge_method: 'squash',
      });
    });

    it('merges PR with squash method', async () => {
      mockOctokit.pulls.merge.mockResolvedValue({ data: { merged: true } });

      const adapter = createGitHubAdapter('test', 'repo');
      await adapter.mergePullRequest(2, 'squash');

      expect(mockOctokit.pulls.merge).toHaveBeenCalledWith({
        owner: 'test',
        repo: 'repo',
        pull_number: 2,
        merge_method: 'squash',
      });
    });

    it('merges PR with rebase method', async () => {
      mockOctokit.pulls.merge.mockResolvedValue({ data: { merged: true } });

      const adapter = createGitHubAdapter('test', 'repo');
      await adapter.mergePullRequest(3, 'rebase');

      expect(mockOctokit.pulls.merge).toHaveBeenCalledWith(
        expect.objectContaining({ merge_method: 'rebase' })
      );
    });
  });

  describe('isPullRequestMergeable', () => {
    it('returns mergeable true for mergeable PR', async () => {
      mockOctokit.pulls.get.mockResolvedValue({
        data: {
          mergeable: true,
          draft: false,
          mergeable_state: 'clean',
        },
      });

      const adapter = createGitHubAdapter('test', 'repo');
      const result = await adapter.isPullRequestMergeable(1);

      expect(result.mergeable).toBe(true);
    });

    it('returns mergeable false for conflicting PR', async () => {
      mockOctokit.pulls.get.mockResolvedValue({
        data: {
          mergeable: false,
          draft: false,
          mergeable_state: 'dirty',
        },
      });

      const adapter = createGitHubAdapter('test', 'repo');
      const result = await adapter.isPullRequestMergeable(1);

      expect(result.mergeable).toBe(false);
      expect(result.reason).toBe('Has merge conflicts');
    });

    it('returns mergeable false when status is null', async () => {
      mockOctokit.pulls.get.mockResolvedValue({
        data: {
          mergeable: null,
          draft: false,
          mergeable_state: 'unknown',
        },
      });

      const adapter = createGitHubAdapter('test', 'repo');
      const result = await adapter.isPullRequestMergeable(1);

      expect(result.mergeable).toBe(false);
      expect(result.reason).toBe('Mergeability status is being computed');
    });
  });

  describe('markPullRequestReady', () => {
    it('marks draft PR as ready', async () => {
      mockOctokit.pulls.get.mockResolvedValue({
        data: {
          number: 7,
          html_url: 'https://github.com/test/repo/pull/7',
          title: 'Ready PR',
          body: '',
          state: 'open',
          mergeable: true,
          draft: false,
          merged: false,
          node_id: 'PR_123',
          head: { ref: 'feature', sha: 'abc123' },
          base: { ref: 'main' },
        },
      });
      mockOctokit.graphql.mockResolvedValue({});

      const adapter = createGitHubAdapter('test', 'repo');
      const pr = await adapter.markPullRequestReady(7);

      expect(pr.draft).toBe(false);
      expect(mockOctokit.graphql).toHaveBeenCalledWith(
        expect.stringContaining('markPullRequestReadyForReview'),
        expect.objectContaining({ pullRequestId: 'PR_123' })
      );
    });
  });

  describe('enableAutoMerge', () => {
    it('enables auto-merge and returns true on success', async () => {
      mockOctokit.pulls.get.mockResolvedValue({
        data: { node_id: 'PR_456' },
      });
      mockOctokit.graphql.mockResolvedValue({
        enablePullRequestAutoMerge: {
          pullRequest: { autoMergeRequest: { enabledAt: '2024-01-01' } },
        },
      });

      const adapter = createGitHubAdapter('test', 'repo');
      const result = await adapter.enableAutoMerge(1, 'SQUASH');

      expect(result).toBe(true);
      expect(mockOctokit.graphql).toHaveBeenCalledWith(
        expect.stringContaining('enablePullRequestAutoMerge'),
        expect.objectContaining({ 
          pullRequestId: 'PR_456',
          mergeMethod: 'SQUASH',
        })
      );
    });

    it('returns false when auto-merge is not available', async () => {
      mockOctokit.pulls.get.mockResolvedValue({
        data: { node_id: 'PR_789' },
      });
      mockOctokit.graphql.mockRejectedValue(new Error('Auto-merge not enabled'));

      const adapter = createGitHubAdapter('test', 'repo');
      const result = await adapter.enableAutoMerge(1);

      expect(result).toBe(false);
    });
  });
});



