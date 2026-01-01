/**
 * Implement workflow - AI-driven code implementation with multiple modes
 * 
 * Supports three implementation modes:
 * - claude-cli: Uses Claude CLI with MCP servers (primary)
 * - claude-sdk: Direct Anthropic SDK with tool-use (fully automated)
 * - cursor: Opens Cursor IDE for manual implementation
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { type OpenSpecAdapter } from '../adapters/openspec-adapter.js';
import { 
  createClaudeCliAdapter, 
  generateImplementationPrompt,
  type ClaudeCliAdapter 
} from '../adapters/claude-cli-adapter.js';
import { 
  createClaudeSdkAdapter, 
  generateAgenticSystemPrompt,
  type ClaudeSdkAdapter 
} from '../adapters/claude-sdk-adapter.js';
import { createCursorAdapter, type CursorAdapter } from '../adapters/cursor-adapter.js';
import { type SpecLifeConfig } from '../config.js';
import { 
  SpecLifeError, 
  ErrorCodes, 
  type ImplementOptions, 
  type ImplementResult,
  type ProgressCallback,
  type ChangeTask,
} from '../types.js';

/** Dependencies for the implement workflow */
interface ImplementDependencies {
  openspec: OpenSpecAdapter;
  config: SpecLifeConfig;
  claudeCli?: ClaudeCliAdapter;
  claudeSdk?: ClaudeSdkAdapter;
  cursor?: CursorAdapter;
}

/**
 * Implement a change using the specified mode
 */
export async function implementWorkflow(
  options: ImplementOptions,
  deps: ImplementDependencies,
  onProgress?: ProgressCallback
): Promise<ImplementResult> {
  const { changeId, taskId, dryRun = false } = options;
  const mode = options.mode ?? deps.config.implementMode;
  
  // Verify change exists
  if (!await deps.openspec.changeExists(changeId)) {
    throw new SpecLifeError(
      ErrorCodes.CHANGE_NOT_FOUND,
      `Change '${changeId}' not found`,
      { changeId }
    );
  }
  
  onProgress?.({
    type: 'step_completed',
    message: `Starting implementation with mode: ${mode}`,
    data: { mode, changeId },
  });
  
  // Read change context
  const change = await deps.openspec.readChange(changeId);
  const proposalContent = await readChangeFile(changeId, 'proposal.md', deps);
  const tasksContent = await readChangeFile(changeId, 'tasks.md', deps);
  const designContent = await readChangeFile(changeId, 'design.md', deps).catch(() => undefined);
  
  // Filter tasks if taskId specified
  let tasksToImplement = change.tasks.filter(t => !t.completed);
  if (taskId) {
    tasksToImplement = tasksToImplement.filter(t => t.id === taskId);
    if (tasksToImplement.length === 0) {
      throw new SpecLifeError(
        ErrorCodes.CHANGE_NOT_FOUND,
        `Task '${taskId}' not found or already completed`,
        { changeId, taskId }
      );
    }
  }
  
  onProgress?.({
    type: 'step_completed',
    message: `Found ${tasksToImplement.length} task(s) to implement`,
    data: { taskCount: tasksToImplement.length },
  });
  
  // Gather additional context files
  const contextFiles = await gatherContextFiles(deps.config.contextFiles ?? [], process.cwd());
  
  // Dispatch based on mode
  switch (mode) {
    case 'claude-cli':
      return implementWithClaudeCli(
        { changeId, proposalContent, tasksContent, designContent, contextFiles, tasksToImplement, dryRun },
        deps,
        onProgress
      );
    
    case 'claude-sdk':
      return implementWithClaudeSdk(
        { changeId, proposalContent, tasksContent, designContent, contextFiles, tasksToImplement, dryRun },
        deps,
        onProgress
      );
    
    case 'cursor':
      return implementWithCursor(
        { changeId, dryRun },
        deps,
        onProgress
      );
    
    default:
      throw new SpecLifeError(
        ErrorCodes.CONFIG_INVALID,
        `Unknown implementation mode: ${mode}`,
        { mode }
      );
  }
}

