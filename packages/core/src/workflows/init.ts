/**
 * Init workflow - create branch and scaffold change proposal
 */

import { type GitAdapter } from '../adapters/git-adapter.js';
import { type GitHubAdapter } from '../adapters/github-adapter.js';
import { type OpenSpecAdapter, createOpenSpecAdapter } from '../adapters/openspec-adapter.js';
import {
  type EnvironmentRegistry,
  type BootstrapResult,
  createDefaultEnvironmentRegistry,
} from '../adapters/environment-adapter.js';
import {
  createClaudeCliAdapter,
  generateTaskGenerationPrompt,
  parseTaskGenerationResponse,
} from '../adapters/claude-cli-adapter.js';
import { type SpecLifeConfig } from '../config.js';
import { SpecLifeError, ErrorCodes, type PullRequest, type ProgressCallback } from '../types.js';

export interface InitOptions {
  /** Change identifier (kebab-case) */
  changeId: string;
  /** Brief description for the proposal */
  description?: string;
  /** Disable worktree creation (create branch in current worktree instead) */
  noWorktree?: boolean;
  /** Skip environment bootstrap (dependencies won't be set up) */
  skipBootstrap?: boolean;
  /** Preview changes without applying */
  dryRun?: boolean;
  /** Skip draft PR creation (overrides config.createDraftPR) */
  skipDraftPR?: boolean;
  /** Generate tasks using AI based on description */
  generateTasks?: boolean;
}

export interface InitResult {
  /** Created branch name */
  branch: string;
  /** Worktree path (if worktree created) */
  worktreePath?: string;
  /** Path to proposal.md */
  proposalPath: string;
  /** Path to tasks.md */
  tasksPath: string;
  /** Environment bootstrap results (if bootstrap ran) */
  bootstrapResults?: BootstrapResult[];
  /** Draft PR created (if createDraftPR is enabled) */
  pullRequest?: PullRequest;
  /** Whether tasks were AI-generated */
  tasksGenerated?: boolean;
  /** Preview of generated tasks (first few lines) */
  tasksPreview?: string;
}

interface InitDependencies {
  git: GitAdapter;
  openspec: OpenSpecAdapter;
  config: SpecLifeConfig;
  /** Environment registry (uses default if not provided) */
  environmentRegistry?: EnvironmentRegistry;
  /** GitHub adapter (required if createDraftPR is enabled) */
  github?: GitHubAdapter;
}

/**
 * Initialize a new change
 * 
 * By default, creates a worktree for isolated development.
 * Use noWorktree to create a branch in the current worktree instead.
 */
