/**
 * Git adapter using simple-git
 */

import { simpleGit, type SimpleGit } from 'simple-git';
import { type GitStatus } from '../types.js';

/** Git operations interface */
export interface GitAdapter {
  /** Create a new branch from base */
  createBranch(name: string, from?: string): Promise<void>;
  
  /** Checkout a branch */
  checkout(branch: string): Promise<void>;
  
  /** Get current branch name */
  getCurrentBranch(): Promise<string>;
  
  /** Stage files */
  add(paths: string[]): Promise<void>;
  
  /** Create a commit */
  commit(message: string): Promise<string>;
  
  /** Push to remote */
  push(remote: string, branch: string, setUpstream?: boolean): Promise<void>;
  
  /** Get repository status */
  status(): Promise<GitStatus>;
  
  /** Check if branch exists */
  branchExists(name: string): Promise<boolean>;
  
  /** Pull latest changes */
  pull(remote?: string, branch?: string): Promise<void>;
  
  /** Delete a local branch */
  deleteBranch(name: string, force?: boolean): Promise<void>;
  
  // Worktree operations (Phase 4)
  
  /** Create a worktree for parallel development */
  createWorktree(path: string, branch: string): Promise<void>;
  
  /** Remove a worktree */
  removeWorktree(path: string): Promise<void>;
  
  /** List all worktrees */
  listWorktrees(): Promise<Array<{ path: string; branch: string }>>;
  
  /** Get the main worktree path (original repo location) */
  getMainWorktreePath(): Promise<string>;
}

/**
 * Create a Git adapter for the specified repository
 */
export function createGitAdapter(repoPath: string): GitAdapter {
  const git: SimpleGit = simpleGit(repoPath);
  
  return {
    async createBranch(name: string, from?: string): Promise<void> {
      if (from) {
        await git.checkoutBranch(name, from);
      } else {
        await git.checkoutLocalBranch(name);
      }
    },
    
    async checkout(branch: string): Promise<void> {
      await git.checkout(branch);
    },
    
    async getCurrentBranch(): Promise<string> {
      const status = await git.status();
      return status.current ?? 'HEAD';
    },
    
    async add(paths: string[]): Promise<void> {
      await git.add(paths);
    },
    
    async commit(message: string): Promise<string> {
      const result = await git.commit(message);
      return result.commit;
    },
    
    async push(remote: string, branch: string, setUpstream = true): Promise<void> {
      if (setUpstream) {
        await git.push(remote, branch, ['--set-upstream']);
      } else {
        await git.push(remote, branch);
      }
    },
    
    async status(): Promise<GitStatus> {
      const status = await git.status();
      return {
        current: status.current,
        staged: status.staged,
        unstaged: [...status.modified, ...status.deleted],
        untracked: status.not_added,
      };
    },
    
    async branchExists(name: string): Promise<boolean> {
      const branches = await git.branchLocal();
      return branches.all.includes(name);
    },
    
    async pull(remote = 'origin', branch?: string): Promise<void> {
      if (branch) {
        await git.pull(remote, branch);
      } else {
        await git.pull();
      }
    },
    
    async deleteBranch(name: string, force = false): Promise<void> {
      if (force) {
        await git.branch(['-D', name]);
      } else {
        await git.branch(['-d', name]);
      }
    },
    
    // Worktree operations (Phase 4)
    
    async createWorktree(path: string, branch: string): Promise<void> {
      await git.raw(['worktree', 'add', path, '-b', branch]);
    },
    
    async removeWorktree(path: string): Promise<void> {
      await git.raw(['worktree', 'remove', path, '--force']);
    },
    
    async listWorktrees(): Promise<Array<{ path: string; branch: string }>> {
      const result = await git.raw(['worktree', 'list', '--porcelain']);
      const worktrees: Array<{ path: string; branch: string }> = [];
      
      const lines = result.split('\n');
      let currentPath = '';
      
      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          currentPath = line.slice(9);
        } else if (line.startsWith('branch ')) {
          const branch = line.slice(7).replace('refs/heads/', '');
          worktrees.push({ path: currentPath, branch });
        }
      }
      
      return worktrees;
    },
    
    async getMainWorktreePath(): Promise<string> {
      // The first worktree in the list is always the main repo
      const result = await git.raw(['worktree', 'list', '--porcelain']);
      const lines = result.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          return line.slice(9);
        }
      }
      
      // Fallback to revparse for repos without worktrees
      const toplevel = await git.revparse(['--show-toplevel']);
      return toplevel.trim();
    },
  };
}

