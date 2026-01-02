/**
 * Implement workflow - DEPRECATED
 * 
 * This workflow is deprecated. Use /openspec-apply slash command instead.
 * 
 * The agent IS the AI - there's no need to invoke AI from within a tool call.
 * Slash commands guide the agent to implement changes directly.
 */

import { type OpenSpecAdapter } from '../adapters/openspec-adapter.js';
import { type SpecLifeConfig } from '../config.js';
import { type ImplementMode, type ProgressCallback } from '../types.js';

export interface ImplementDependencies {
  openspec: OpenSpecAdapter;
  config: SpecLifeConfig;
}

export interface ImplementOptions {
  changeId: string;
  mode?: ImplementMode;
  taskId?: string;
  dryRun?: boolean;
}

export interface ImplementResult {
  mode: ImplementMode;
  status: 'success' | 'partial' | 'failed' | 'manual';
  tasksAttempted: number;
  tasksCompleted: number;
  message: string;
  plan?: string;
}

const DEPRECATION_WARNING = `
⚠️  DEPRECATION WARNING: implementWorkflow is deprecated.

   Use /openspec-apply slash command instead.
   
   The agent IS the AI - there's no need to invoke AI from within a tool call.
   Slash commands guide the agent to implement changes directly.
`;

/**
 * Implement a change using AI
 * 
 * @deprecated Use /openspec-apply slash command instead
 */
export async function implementWorkflow(
  options: ImplementOptions,
  deps: ImplementDependencies,
  onProgress?: ProgressCallback
): Promise<ImplementResult> {
  const { changeId, mode = deps.config.implementMode, dryRun = false } = options;
  
  // Show deprecation warning
  console.warn(DEPRECATION_WARNING);
  onProgress?.({ type: 'step_completed', message: '⚠️  This tool is deprecated. Use /openspec-apply instead.' });
  
  // Check if change exists
  const exists = await deps.openspec.changeExists(changeId);
  if (!exists) {
    return {
      mode,
      status: 'failed',
      tasksAttempted: 0,
      tasksCompleted: 0,
      message: `Change '${changeId}' not found`,
    };
  }
  
  // If dry run, return the deprecation notice as the "plan"
  if (dryRun) {
    return {
      mode,
      status: 'manual',
      tasksAttempted: 0,
      tasksCompleted: 0,
      message: 'Dry run - use /openspec-apply slash command for implementation',
      plan: `
# Implementation Plan for ${changeId}

This tool is deprecated. To implement this change:

1. Use the /openspec-apply slash command
2. The agent (you) will implement the tasks directly
3. No AI-invoking-AI needed - you ARE the AI!

## Recommended Workflow

\`\`\`
/openspec-apply
\`\`\`

This will guide you through:
- Reading the proposal and tasks
- Implementing each task
- Running tests
- Updating task status
`.trim(),
    };
  }
  
  // For non-dry-run, return manual status with guidance
  return {
    mode: 'cursor',
    status: 'manual',
    tasksAttempted: 0,
    tasksCompleted: 0,
    message: `
This tool is deprecated. Please use the /openspec-apply slash command instead.

The slash command will guide you (the agent) to:
1. Read the proposal at openspec/changes/${changeId}/proposal.md
2. Read tasks at openspec/changes/${changeId}/tasks.md  
3. Implement each task
4. Run tests and fix any issues
5. Mark tasks as complete

No AI-invoking-AI needed - you ARE the AI!
`.trim(),
  };
}