export async function initWorkflow(
  options: InitOptions,
  deps: InitDependencies,
  onProgress?: ProgressCallback
): Promise<InitResult> {
  const { changeId, description, noWorktree = false, skipBootstrap = false, dryRun = false, skipDraftPR = false, generateTasks = false } = options;
  const { git, openspec, config, environmentRegistry, github } = deps;
  
  // Determine if we should create a draft PR
  const shouldCreateDraftPR = config.createDraftPR && !skipDraftPR && !dryRun;
  
  // Validate that github adapter is provided if draft PR is needed
  if (shouldCreateDraftPR && !github) {
    throw new SpecLifeError(
      ErrorCodes.CONFIG_INVALID,
      'GitHub adapter is required when createDraftPR is enabled',
      { createDraftPR: config.createDraftPR, skipDraftPR }
    );
  }
  
  // Validate changeId format (kebab-case)
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(changeId)) {
    throw new SpecLifeError(
      ErrorCodes.CONFIG_INVALID,
      `Invalid changeId format: "${changeId}". Must be kebab-case (e.g., "add-user-auth")`,
      { changeId }
    );
  }
  
  const branch = `spec/${changeId}`;
  const worktreePath = `worktrees/${changeId}`;
  
  // Check if branch already exists
  if (await git.branchExists(branch)) {
    throw new SpecLifeError(
      ErrorCodes.BRANCH_EXISTS,
      `Branch '${branch}' already exists`,
      { branch }
    );
  }
  
  // For worktree mode, check if change exists in main repo's openspec
  // For non-worktree mode, check current directory
  // TODO: Improve change existence check for worktree mode
  
  if (dryRun) {
    const basePath = noWorktree ? '' : `${worktreePath}/`;
    return {
      branch,
      worktreePath: noWorktree ? undefined : worktreePath,
      proposalPath: `${basePath}openspec/changes/${changeId}/proposal.md`,
      tasksPath: `${basePath}openspec/changes/${changeId}/tasks.md`,
    };
  }
  
  if (noWorktree) {
    // Legacy mode: create branch in current worktree
    onProgress?.({ type: 'step_completed', message: `Creating branch ${branch}` });
    await git.createBranch(branch, config.github.baseBranch);
    
    // Scaffold proposal files in current directory
    onProgress?.({ type: 'step_completed', message: 'Scaffolding proposal files' });
    const { proposalPath, tasksPath } = await openspec.scaffoldChange(changeId, { description });
    
    // Generate tasks using AI if requested
    let tasksGenerated = false;
    let tasksPreview: string | undefined;
    if (generateTasks && description) {
      const result = await generateTasksWithAI({
        changeId,
        description,
        tasksPath,
        cwd: process.cwd(),
        onProgress,
      });
      tasksGenerated = result.success;
      tasksPreview = result.preview;
    }
    
    // Create draft PR if enabled
    let pullRequest: PullRequest | undefined;
    if (shouldCreateDraftPR && github) {
      pullRequest = await createInitialDraftPR({
        git,
        github,
        changeId,
        description,
        branch,
        baseBranch: config.github.baseBranch,
        onProgress,
      });
    }
    
    onProgress?.({ type: 'step_completed', message: 'Initialization complete' });
    
    return {
      branch,
      proposalPath,
      tasksPath,
      pullRequest,
      tasksGenerated,
      tasksPreview,
    };
  }
  
  // Default: Create worktree for isolated development
  onProgress?.({ type: 'step_completed', message: `Creating worktree at ${worktreePath}` });
  await git.createWorktree(worktreePath, branch);
  
  // Bootstrap environment (unless skipped)
  let bootstrapResults: BootstrapResult[] | undefined;
  if (!skipBootstrap) {
    const registry = environmentRegistry ?? createDefaultEnvironmentRegistry();
    const strategy = config.worktree?.bootstrap?.strategy ?? 'symlink';
    
    onProgress?.({ type: 'step_completed', message: 'Detecting and bootstrapping environments' });
    
    // Get the source root (current working directory)
    const sourceRoot = process.cwd();
    
    bootstrapResults = await registry.bootstrapAll(
      worktreePath,
      sourceRoot,
      strategy,
      onProgress
    );
    
    // Report results
    const successful = bootstrapResults.filter(r => r.success);
    const failed = bootstrapResults.filter(r => !r.success);
    
    if (successful.length > 0) {
      onProgress?.({
        type: 'step_completed',
        message: `Bootstrapped ${successful.length} environment(s): ${successful.map(r => r.environment).join(', ')}`,
        data: { results: successful },
      });
    }
    
    if (failed.length > 0) {
      onProgress?.({
        type: 'step_completed',
        message: `Warning: ${failed.length} environment(s) failed to bootstrap: ${failed.map(r => r.message).join('; ')}`,
        data: { results: failed },
      });
    }
  }
  
  // Create OpenSpec adapter for the worktree
  const worktreeOpenspec = createOpenSpecAdapter({
    projectRoot: worktreePath,
    specDir: config.specDir,
  });
  
  // Scaffold proposal files in worktree
  onProgress?.({ type: 'step_completed', message: 'Scaffolding proposal files in worktree' });
  const { proposalPath, tasksPath } = await worktreeOpenspec.scaffoldChange(changeId, { description });
  
  // Generate tasks using AI if requested
  let tasksGenerated = false;
  let tasksPreview: string | undefined;
  if (generateTasks && description) {
    const result = await generateTasksWithAI({
      changeId,
      description,
      tasksPath,
      cwd: worktreePath,
      onProgress,
    });
    tasksGenerated = result.success;
    tasksPreview = result.preview;
  }
  
  // Create draft PR if enabled
  // For worktree mode, we need a git adapter for the worktree
  let pullRequest: PullRequest | undefined;
  if (shouldCreateDraftPR && github) {
    // Create a git adapter for the worktree to commit and push from there
    const { createGitAdapter } = await import('../adapters/git-adapter.js');
    const worktreeGit = createGitAdapter(worktreePath);
    
    pullRequest = await createInitialDraftPR({
      git: worktreeGit,
      github,
      changeId,
      description,
      branch,
      baseBranch: config.github.baseBranch,
      onProgress,
    });
  }
  
  onProgress?.({ type: 'step_completed', message: 'Initialization complete' });
  
  return {
    branch,
    worktreePath,
    proposalPath,
    tasksPath,
    bootstrapResults,
    pullRequest,
    tasksGenerated,
    tasksPreview,
  };
}

