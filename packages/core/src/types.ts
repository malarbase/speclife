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
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  /** URL to the pull request */
  url: string;
  /** Same as url (GitHub API field name) */
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  merged: boolean;
  mergeable: boolean | null;
  mergeable_state?: string;
}

/** Simplified pull request info (for backwards compatibility) */
export interface PullRequestInfo {
  number: number;
  url: string;
  title: string;
  state: 'open' | 'closed' | 'merged';
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
  CLI_NOT_FOUND: 'CLI_NOT_FOUND',
  TEST_FAILED: 'TEST_FAILED',
} as const;

/** Implementation modes for speclife_implement */
export type ImplementMode = 'claude-cli' | 'claude-sdk' | 'cursor';

/** Options for the implement workflow */
export interface ImplementOptions {
  /** Change ID to implement */
  changeId: string;
  /** Implementation mode (default: from config or 'claude-cli') */
  mode?: ImplementMode;
  /** Specific task ID to implement (e.g., "1.2") */
  taskId?: string;
  /** Return plan without executing */
  dryRun?: boolean;
}

/** Result of the implement workflow */
export interface ImplementResult {
  /** Mode used for implementation */
  mode: ImplementMode;
  /** Overall status */
  status: 'success' | 'partial' | 'failed' | 'manual';
  /** Human-readable output/summary */
  output: string;
  /** Tasks that were completed */
  tasksCompleted: string[];
  /** Tasks that failed (with reasons) */
  tasksFailed?: Array<{ taskId: string; reason: string }>;
  /** For dry-run: the planned prompt/actions */
  plan?: string;
}

/** Progress event emitted during long operations */
export interface ProgressEvent {
  type: 'task_started' | 'task_completed' | 'file_written' | 'step_completed';
  message: string;
  data?: Record<string, unknown>;
}

/** Progress callback type */
export type ProgressCallback = (event: ProgressEvent) => void;

/** Version bump types */
export type VersionBumpType = 'major' | 'minor' | 'patch';

/** Commit information for version analysis */
export interface CommitInfo {
  sha: string;
  message: string;
  type?: string; // feat, fix, chore, etc.
  scope?: string;
  isBreaking: boolean;
}

/** Options for the release workflow */
export interface ReleaseOptions {
  /** Explicit version to release (skips analysis) */
  version?: string;
  /** Don't create PR, just show what would happen */
  dryRun?: boolean;
  /** Skip changelog generation */
  skipChangelog?: boolean;
  /** Enable auto-merge on the release PR (requires repo settings to allow auto-merge) */
  autoMerge?: boolean;
}

/** Result of the release workflow */
export interface ReleaseResult {
  /** The new version */
  version: string;
  /** Previous version */
  previousVersion: string;
  /** Suggested bump type */
  bumpType: VersionBumpType;
  /** Commits included in this release */
  commits: CommitInfo[];
  /** Generated changelog content */
  changelog?: string;
  /** URL of the created PR (if not dry run) */
  prUrl?: string;
  /** Release branch name */
  branch?: string;
  /** Whether auto-merge was enabled on the PR */
  autoMergeEnabled?: boolean;
}

/** Progress information for a change */
export interface ChangeProgress {
  /** Number of completed tasks */
  completed: number;
  /** Total number of tasks */
  total: number;
  /** Completion percentage (0-100) */
  percentage: number;
}

/** PR status for display */
export type PRDisplayStatus = 'draft' | 'ready' | 'merged' | 'closed' | 'local';

/** Enriched change item for list display */
export interface ChangeListItem {
  /** Change identifier */
  id: string;
  /** Task progress */
  progress: ChangeProgress;
  /** PR status */
  prStatus: PRDisplayStatus;
  /** PR number if exists */
  prNumber?: number;
  /** PR URL if exists */
  prUrl?: string;
  /** Last activity timestamp */
  lastActive?: Date;
  /** Whether this is the current branch */
  isCurrent: boolean;
}

/** Options for listing changes */
export interface ListOptions {
  /** Show compact single-line output */
  compact?: boolean;
  /** Filter by PR status */
  status?: PRDisplayStatus;
  /** Sort order */
  sort?: 'activity' | 'progress' | 'name';
}

/** Validation status */
export type ValidationStatus = 'pass' | 'pass_with_warnings' | 'fail';

/** Validation report from openspec validate */
export interface ValidationReport {
  /** Overall validation status */
  status: ValidationStatus;
  /** Validation errors (cause failure) */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Raw output from openspec validate */
  output?: string;
}
