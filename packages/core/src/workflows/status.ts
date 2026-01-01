/**
 * Status workflow - get current change state
 */

import { type GitAdapter } from '../adapters/git-adapter.js';
import { type OpenSpecAdapter } from '../adapters/openspec-adapter.js';
import { type Change, type ChangeState } from '../types.js';

export interface StatusOptions {
  /** Change ID to get status for (optional, uses current branch if not provided) */
  changeId?: string;
}

export interface StatusResult {
  /** Change context */
  change: Change;
  /** Current git branch */
  currentBranch: string;
  /** Whether on the change's branch */
  onBranch: boolean;
  /** Task completion summary */
  taskSummary: {
    total: number;
    completed: number;
    percentage: number;
  };
}

interface StatusDependencies {
  git: GitAdapter;
  openspec: OpenSpecAdapter;
}

/**
 * Get status of a change
 */
export async function statusWorkflow(
  options: StatusOptions,
  deps: StatusDependencies
): Promise<StatusResult | null> {
  const { git, openspec } = deps;
  
  let changeId = options.changeId;
  const currentBranch = await git.getCurrentBranch();
  
  // If no changeId provided, try to get from current branch
  if (!changeId) {
    const match = currentBranch.match(/^spec\/(.+)$/);
    if (!match) {
      return null; // Not on a spec branch
    }
    changeId = match[1];
  }
  
  // Check if change exists
  if (!await openspec.changeExists(changeId)) {
    return null;
  }
  
  // Read change
  const change = await openspec.readChange(changeId);
  
  // Calculate task summary
  const total = change.tasks.length;
  const completed = change.tasks.filter(t => t.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  // Determine state based on tasks
  const state = determineState(change, completed, total);
  change.state = state;
  
  return {
    change,
    currentBranch,
    onBranch: currentBranch === `spec/${changeId}`,
    taskSummary: { total, completed, percentage },
  };
}

/**
 * Determine the change state based on progress
 */
function determineState(change: Change, completed: number, total: number): ChangeState {
  // TODO: Check for PR existence to determine 'submitted' state
  // TODO: Check for archived status to determine 'merged' state
  
  if (completed === 0) {
    return 'created';
  }
  
  if (completed < total) {
    return 'implementing';
  }
  
  return 'testing'; // All tasks complete, likely in testing phase
}