/**
 * Helper to generate tasks using AI
 */
async function generateTasksWithAI(params: {
  changeId: string;
  description: string;
  tasksPath: string;
  cwd: string;
  onProgress?: ProgressCallback;
}): Promise<{ success: boolean; preview?: string }> {
  const { changeId, description, tasksPath, cwd, onProgress } = params;
  
  try {
    onProgress?.({ type: 'step_completed', message: 'Generating tasks with AI...' });
    
    const claudeCli = createClaudeCliAdapter();
    
    // Check if Claude CLI is available
    if (!await claudeCli.isAvailable()) {
      onProgress?.({ type: 'step_completed', message: 'Claude CLI not available, skipping task generation' });
      return { success: false };
    }
    
    // Generate prompt
    const prompt = generateTaskGenerationPrompt({
      changeId,
      description,
    });
    
    // Run Claude CLI
    const result = await claudeCli.run(prompt, {
      cwd,
      maxTokens: 2000,
    });
    
    if (!result.success) {
      onProgress?.({ type: 'step_completed', message: 'Task generation failed, using empty template' });
      return { success: false };
    }
    
    // Parse the response
    const tasks = parseTaskGenerationResponse(result.stdout);
    
    if (!tasks || tasks.length < 10) {
      onProgress?.({ type: 'step_completed', message: 'Generated tasks too short, using empty template' });
      return { success: false };
    }
    
    // Write tasks to file
    const { writeFile } = await import('fs/promises');
    await writeFile(tasksPath, tasks + '\n');
    
    // Get preview (first 5 lines)
    const previewLines = tasks.split('\n').slice(0, 5);
    const preview = previewLines.join('\n') + (tasks.split('\n').length > 5 ? '\n...' : '');
    
    onProgress?.({ type: 'step_completed', message: `Generated ${tasks.split('\n').filter(l => l.includes('[ ]')).length} tasks` });
    
    return { success: true, preview };
  } catch (error) {
    onProgress?.({ type: 'step_completed', message: 'Task generation failed, using empty template' });
    return { success: false };
  }
}

/**
 * Helper to create initial commit, push, and draft PR
 */
async function createInitialDraftPR(params: {
  git: GitAdapter;
  github: GitHubAdapter;
  changeId: string;
  description?: string;
  branch: string;
  baseBranch: string;
  onProgress?: ProgressCallback;
}): Promise<PullRequest> {
  const { git, github, changeId, description, branch, baseBranch, onProgress } = params;
  
  // Stage and commit the scaffolded files
  onProgress?.({ type: 'step_completed', message: 'Committing proposal files' });
  await git.add(['.']);
  await git.commit(`spec: add ${changeId} proposal`);
  
  // Push to origin
  onProgress?.({ type: 'step_completed', message: `Pushing to origin/${branch}` });
  await git.push('origin', branch);
  
  // Create draft PR
  onProgress?.({ type: 'step_completed', message: 'Creating draft pull request' });
  const prTitle = generatePRTitle(changeId, description);
  const prBody = generateInitialPRBody(changeId, description);
  
  const pullRequest = await github.createPullRequest({
    title: prTitle,
    body: prBody,
    head: branch,
    base: baseBranch,
    draft: true,
  });
  
  onProgress?.({ type: 'step_completed', message: `Created draft PR #${pullRequest.number}` });
  
  return pullRequest;
}

/**
 * Generate PR title from changeId and description
 */
function generatePRTitle(changeId: string, description?: string): string {
  if (description) {
    const firstLine = description.split('\n')[0].trim();
    if (firstLine.length > 72) {
      return firstLine.slice(0, 69) + '...';
    }
    return firstLine;
  }
  // Convert kebab-case to title case
  return changeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Generate initial PR body for draft PR
 */
function generateInitialPRBody(_changeId: string, description?: string): string {
  const lines = [
    '## Proposal',
    '',
    description || '_Proposal pending - see proposal.md for details_',
    '',
    '---',
    '',
    '> 📝 **Draft PR** - This PR was created during `speclife_init` to track the change from the start.',
    '> Update the proposal and tasks as you implement the change.',
    '',
    '*Created with [SpecLife](https://github.com/malarbase/speclife)*',
  ];
  
  return lines.join('\n');
}
