/**
 * GitHub adapter - DEPRECATED
 * 
 * This adapter is deprecated. Use one of these alternatives instead:
 * - @github MCP server for AI-assisted GitHub operations
 * - `gh` CLI for command-line GitHub operations
 * - `/speclife ship` and `/speclife land` slash commands
 * 
 * The adapter remains functional for backward compatibility but will be
 * removed in a future version.
 */

import { Octokit } from '@octokit/rest';
import { type PullRequest } from '../types.js';

/** @deprecated Use @github MCP or gh CLI instead */
export interface GitHubAdapter {
  /** @deprecated */
  createPullRequest(options: CreatePROptions): Promise<PullRequest>;
  /** @deprecated */
  getPullRequest(prNumber: number): Promise<PullRequest>;
  /** @deprecated */
  getPullRequestByBranch(branch: string): Promise<PullRequest | null>;
  /** @deprecated */
  mergePullRequest(prNumber: number, mergeMethod?: 'merge' | 'squash' | 'rebase'): Promise<void>;
  /** @deprecated */
  updatePullRequest(prNumber: number, options: UpdatePROptions): Promise<PullRequest>;
  /** @deprecated */
  markPullRequestReady(prNumber: number): Promise<PullRequest>;
  /** @deprecated */
  isPullRequestMergeable(prNumber: number): Promise<{ mergeable: boolean; reason?: string }>;
  /** @deprecated */
  enableAutoMerge(prNumber: number, mergeMethod?: 'MERGE' | 'SQUASH' | 'REBASE'): Promise<boolean>;
}

interface CreatePROptions {
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
}

interface UpdatePROptions {
  title?: string;
  body?: string;
  draft?: boolean;
}

const DEPRECATION_WARNING = `
⚠️  DEPRECATION WARNING: createGitHubAdapter is deprecated.
   
   Use one of these alternatives:
   - @github MCP server for AI-assisted operations
   - \`gh\` CLI for command-line operations
   - /speclife ship and /speclife land slash commands
   
   This adapter will be removed in a future version.
`;

/**
 * Create a GitHub adapter
 * 
 * @deprecated Use @github MCP or gh CLI instead
 */
export function createGitHubAdapter(owner: string, repo: string): GitHubAdapter {
  // Show deprecation warning once per adapter creation
  console.warn(DEPRECATION_WARNING);
  
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      'GITHUB_TOKEN environment variable is required.\n' +
      'Consider using /speclife ship or /speclife land slash commands instead,\n' +
      'which use @github MCP or gh CLI and do not require token configuration.'
    );
  }
  
  const octokit = new Octokit({ auth: token });
  
  return {
    async createPullRequest(options: CreatePROptions): Promise<PullRequest> {
      const { data } = await octokit.pulls.create({
        owner,
        repo,
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base,
        draft: options.draft,
      });
      
      return mapPullRequest(data);
    },
    
    async getPullRequest(prNumber: number): Promise<PullRequest> {
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      
      return mapPullRequest(data);
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
      
      return mapPullRequest(data[0]);
    },
    
    async mergePullRequest(prNumber: number, mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash'): Promise<void> {
      await octokit.pulls.merge({
        owner,
        repo,
        pull_number: prNumber,
        merge_method: mergeMethod,
      });
    },
    
    async updatePullRequest(prNumber: number, options: UpdatePROptions): Promise<PullRequest> {
      // Handle draft status separately (requires GraphQL)
      if (options.draft === false) {
        // Mark as ready for review using GraphQL
        const { data: pr } = await octokit.pulls.get({
          owner,
          repo,
          pull_number: prNumber,
        });
        
        await octokit.graphql(`
          mutation($pullRequestId: ID!) {
            markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
              pullRequest { id }
            }
          }
        `, {
          pullRequestId: pr.node_id,
        });
      }
      
      // Update other fields
      const updateData: Record<string, unknown> = {};
      if (options.title) updateData.title = options.title;
      if (options.body) updateData.body = options.body;
      
      if (Object.keys(updateData).length > 0) {
        await octokit.pulls.update({
          owner,
          repo,
          pull_number: prNumber,
          ...updateData,
        });
      }
      
      // Fetch and return updated PR
      return this.getPullRequest(prNumber);
    },
    
    async markPullRequestReady(prNumber: number): Promise<PullRequest> {
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      
      await octokit.graphql(`
        mutation($pullRequestId: ID!) {
          markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
            pullRequest { id }
          }
        }
      `, {
        pullRequestId: pr.node_id,
      });
      
      // Fetch and return updated PR
      return this.getPullRequest(prNumber);
    },
    
    async isPullRequestMergeable(prNumber: number): Promise<{ mergeable: boolean; reason?: string }> {
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      
      // GitHub's mergeable can be null when status is unknown/checking
      if (data.mergeable === null) {
        return { mergeable: false, reason: 'Mergeability status is being computed' };
      }
      
      if (!data.mergeable) {
        return { 
          mergeable: false, 
          reason: data.mergeable_state === 'dirty' ? 'Has merge conflicts' :
                  data.mergeable_state === 'blocked' ? 'Blocked by branch protection rules' :
                  data.mergeable_state === 'behind' ? 'Branch is behind base' :
                  `State: ${data.mergeable_state}`
        };
      }
      
      return { mergeable: true };
    },
    
    async enableAutoMerge(prNumber: number, mergeMethod: 'MERGE' | 'SQUASH' | 'REBASE' = 'SQUASH'): Promise<boolean> {
      try {
        const { data: pr } = await octokit.pulls.get({
          owner,
          repo,
          pull_number: prNumber,
        });
        
        await octokit.graphql(`
          mutation($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) {
            enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }) {
              pullRequest { id }
            }
          }
        `, {
          pullRequestId: pr.node_id,
          mergeMethod,
        });
        
        return true;
      } catch {
        // Auto-merge might not be enabled on the repository
        return false;
      }
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPullRequest(data: any): PullRequest {
  return {
    number: data.number,
    title: data.title,
    body: data.body || '',
    state: data.merged ? 'merged' : data.state,
    draft: data.draft || false,
    url: data.html_url,
    html_url: data.html_url,
    head: {
      ref: data.head.ref,
      sha: data.head.sha,
    },
    base: {
      ref: data.base.ref,
    },
    merged: data.merged || false,
    mergeable: data.mergeable,
    mergeable_state: data.mergeable_state,
  };
}

