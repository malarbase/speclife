#!/usr/bin/env node
/*
 * SpecLife - Git and GitHub automation for spec-driven development
 * Copyright (C) 2026 malarbase
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * SpecLife CLI
 * 
 * Git/GitHub automation for spec-driven development.
 * Primary interface is slash commands in your editor.
 * This CLI provides git operations for CI/scripting.
 */

import { Command } from 'commander';
import { readFile, writeFile, mkdir, access, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { 
  loadConfig, 
  createGitAdapter,
  createOpenSpecAdapter,
  worktreeCreate,
  worktreeRemove,
  worktreeList,
  statusWorkflow,
  type ProgressEvent,
  type ChangeListItem,
  type PRDisplayStatus,
  // Utils
  formatTable,
  formatSummary,
  sortItems,
  filterByStatus,
  createProgressBar,
  loadTasksFile,
  // Global config
  getGlobalConfigPath,
  getGlobalConfig,
  saveGlobalConfig,
  getGlobalConfigValue,
  setGlobalConfigValue,
  unsetGlobalConfigValue,
  resetGlobalConfig,
  listGlobalConfig,
  // Editor configurators
  EditorRegistry,
  detectEditors,
  sortByPreference,
  type EditorDetectionResult,
  // Completions
  generateCompletions,
  getInstallInstructions,
  getSupportedShells,
  type Shell,
} from '@speclife/core';

const program = new Command();

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let version = '0.3.0';
try {
  const pkgPath = join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
  version = pkg.version;
} catch {
  // Use default version
}

// =============================================================================
// ASCII Art Banner
// =============================================================================

const BANNER = chalk.cyan(`
   ____                   __    _ ____     
  / __/__  ___  ____/ /  (_) __/__ 
  _\\ \\/ _ \\/ -_) __/ /__/ / _/ -_)
 /___/ .__/\\__/\\__/____/_/_/ \\__/ 
    /_/                           
`) + chalk.dim(`v${version}`);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if running in interactive mode
 */
function isInteractive(): boolean {
  return process.stdin.isTTY === true && !process.env.CI;
}

/**
 * Dynamic import of inquirer to avoid stdin issues in CI
 */
async function getInquirer() {
  const inquirer = await import('inquirer');
  return inquirer.default;
}


// =============================================================================
// Program Setup
// =============================================================================

program
  .name('speclife')
  .description('Git/GitHub automation for spec-driven development')
  .version(version);

// =============================================================================
// speclife init - One-time project setup
// =============================================================================

program
  .command('init')
  .description('Configure project for AI editors (one-time setup)')
  .option('--force', 'Overwrite existing configuration')
  .option('--tools <editors>', 'Comma-separated list of editors to configure')
  .option('--no-interactive', 'Run without prompts (for CI)')
  .option('-y, --yes', 'Accept all defaults')
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      const interactive = isInteractive() && options.interactive !== false && !options.yes;
      
      // Show banner in interactive mode
      if (interactive) {
        console.log(BANNER);
        console.log();
      }
      
      const spinner = ora({ isSilent: !process.stdout.isTTY });
      
      spinner.start('Detecting project settings...');
      
      // Detect spec directory
      let specDir = 'openspec';
      for (const dir of ['openspec', 'specs']) {
        try {
          await access(join(cwd, dir));
          specDir = dir;
          break;
        } catch {
          // Continue checking
        }
      }
      
      // Detect git base branch
      const git = createGitAdapter(cwd);
      let baseBranch = 'main';
      try {
        const branches = await git.listWorktrees();
        if (branches.length > 0) {
          baseBranch = 'main'; // Default
        }
      } catch {
        // Use default
      }
      
      spinner.succeed(chalk.green('Project settings detected'));
      console.log(`  ${chalk.dim('•')} Spec directory: ${chalk.cyan(specDir)}`);
      console.log(`  ${chalk.dim('•')} Base branch: ${chalk.cyan(baseBranch)}`);
      
      // Detect available editors
      spinner.start('Detecting editors...');
      const editorResults = await detectEditors(cwd);
      const sortedResults = sortByPreference(editorResults);
      spinner.succeed(chalk.green('Editor detection complete'));
      
      // Select editors
      let selectedEditors: string[] = [];
      
      if (options.tools) {
        // Use provided tools
        selectedEditors = options.tools.split(',').map((s: string) => s.trim());
      } else if (interactive) {
        // Interactive selection
        const inquirer = await getInquirer();
      const choices = sortedResults.map((r: EditorDetectionResult) => ({
        name: `${r.editor.name}${r.installed ? chalk.green(' (detected)') : ''}${r.configured ? chalk.dim(' [configured]') : ''}`,
        value: r.editor.id,
        checked: r.installed,
      }));
        
        console.log();
        const { editors } = await inquirer.prompt([{
          type: 'checkbox',
          name: 'editors',
          message: 'Select editors to configure:',
          choices,
        }]);
        selectedEditors = editors;
      } else {
        // Non-interactive: configure detected editors
        selectedEditors = sortedResults
          .filter((r: EditorDetectionResult) => r.installed)
          .map((r: EditorDetectionResult) => r.editor.id);
        
        if (selectedEditors.length === 0) {
          selectedEditors = ['cursor', 'claude-code']; // Default fallback
        }
      }
      
      // Preview changes
      if (interactive) {
        console.log();
        console.log(chalk.bold('The following files will be created/modified:'));
        console.log(`  ${chalk.dim('•')} .specliferc.yaml`);
        console.log(`  ${chalk.dim('•')} ${specDir}/commands/speclife/`);
        console.log(`  ${chalk.dim('•')} ${specDir}/speclife.md`);
        console.log(`  ${chalk.dim('•')} .github/workflows/speclife-release.yml`);
        for (const editorId of selectedEditors) {
          const editor = EditorRegistry.get(editorId);
          if (editor) {
            console.log(`  ${chalk.dim('•')} ${editor.configDir}/commands/`);
          }
        }
        console.log();
        
        const { proceed } = await (await getInquirer()).prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'Proceed with configuration?',
          default: true,
        }]);
        
        if (!proceed) {
          console.log(chalk.yellow('Aborted.'));
          return;
        }
      }
      
      // Create .specliferc.yaml
      spinner.start('Creating configuration...');
      const configPath = join(cwd, '.specliferc.yaml');
      let configExists = false;
      try {
        await access(configPath);
        configExists = true;
      } catch {
        // File doesn't exist
      }
      
      if (!configExists || options.force) {
        const configContent = `# SpecLife Configuration
# Minimal settings - most values are auto-detected

specDir: ${specDir}

git:
  baseBranch: ${baseBranch}
  branchPrefix: spec/
  worktreeDir: worktrees
`;
        await writeFile(configPath, configContent);
      }
      spinner.succeed(chalk.green('Configuration created'));
      
      // Create slash commands directory and copy templates
      spinner.start('Installing slash commands...');
      const commandsDir = join(cwd, specDir, 'commands', 'speclife');
      await mkdir(commandsDir, { recursive: true });
      
      const templatesDir = join(__dirname, '..', 'templates', 'commands');
      const templateFiles = await readdir(templatesDir);
      const slashCommands = templateFiles
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace('.md', ''));
      
      let copiedCount = 0;
      for (const cmd of slashCommands) {
        const destPath = join(commandsDir, `${cmd}.md`);
        try {
          await access(destPath);
          if (!options.force) continue;
        } catch {
          // File doesn't exist
        }
        
        const templatePath = join(templatesDir, `${cmd}.md`);
        const content = await readFile(templatePath, 'utf-8');
        await writeFile(destPath, content);
        copiedCount++;
      }
      spinner.succeed(chalk.green(`Installed ${copiedCount} slash commands`));
      
      // Create speclife.md
      const speclifeMdPath = join(cwd, specDir, 'speclife.md');
      try {
        await access(speclifeMdPath);
      } catch {
        const speclifeMdContent = `# SpecLife Configuration

This file provides context for AI agents using speclife slash commands.

## Commands

- **Test:** \`npm test\`
- **Build:** \`npm run build\`
- **Lint:** \`npm run lint\`

## Release Policy

- **Auto-release:** patch and minor versions
- **Manual release:** major versions (breaking changes)

## Context Files

When implementing changes, always read:
- \`${specDir}/project.md\` - project context and conventions
- \`${specDir}/AGENTS.md\` - agent guidelines
- \`README.md\` - project overview
`;
        await writeFile(speclifeMdPath, speclifeMdContent);
      }
      
      // Create GitHub workflow
      const workflowDir = join(cwd, '.github', 'workflows');
      let existingWorkflow = false;
      for (const wf of ['release.yml', 'speclife-release.yml']) {
        try {
          await access(join(workflowDir, wf));
          existingWorkflow = true;
          break;
        } catch {
          // Continue
        }
      }
      
      if (!existingWorkflow) {
        await mkdir(workflowDir, { recursive: true });
        const workflowContent = `# SpecLife Release Workflow
name: Create Release

on:
  push:
    branches: [${baseBranch}]

jobs:
  release:
    runs-on: ubuntu-latest
    if: startsWith(github.event.head_commit.message, 'chore(release):')
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - name: Extract version
        id: version
        run: |
          VERSION=$(echo "\${{ github.event.head_commit.message }}" | grep -oP 'v\\d+\\.\\d+\\.\\d+')
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      - name: Create tag
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag \${{ steps.version.outputs.version }}
          git push origin \${{ steps.version.outputs.version }}
      - uses: softprops/action-gh-release@v2
        with:
          tag_name: \${{ steps.version.outputs.version }}
          generate_release_notes: true
`;
        await writeFile(join(workflowDir, 'speclife-release.yml'), workflowContent);
      }
      
      // Configure editors
      spinner.start('Configuring editors...');
      for (const editorId of selectedEditors) {
        const editor = EditorRegistry.get(editorId);
        if (editor) {
          await editor.configure({
            projectPath: cwd,
            specDir,
            force: options.force,
          });
        }
      }
      spinner.succeed(chalk.green('Editors configured'));
      
      // Success message
      console.log();
      console.log(chalk.green.bold('✅ SpecLife configured!'));
      console.log();
      console.log(chalk.bold('Next steps:'));
      console.log(`  ${chalk.cyan('1.')} Run ${chalk.yellow('/speclife setup')} to auto-detect project commands`);
      console.log(`  ${chalk.cyan('2.')} Use ${chalk.yellow('/speclife start "your change"')} to begin a new change`);
      console.log();
      console.log(chalk.dim('Tip: Enable tab completion with:'));
      console.log(chalk.dim(`  speclife completion ${process.env.SHELL?.includes('zsh') ? 'zsh' : 'bash'} >> ~/.${process.env.SHELL?.includes('zsh') ? 'zshrc' : 'bashrc'}`));
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

