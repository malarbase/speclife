/**
 * Core types for SpecLife
 */

/** Change lifecycle states */
export type ChangeState = 
  | 'created'
  | 'implementing'
  | 'testing'
  | 'submitted'
  | 'merged';

/** A change proposal context */
export interface Change {
  id: string;
  branch: string;
  state: ChangeState;
  proposal: ChangeProposal;
  tasks: ChangeTask[];
  design?: string;
  createdAt: Date;
}

/** Parsed proposal.md content */
export interface ChangeProposal {
  why: string;
  whatChanges: string[];
  impact: {
    affectedSpecs: string[];
    affectedCode: string[];
  };
}

/** A task from tasks.md */
export interface ChangeTask {
  id: string;
  content: string;
  completed: boolean;
}

/** Git status information */
export interface GitStatus {
  current: string | null;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

/** Pull request information */
export interface PullRequest {
  number: number;
  url: string;
  title: string;
  state: 'open' | 'closed' | 'merged';
  mergeable: boolean | null;
  draft: boolean;
}

/** Structured error for SpecLife operations */
export class SpecLifeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SpecLifeError';
  }
}

/** Common error codes */
export const ErrorCodes = {
  CONFIG_INVALID: 'CONFIG_INVALID',
  CHANGE_EXISTS: 'CHANGE_EXISTS',
  CHANGE_NOT_FOUND: 'CHANGE_NOT_FOUND',
  BRANCH_EXISTS: 'BRANCH_EXISTS',
  NO_CHANGES: 'NO_CHANGES',
  GITHUB_ERROR: 'GITHUB_ERROR',
  AI_ERROR: 'AI_ERROR',
  MISSING_TOKEN: 'MISSING_TOKEN',
} as const;

/** Progress event emitted during long operations */
export interface ProgressEvent {
  type: 'task_started' | 'task_completed' | 'file_written' | 'step_completed';
  message: string;
  data?: Record<string, unknown>;
}

/** Progress callback type */
export type ProgressCallback = (event: ProgressEvent) => void;

