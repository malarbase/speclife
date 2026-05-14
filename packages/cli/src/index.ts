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
 * Minimal bootstrap tool for SpecLife slash commands.
 * Primary interface is slash commands in your editor.
 */

import { Command } from 'commander';
import { readFile, writeFile, mkdir, access, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import {
  loadConfig,
  EditorRegistry,
  detectEditors,
  sortByPreference,
  type EditorDetectionResult,
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
// Helper Functions
// =============================================================================

function isInteractive(): boolean {
  return process.stdin.isTTY === true && !process.env.CI;
}

async function getInquirer() {
  const inquirer = await import('inquirer');
  return inquirer.default;
}

// =============================================================================
// Program Setup
// =============================================================================

program
  .name('speclife')
  .description('Bootstrap tool for SpecLife slash commands')
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

      const spinner = ora({ isSilent: !process.stdout.isTTY });

      spinner.start('Detecting project settings...');

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

      const baseBranch = 'main';

      spinner.succeed(chalk.green('Project settings detected'));
      console.log(`  ${chalk.dim('•')} Spec directory: ${chalk.cyan(specDir)}`);
      console.log(`  ${chalk.dim('•')} Base branch: ${chalk.cyan(baseBranch)}`);

      spinner.start('Detecting editors...');
      const editorResults = await detectEditors(cwd);
      const sortedResults = sortByPreference(editorResults);
      spinner.succeed(chalk.green('Editor detection complete'));

      let selectedEditors: string[] = [];

      if (options.tools) {
        selectedEditors = options.tools.split(',').map((s: string) => s.trim());
      } else if (interactive) {
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
        selectedEditors = sortedResults
          .filter((r: EditorDetectionResult) => r.installed)
          .map((r: EditorDetectionResult) => r.editor.id);

        if (selectedEditors.length === 0) {
          selectedEditors = ['cursor', 'claude-code', 'roocode', 'windsurf'];
        }
      }

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

    console.error(chalk.dim('\n# Installation:'));
    console.error(chalk.dim(getInstallInstructions(shell as Shell)));
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
// speclife version - Show version
// =============================================================================

program
  .command('version')
  .description('Show speclife version')
  .action(() => {
    console.log(`speclife v${version}`);
  });

program.parse();