// =============================================================================
// speclife view - Dashboard view
// =============================================================================

program
  .command('view')
  .description('Show interactive dashboard of all changes')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const git = createGitAdapter(cwd);
      const openspec = createOpenSpecAdapter({ projectRoot: cwd, specDir: config.specDir });
      
      const spinner = ora({ isSilent: options.json || !process.stdout.isTTY });
      spinner.start('Loading changes...');
      
      const changeIds = await openspec.listChanges();
      const items: ChangeListItem[] = [];
      const currentBranch = await git.getCurrentBranch();
      
      for (const id of changeIds) {
        const result = await statusWorkflow({ changeId: id }, { git, openspec });
        if (result) {
          items.push({
            id,
            progress: result.taskSummary,
            prStatus: 'local' as PRDisplayStatus,
            isCurrent: result.onBranch,
            lastActive: new Date(),
          });
        }
      }
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify({ changes: items, currentBranch }, null, 2));
        return;
      }
      
      if (items.length === 0) {
        console.log(chalk.yellow('No active changes'));
        console.log(chalk.dim('Use /speclife start to create a new change'));
        return;
      }
      
      // Header
      console.log();
      console.log(chalk.bold.cyan('╔══════════════════════════════════════════════════════════════╗'));
      console.log(chalk.bold.cyan('║                    SpecLife Dashboard                         ║'));
      console.log(chalk.bold.cyan('╠══════════════════════════════════════════════════════════════╣'));
      
      // Summary
      const ready = items.filter(i => i.progress.percentage === 100).length;
      const inProgress = items.length - ready;
      console.log(chalk.cyan('║ ') + `Summary: ${chalk.bold(items.length)} changes (${chalk.green(ready + ' ready')}, ${chalk.yellow(inProgress + ' in progress')})`.padEnd(60) + chalk.cyan(' ║'));
      console.log(chalk.cyan('╠──────────────────────────────────────────────────────────────╣'));
      
      // Group by completion
      const completed = items.filter(i => i.progress.percentage === 100);
      const pending = items.filter(i => i.progress.percentage < 100);
      
      if (pending.length > 0) {
        console.log(chalk.cyan('║ ') + chalk.bold('In Progress').padEnd(60) + chalk.cyan(' ║'));
        for (const item of pending) {
          const marker = item.isCurrent ? chalk.cyan('→') : ' ';
          const bar = createProgressBar(item.progress.percentage, { width: 10 });
          const line = `${marker} ${item.id.padEnd(22)} ${bar} ${(item.progress.completed + '/' + item.progress.total).padStart(5)}`;
          console.log(chalk.cyan('║ ') + line.padEnd(60) + chalk.cyan(' ║'));
        }
      }
      
      if (completed.length > 0) {
        console.log(chalk.cyan('╠──────────────────────────────────────────────────────────────╣'));
        console.log(chalk.cyan('║ ') + chalk.bold.green('Ready to Land').padEnd(60) + chalk.cyan(' ║'));
        for (const item of completed) {
          const marker = item.isCurrent ? chalk.cyan('→') : ' ';
          const line = `${marker} ${chalk.green('✓')} ${item.id.padEnd(20)} ${chalk.green('[██████████] 100%')}`;
          console.log(chalk.cyan('║ ') + line.padEnd(60) + chalk.cyan(' ║'));
        }
      }
      
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════╝'));
      console.log();
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

