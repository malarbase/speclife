/**
 * GitHub adapter using Octokit
 */

import { Octokit } from '@octokit/rest';
import { SpecLifeError, ErrorCodes, type PullRequest } from '../types.js';

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
  
  /** Merge pull request */
  mergePullRequest(number: number, method?: 'merge' | 'squash' | 'rebase'): Promise<void>;
  
  /** Check if PR is mergeable */
  isPullRequestMergeable(number: number): Promise<{
    mergeable: boolean;
    reason?: string;
  }>;
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
        mergeable: pr.mergeable,
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
  };
}