/** Context for implementation */
interface ImplementContext {
  changeId: string;
  proposalContent: string;
  tasksContent: string;
  designContent?: string;
  contextFiles: Array<{ path: string; content: string }>;
  tasksToImplement: ChangeTask[];
  dryRun: boolean;
}

/**
 * Implement using Claude CLI
 */
async function implementWithClaudeCli(
  context: ImplementContext,
  deps: ImplementDependencies,
  onProgress?: ProgressCallback
): Promise<ImplementResult> {
  const cli = deps.claudeCli ?? createClaudeCliAdapter();
  
  // Check if CLI is available
  if (!await cli.isAvailable()) {
    throw new SpecLifeError(
      ErrorCodes.CLI_NOT_FOUND,
      'Claude CLI not found. Install from https://docs.anthropic.com/claude-cli or use mode: claude-sdk',
      { mode: 'claude-cli' }
    );
  }
  
  // Generate the implementation prompt
  const prompt = generateImplementationPrompt({
    changeId: context.changeId,
    proposal: context.proposalContent,
    tasks: context.tasksContent,
    design: context.designContent,
    contextFiles: context.contextFiles,
  });
  
  if (context.dryRun) {
    return {
      mode: 'claude-cli',
      status: 'success',
      output: 'Dry run - no changes made',
      tasksCompleted: [],
      plan: prompt,
    };
  }
  
  onProgress?.({
    type: 'step_completed',
    message: 'Invoking Claude CLI...',
  });
  
  // Run Claude CLI with streaming
  const result = await cli.runStreaming(
    prompt,
    { cwd: process.cwd(), model: deps.config.aiModel },
    (chunk) => {
      onProgress?.({
        type: 'step_completed',
        message: chunk,
        data: { streaming: true },
      });
    }
  );
  
  if (!result.success) {
    return {
      mode: 'claude-cli',
      status: 'failed',
      output: result.stderr || 'Claude CLI execution failed',
      tasksCompleted: [],
      tasksFailed: context.tasksToImplement.map(t => ({
        taskId: t.id,
        reason: 'CLI execution failed',
      })),
    };
  }
  
  // Parse output to detect completed tasks
  // This is a simple heuristic - look for task IDs mentioned with completion indicators
  const completedTasks = detectCompletedTasks(result.stdout, context.tasksToImplement);
  
  return {
    mode: 'claude-cli',
    status: completedTasks.length === context.tasksToImplement.length ? 'success' : 'partial',
    output: result.stdout,
    tasksCompleted: completedTasks,
  };
}

/**
 * Implement using Claude SDK (fully automated)
 */
async function implementWithClaudeSdk(
  context: ImplementContext,
  deps: ImplementDependencies,
  onProgress?: ProgressCallback
): Promise<ImplementResult> {
  const sdk = deps.claudeSdk ?? createClaudeSdkAdapter();
  
  // Check if API key is configured
  if (!sdk.isConfigured()) {
    throw new SpecLifeError(
      ErrorCodes.MISSING_TOKEN,
      'ANTHROPIC_API_KEY environment variable required for claude-sdk mode',
      { mode: 'claude-sdk' }
    );
  }
  
  // Generate prompts
  const systemPrompt = generateAgenticSystemPrompt();
  const userPrompt = generateImplementationPrompt({
    changeId: context.changeId,
    proposal: context.proposalContent,
    tasks: context.tasksContent,
    design: context.designContent,
    contextFiles: context.contextFiles,
  });
  
  if (context.dryRun) {
    return {
      mode: 'claude-sdk',
      status: 'success',
      output: 'Dry run - no changes made',
      tasksCompleted: [],
      plan: `System prompt:\n${systemPrompt}\n\nUser prompt:\n${userPrompt}`,
    };
  }
  
  onProgress?.({
    type: 'step_completed',
    message: 'Starting agentic implementation loop...',
  });
  
  // Run the agentic loop
  const result = await sdk.runAgenticLoop(
    systemPrompt,
    userPrompt,
    {
      cwd: process.cwd(),
      model: deps.config.aiModel,
      maxIterations: 50,
      onProgress,
    }
  );
  
  if (!result.success) {
    return {
      mode: 'claude-sdk',
      status: 'failed',
      output: result.errors.join('\n'),
      tasksCompleted: [],
      tasksFailed: context.tasksToImplement.map(t => ({
        taskId: t.id,
        reason: result.errors[0] ?? 'Unknown error',
      })),
    };
  }
  
  // Detect completed tasks from the final response
  const completedTasks = detectCompletedTasks(result.finalResponse, context.tasksToImplement);
  
  onProgress?.({
    type: 'step_completed',
    message: `Implementation complete. ${result.iterations} iterations, ${result.filesModified.length} files modified`,
    data: { iterations: result.iterations, filesModified: result.filesModified },
  });
  
  return {
    mode: 'claude-sdk',
    status: completedTasks.length === context.tasksToImplement.length ? 'success' : 'partial',
    output: result.finalResponse,
    tasksCompleted: completedTasks,
  };
}