// =============================================================================
// speclife completion - Shell completions
// =============================================================================

program
  .command('completion <shell>')
  .description('Generate shell completion script')
  .action(async (shell: string) => {
    const supportedShells = getSupportedShells();
    
    if (!supportedShells.includes(shell as Shell)) {
      console.error(chalk.red(`Unsupported shell: ${shell}`));
      console.error(chalk.dim(`Supported shells: ${supportedShells.join(', ')}`));
      process.exit(1);
    }
    
    const script = generateCompletions(shell as Shell);
    console.log(script);
    
    // Print installation hint to stderr so it doesn't interfere with piping
    console.error(chalk.dim('\n# Installation:'));
    console.error(chalk.dim(getInstallInstructions(shell as Shell)));
  });

// =============================================================================
// speclife config - Configuration management
// =============================================================================

const configCmd = program
  .command('config')
  .description('Manage global configuration');

configCmd
  .command('path')
  .description('Show config file path')
  .action(() => {
    console.log(getGlobalConfigPath());
  });

configCmd
  .command('list')
  .description('List all config values')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const config = await getGlobalConfig();
    
    if (options.json) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }
    
    const entries = await listGlobalConfig(config);
    for (const [key, value] of entries) {
      console.log(`${chalk.cyan(key)}: ${chalk.yellow(String(value))}`);
    }
  });

