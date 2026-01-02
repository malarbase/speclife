/**
 * GitHub adapter using Octokit
 */

import { Octokit } from '@octokit/rest';
import { SpecLifeError, ErrorCodes, type PullRequest, type Release } from '../types.js';

/** GitHub operations interface */
export interface GitHubAdapter {
  /** Create a pull request */
  createPullRequest(params: {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
  }): Promise<PullRequest>;
  
  /** Get pull request by branch */
  getPullRequestByBranch(branch: string): Promise<PullRequest | null>;
  
  /** Get pull request by number */
  getPullRequest(number: number): Promise<PullRequest>;
  
  /** Get pull request diff */
  getPullRequestDiff(number: number): Promise<string>;
  
  /** Merge pull request */
  mergePullRequest(number: number, method?: 'merge' | 'squash' | 'rebase'): Promise<void>;
  
  /** Check if PR is mergeable */
  isPullRequestMergeable(number: number): Promise<{
    mergeable: boolean;
    reason?: string;
  }>;
  
  /** Mark a draft PR as ready for review */
  markPullRequestReady(number: number): Promise<PullRequest>;
  
  /** Create a GitHub release */
  createRelease(params: {
    tag: string;
    name: string;
    body: string;
    draft?: boolean;
    prerelease?: boolean;
  }): Promise<Release>;
  
  /** Create a git tag via GitHub API */
  createTag(params: {
    tag: string;
    sha: string;
    message?: string;
  }): Promise<void>;
}

interface GitHubAdapterOptions {
  owner: string;
  repo: string;
  token?: string;
}

/**
 * Create a GitHub adapter
 */
export function createGitHubAdapter(options: GitHubAdapterOptions): GitHubAdapter {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  
  if (!token) {
    throw new SpecLifeError(
      ErrorCodes.MISSING_TOKEN,
      'GITHUB_TOKEN environment variable is required for GitHub operations',
      { variable: 'GITHUB_TOKEN' }
    );
  }
  
  const octokit = new Octokit({ auth: token });
  const { owner, repo } = options;
  
  return {
    async createPullRequest(params): Promise<PullRequest> {
      const { data } = await octokit.pulls.create({
        owner,
        repo,
        title: params.title,
        body: params.body,
        head: params.head,
        base: params.base,
        draft: params.draft,
      });
      
      return {
        number: data.number,
        url: data.html_url,
        title: data.title,
        state: data.state as 'open' | 'closed',
        mergeable: data.mergeable,
        draft: data.draft ?? false,
      };
    },
    
    async getPullRequestByBranch(branch: string): Promise<PullRequest | null> {
      const { data } = await octokit.pulls.list({
        owner,
        repo,
        head: `${owner}:${branch}`,
        state: 'open',
      });
      
      if (data.length === 0) {
        return null;
      }
      
      const pr = data[0];
      return {
        number: pr.number,
        url: pr.html_url,
        title: pr.title,
        state: pr.state as 'open' | 'closed',
        mergeable: null, // List endpoint doesn't return mergeable; use getPullRequest for full details
        draft: pr.draft ?? false,
      };
    },
    
    async getPullRequest(number: number): Promise<PullRequest> {
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: number,
      });
      
      return {
        number: data.number,
        url: data.html_url,
        title: data.title,
        state: data.merged ? 'merged' : (data.state as 'open' | 'closed'),
        mergeable: data.mergeable,
        draft: data.draft ?? false,
      };
    },
    
    async getPullRequestDiff(number: number): Promise<string> {
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: number,
        mediaType: {
          format: 'diff',
        },
      });
      
      // When requesting diff format, data is returned as a string
      return data as unknown as string;
    },
    
    async mergePullRequest(number: number, method: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<void> {
      await octokit.pulls.merge({
        owner,
        repo,
        pull_number: number,
        merge_method: method,
      });
    },
    
    async isPullRequestMergeable(number: number): Promise<{ mergeable: boolean; reason?: string }> {
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: number,
      });
      
      if (data.mergeable === false) {
        return { mergeable: false, reason: 'Conflicts or checks failing' };
      }
      
      if (data.draft) {
        return { mergeable: false, reason: 'PR is still a draft' };
      }
      
      return { mergeable: data.mergeable ?? false };
    },
    
    async markPullRequestReady(number: number): Promise<PullRequest> {
      // The REST API doesn't support marking PRs ready, so we use GraphQL
      // First, get the node ID for the PR
      const { data: prData } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: number,
      });
      
      const nodeId = prData.node_id;
      
      // Use GraphQL mutation to mark ready
      await octokit.graphql(`
        mutation($id: ID!) {
          markPullRequestReadyForReview(input: { pullRequestId: $id }) {
            pullRequest {
              id
            }
          }
        }
      `, { id: nodeId });
      
      // Fetch updated PR
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: number,
      });
      
      return {
        number: data.number,
        url: data.html_url,
        title: data.title,
        state: data.merged ? 'merged' : (data.state as 'open' | 'closed'),
        mergeable: data.mergeable,
        draft: data.draft ?? false,
      };
    },
    
    async createRelease(params): Promise<Release> {
      const { data } = await octokit.repos.createRelease({
        owner,
        repo,
        tag_name: params.tag,
        name: params.name,
        body: params.body,
        draft: params.draft,
        prerelease: params.prerelease,
      });
      
      return {
        id: data.id,
        url: data.html_url,
        tag: data.tag_name,
        name: data.name ?? params.name,
      };
    },
    
    async createTag(params): Promise<void> {
      // Create an annotated tag object if message provided, otherwise lightweight
      if (params.message) {
        // Create annotated tag object
        const { data: tagObject } = await octokit.git.createTag({
          owner,
          repo,
          tag: params.tag,
          message: params.message,
          object: params.sha,
          type: 'commit',
        });
        
        // Create ref pointing to the tag object
        await octokit.git.createRef({
          owner,
          repo,
          ref: `refs/tags/${params.tag}`,
          sha: tagObject.sha,
        });
      } else {
        // Create lightweight tag (just a ref)
        await octokit.git.createRef({
          owner,
          repo,
          ref: `refs/tags/${params.tag}`,
          sha: params.sha,
        });
      }
    },
  };
}

