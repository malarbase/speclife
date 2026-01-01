#!/usr/bin/env node
/**
 * SpecLife CLI
 * 
 * Thin CLI wrapper for CI/scripting.
 * Primary interface is the MCP server.
 */

import { Command } from 'commander';
import { 
  loadConfig, 
  createGitAdapter, 
  createOpenSpecAdapter, 
  initWorkflow,
  statusWorkflow,
} from '@speclife/core';

const program = new Command();

program
  .name('speclife')
  .description('Bring specifications to life - automated spec-driven development')
  .version('0.1.0');

program
  .command('init <change-id>')
  .description('Initialize a new change: create worktree (default) and scaffold proposal')
  .option('-m, --message <description>', 'Brief description for the proposal')
  .option('--no-worktree', 'Create branch in current directory instead of worktree')
  .option('--dry-run', 'Preview changes without applying')
  .action(async (changeId: string, options) => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const git = createGitAdapter(cwd);
      const openspec = createOpenSpecAdapter({ projectRoot: cwd, specDir: config.specDir });
      
      const result = await initWorkflow(
        {
          changeId,
          description: options.message,
          noWorktree: !options.worktree,
          dryRun: options.dryRun,
        },
        { git, openspec, config },
        (event) => console.log(`  ${event.message}`)
      );
      
      if (result.worktreePath) {
        console.log(`✓ Created worktree: ${result.worktreePath}`);
      }
      console.log(`✓ Created branch: ${result.branch}`);
      console.log(`✓ Scaffolded: ${result.proposalPath}`);
      console.log(`✓ Scaffolded: ${result.tasksPath}`);
      
      if (result.worktreePath) {
        console.log(`\nNext: cd ${result.worktreePath}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

program
  .command('status [change-id]')
  .description('Show status of a change')
  .action(async (changeId?: string) => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const git = createGitAdapter(cwd);
      const openspec = createOpenSpecAdapter({ projectRoot: cwd, specDir: config.specDir });
      
      const result = await statusWorkflow({ changeId }, { git, openspec });
      
      if (!result) {
        console.log(changeId 
          ? `Change '${changeId}' not found`
          : 'No active change on current branch'
        );
        return;
      }
      
      const { change, onBranch, taskSummary } = result;
      console.log(`Change: ${change.id}`);
      console.log(`State: ${change.state}`);
      console.log(`Branch: ${change.branch}${onBranch ? ' (current)' : ''}`);
      console.log(`Tasks: ${taskSummary.completed}/${taskSummary.total} (${taskSummary.percentage}%)`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all active changes')
  .action(async () => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const git = createGitAdapter(cwd);
      const openspec = createOpenSpecAdapter({ projectRoot: cwd, specDir: config.specDir });
      
      const changeIds = await openspec.listChanges();
      
      if (changeIds.length === 0) {
        console.log('No active changes');
        return;
      }
      
      console.log('Active changes:');
      for (const id of changeIds) {
        const result = await statusWorkflow({ changeId: id }, { git, openspec });
        if (result) {
          const marker = result.onBranch ? '→ ' : '  ';
          console.log(`${marker}${id} (${result.change.state}, ${result.taskSummary.completed}/${result.taskSummary.total} tasks)`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// TODO: Add submit, merge, implement, test commands in future phases

program.parse();