configCmd
  .command('get <key>')
  .description('Get a config value')
  .action(async (key: string) => {
    const value = await getGlobalConfigValue(key);
    if (value === undefined) {
      console.error(chalk.red(`Key not found: ${key}`));
      process.exit(1);
    }
    console.log(value);
  });

configCmd
  .command('set <key> <value>')
  .description('Set a config value')
  .action(async (key: string, value: string) => {
    // Parse value as JSON if possible
    let parsedValue: unknown = value;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      // Keep as string
    }
    
    await setGlobalConfigValue(key, parsedValue);
    console.log(chalk.green(`Set ${key} = ${value}`));
  });

configCmd
  .command('unset <key>')
  .description('Remove a config value')
  .action(async (key: string) => {
    await unsetGlobalConfigValue(key);
    console.log(chalk.green(`Removed ${key}`));
  });

configCmd
  .command('reset')
  .description('Reset to default values')
  .action(async () => {
    await resetGlobalConfig();
    console.log(chalk.green('Config reset to defaults'));
  });

configCmd
  .command('edit')
  .description('Open config in editor')
  .action(async () => {
    const configPath = getGlobalConfigPath();
    const editor = process.env.EDITOR || 'vi';
    
    // Ensure config exists
    const config = await getGlobalConfig();
    await saveGlobalConfig(config);
    
    const { spawn } = await import('child_process');
    spawn(editor, [configPath], { stdio: 'inherit' });
  });