/**
 * Implement using Cursor IDE (manual)
 */
async function implementWithCursor(
  context: { changeId: string; dryRun: boolean },
  deps: ImplementDependencies,
  onProgress?: ProgressCallback
): Promise<ImplementResult> {
  const cursor = deps.cursor ?? createCursorAdapter();
  
  // Check if Cursor is available
  if (!await cursor.isAvailable()) {
    throw new SpecLifeError(
      ErrorCodes.CLI_NOT_FOUND,
      "Cursor CLI not found. Install Cursor and ensure 'cursor' command is available",
      { mode: 'cursor' }
    );
  }
  
  const worktreePath = process.cwd();
  
  if (context.dryRun) {
    return {
      mode: 'cursor',
      status: 'success',
      output: 'Dry run - no changes made',
      tasksCompleted: [],
      plan: `Would open Cursor at: ${worktreePath}`,
    };
  }
  
  onProgress?.({
    type: 'step_completed',
    message: 'Opening Cursor IDE...',
  });
  
  // Open Cursor
  const result = await cursor.open(worktreePath);
  
  if (!result.success) {
    return {
      mode: 'cursor',
      status: 'failed',
      output: result.message,
      tasksCompleted: [],
    };
  }
  
  return {
    mode: 'cursor',
    status: 'manual',
    output: `Cursor opened at: ${worktreePath}\n\nImplement the tasks manually using Cursor's AI features, then mark them complete in tasks.md.`,
    tasksCompleted: [],
  };
}

/**
 * Read a file from the change directory
 */
async function readChangeFile(
  changeId: string,
  filename: string,
  deps: ImplementDependencies
): Promise<string> {
  const changePath = join(process.cwd(), deps.config.specDir, 'changes', changeId, filename);
  return readFile(changePath, 'utf-8');
}

/**
 * Gather context files from the project
 */
async function gatherContextFiles(
  paths: string[],
  projectRoot: string
): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];
  
  for (const path of paths) {
    try {
      const fullPath = join(projectRoot, path);
      const content = await readFile(fullPath, 'utf-8');
      files.push({ path, content });
    } catch {
      // Skip files that don't exist or can't be read
    }
  }
  
  return files;
}

/**
 * Detect which tasks were completed based on output text
 * This is a heuristic that looks for task IDs with completion indicators
 */
function detectCompletedTasks(
  output: string,
  tasks: ChangeTask[]
): string[] {
  const completed: string[] = [];
  
  // Look for patterns like "completed task 1.1", "✓ 1.1", "task 1.1 done", etc.
  const completionPatterns = [
    /completed?\s+(?:task\s+)?(\d+\.\d+)/gi,
    /✓\s*(\d+\.\d+)/g,
    /(?:task\s+)?(\d+\.\d+)\s+(?:done|complete|finished)/gi,
    /\[x\]\s*(\d+\.\d+)/gi,
  ];
  
  for (const task of tasks) {
    for (const pattern of completionPatterns) {
      pattern.lastIndex = 0; // Reset regex state
      let match;
      while ((match = pattern.exec(output)) !== null) {
        if (match[1] === task.id) {
          completed.push(task.id);
          break;
        }
      }
    }
  }
  
  return [...new Set(completed)]; // Remove duplicates
}

export type { ImplementDependencies };