// =============================================================================
// speclife validate - Validation
// =============================================================================

program
  .command('validate [change-id]')
  .description('Validate a change spec')
  .option('--json', 'Output as JSON')
  .option('--strict', 'Fail on warnings')
  .action(async (changeId: string | undefined, options) => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const git = createGitAdapter(cwd);
      
      // Determine change ID
      let targetChangeId = changeId;
      if (!targetChangeId) {
        const branch = await git.getCurrentBranch();
        if (branch?.startsWith(config.git?.branchPrefix ?? 'spec/')) {
          targetChangeId = branch.replace(config.git?.branchPrefix ?? 'spec/', '');
        }
      }
      
      if (!targetChangeId) {
        console.error(chalk.red('No change ID specified and not on a spec branch'));
        process.exit(1);
      }
      
      const spinner = ora({ isSilent: options.json || !process.stdout.isTTY });
      spinner.start(`Validating ${targetChangeId}...`);
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check proposal.md exists
      const changeDir = join(cwd, config.specDir, 'changes', targetChangeId);
      try {
        await access(join(changeDir, 'proposal.md'));
      } catch {
        errors.push('proposal.md not found');
      }
      
      // Check tasks.md exists and has content
      const tasks = await loadTasksFile(cwd, config.specDir, targetChangeId);
      if (tasks.tasks.length === 0) {
        warnings.push('tasks.md is empty or not found');
      } else {
        const pending = tasks.tasks.filter((t: { completed: boolean }) => !t.completed).length;
        if (pending > 0) {
          warnings.push(`${pending} task(s) still pending`);
        }
      }
      
      // Check branch exists
      try {
        await git.listWorktrees();
        // Branch check is informational
      } catch {
        warnings.push('Could not verify branch status');
      }
      
      spinner.stop();
      
      const status = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'pass_with_warnings' : 'pass';
      
      if (options.json) {
        console.log(JSON.stringify({ status, errors, warnings }, null, 2));
        process.exit(status === 'fail' || (options.strict && status === 'pass_with_warnings') ? 1 : 0);
      }
      
      if (errors.length > 0) {
        console.log(chalk.red.bold('✗ Validation failed'));
        for (const err of errors) {
          console.log(chalk.red(`  • ${err}`));
        }
      }
      
      if (warnings.length > 0) {
        console.log(chalk.yellow.bold('⚠ Warnings'));
        for (const warn of warnings) {
          console.log(chalk.yellow(`  • ${warn}`));
        }
      }
      
      if (status === 'pass') {
        console.log(chalk.green.bold('✓ Validation passed'));
      }
      
      if (status === 'fail' || (options.strict && status === 'pass_with_warnings')) {
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

// =============================================================================
// speclife update - Refresh managed files
// =============================================================================

program
  .command('update')
  .description('Update slash command templates')
  .option('-f, --force', 'Overwrite customizations')
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      
      const spinner = ora({ isSilent: !process.stdout.isTTY });
      spinner.start('Updating templates...');
      
      const commandsDir = join(cwd, config.specDir, 'commands', 'speclife');
      const templatesDir = join(__dirname, '..', 'templates', 'commands');
      
      let updated = 0;
      let skipped = 0;
      
      const templateFiles = await readdir(templatesDir);
      for (const file of templateFiles) {
        if (!file.endsWith('.md')) continue;
        
        const destPath = join(commandsDir, file);
        const templatePath = join(templatesDir, file);
        
        try {
          await access(destPath);
          if (!options.force) {
            skipped++;
            continue;
          }
        } catch {
          // File doesn't exist
        }
        
        const content = await readFile(templatePath, 'utf-8');
        await writeFile(destPath, content);
        updated++;
      }
      
      spinner.succeed(chalk.green(`Updated ${updated} template(s)${skipped > 0 ? `, ${skipped} skipped (use --force)` : ''}`));
      
      // Update editor symlinks
      spinner.start('Refreshing editor symlinks...');
      const editors = EditorRegistry.getAll();
      for (const editor of editors) {
        if (await editor.isConfigured(cwd)) {
          await editor.configure({
            projectPath: cwd,
            specDir: config.specDir,
            force: true,
          });
        }
      }
      spinner.succeed(chalk.green('Editor symlinks refreshed'));
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

// =============================================================================
// speclife worktree - Worktree management
// =============================================================================

const worktreeCmd = program
  .command('worktree')
  .description('Manage git worktrees for changes');

worktreeCmd
  .command('create <change-id>')
  .description('Create a worktree and branch for a new change')
  .option('--skip-bootstrap', 'Skip environment bootstrapping')
  .action(async (changeId: string, options) => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const git = createGitAdapter(cwd);
      
      const spinner = ora({ isSilent: !process.stdout.isTTY });
      spinner.start(`Creating worktree for ${changeId}...`);
      
      const result = await worktreeCreate(
        {
          changeId,
          skipBootstrap: options.skipBootstrap,
        },
        { git, config },
        (event: ProgressEvent) => {
          spinner.text = event.message;
        }
      );
      
      spinner.succeed(chalk.green('Worktree created'));
      console.log(`  ${chalk.dim('•')} Path: ${chalk.cyan(result.worktreePath)}`);
      console.log(`  ${chalk.dim('•')} Branch: ${chalk.cyan(result.branch)}`);
      console.log();
      console.log(`${chalk.bold('Next:')} cd ${result.worktreePath}`);
      console.log(`${chalk.dim('Then:')} Run /openspec-proposal to create the spec`);
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

worktreeCmd
  .command('rm <change-id>')
  .description('Remove a worktree and its branch')
  .option('-f, --force', 'Force removal even with uncommitted changes')
  .action(async (changeId: string, options) => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const git = createGitAdapter(cwd);
      
      const spinner = ora({ isSilent: !process.stdout.isTTY });
      spinner.start(`Removing worktree ${changeId}...`);
      
      const result = await worktreeRemove(
        {
          changeId,
          force: options.force,
        },
        { git, config },
        (event: ProgressEvent) => {
          spinner.text = event.message;
        }
      );
      
      spinner.succeed(chalk.green('Worktree removed'));
      console.log(`  ${chalk.dim('•')} Removed: ${chalk.cyan(result.worktreePath)}`);
      console.log(`  ${chalk.dim('•')} Branch: ${chalk.cyan(result.branch)}`);
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

worktreeCmd
  .command('list')
  .description('List all active worktrees')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const git = createGitAdapter(cwd);
      
      const result = await worktreeList({ git, config });
      
      if (options.json) {
        console.log(JSON.stringify(result.worktrees, null, 2));
        return;
      }
      
      if (result.worktrees.length === 0) {
        console.log(chalk.yellow('No active worktrees'));
        return;
      }
      
      console.log(chalk.bold('Active worktrees:'));
      for (const wt of result.worktrees) {
        console.log(`  ${chalk.cyan(wt.changeId)}`);
        console.log(`    ${chalk.dim('Branch:')} ${wt.branch}`);
        console.log(`    ${chalk.dim('Path:')} ${wt.path}`);
      }
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

// =============================================================================
// speclife status - Show change status
// =============================================================================

program
  .command('status [change-id]')
  .description('Show status of a change')
  .option('--json', 'Output as JSON')
  .action(async (changeId: string | undefined, options) => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const git = createGitAdapter(cwd);
      const openspec = createOpenSpecAdapter({ projectRoot: cwd, specDir: config.specDir });
      
      const result = await statusWorkflow({ changeId }, { git, openspec });
      
      if (!result) {
        const msg = changeId 
          ? `Change '${changeId}' not found`
          : 'No active change on current branch';
        
        if (options.json) {
          console.log(JSON.stringify({ error: msg }, null, 2));
        } else {
          console.log(chalk.yellow(msg));
        }
        return;
      }
      
      const { change, onBranch, taskSummary } = result;
      
      if (options.json) {
        console.log(JSON.stringify({ change, onBranch, taskSummary }, null, 2));
        return;
      }
      
      const bar = createProgressBar(taskSummary.percentage, { width: 10, showPercentage: true });
      
      console.log(chalk.bold(`Change: ${chalk.cyan(change.id)}`));
      console.log(`  ${chalk.dim('State:')} ${change.state}`);
      console.log(`  ${chalk.dim('Branch:')} ${change.branch}${onBranch ? chalk.green(' (current)') : ''}`);
      console.log(`  ${chalk.dim('Tasks:')} ${bar} ${taskSummary.completed}/${taskSummary.total}`);
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

// =============================================================================
// speclife list - List all changes
// =============================================================================

program
  .command('list')
  .description('List all active changes')
  .option('--json', 'Output as JSON')
  .option('--compact', 'Compact output')
  .option('--sort <order>', 'Sort by: activity, progress, name', 'activity')
  .option('--status <filter>', 'Filter by status: draft, ready, merged, closed, local')
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const git = createGitAdapter(cwd);
      const openspec = createOpenSpecAdapter({ projectRoot: cwd, specDir: config.specDir });
      
      const changeIds = await openspec.listChanges();
      
      if (changeIds.length === 0) {
        if (options.json) {
          console.log(JSON.stringify([], null, 2));
        } else {
          console.log(chalk.yellow('No active changes'));
        }
        return;
      }
      
      const items: ChangeListItem[] = [];
      for (const id of changeIds) {
        const result = await statusWorkflow({ changeId: id }, { git, openspec });
        if (result) {
          items.push({
            id,
            progress: result.taskSummary,
            prStatus: 'local' as PRDisplayStatus,
            isCurrent: result.onBranch,
            lastActive: new Date(),
          });
        }
      }
      
      // Sort and filter
      let processed = sortItems(items, options.sort as 'activity' | 'progress' | 'name');
      if (options.status) {
        processed = filterByStatus(processed, options.status as PRDisplayStatus);
      }
      
      if (options.json) {
        console.log(JSON.stringify(processed, null, 2));
        return;
      }
      
      if (options.compact) {
        for (const item of processed) {
          const marker = item.isCurrent ? chalk.cyan('→ ') : '  ';
          const bar = createProgressBar(item.progress.percentage, { width: 10 });
          console.log(`${marker}${item.id.padEnd(24)} ${bar} ${item.progress.completed}/${item.progress.total}`);
        }
      } else {
        console.log(formatTable(processed));
        console.log();
        console.log(chalk.dim(formatSummary(processed)));
      }
      
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

// =============================================================================
// speclife version - Show version
// =============================================================================

program
  .command('version')
  .description('Show speclife version')
  .action(() => {
    console.log(`speclife v${version}`);
  });

program.parse();
