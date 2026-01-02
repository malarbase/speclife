#!/usr/bin/env node
/**
 * SpecLife CLI
 * 
 * Git/GitHub automation for spec-driven development.
 * Primary interface is slash commands in your editor.
 * This CLI provides git operations for CI/scripting.
 */

import { Command } from 'commander';
import { readFile, writeFile, mkdir, access, symlink, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { 
  loadConfig, 
  createGitAdapter,
  createOpenSpecAdapter,
  worktreeCreate,
  worktreeRemove,
  worktreeList,
  statusWorkflow,
  type ProgressEvent,
} from '@speclife/core';

const program = new Command();

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let version = '0.2.0';
try {
  const pkgPath = join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
  version = pkg.version;
} catch {
  // Use default version
}

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
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      
      console.log('Detecting project settings...');
      
      // Detect spec directory
      let specDir = 'openspec';
      for (const dir of ['openspec', 'specs']) {
        try {
          await access(join(cwd, dir));
          specDir = dir;
          console.log(`✓ Found ${dir}/ directory`);
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
      console.log(`✓ Detected git base branch: ${baseBranch}`);
      
      // Create .specliferc.yaml
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
        console.log('✓ Created .specliferc.yaml');
      } else {
        console.log('✓ .specliferc.yaml already exists (use --force to overwrite)');
      }
      
      // Create slash commands directory
      const commandsDir = join(cwd, specDir, 'commands', 'speclife');
      try {
        await mkdir(commandsDir, { recursive: true });
        console.log(`✓ Created ${specDir}/commands/speclife/`);
      } catch {
        console.log(`✓ ${specDir}/commands/speclife/ already exists`);
      }
      
      // Copy slash command templates (from templates embedded in package)
      const slashCommands = ['setup', 'start', 'implement', 'ship', 'land', 'release'];
      const templatesDir = join(__dirname, '..', 'templates', 'commands');
      
      for (const cmd of slashCommands) {
        const destPath = join(commandsDir, `${cmd}.md`);
        try {
          await access(destPath);
          if (!options.force) {
            continue; // Skip existing
          }
        } catch {
          // File doesn't exist, create it
        }
        
        // Try to copy from templates, or use embedded content
        try {
          const templatePath = join(templatesDir, `${cmd}.md`);
          const content = await readFile(templatePath, 'utf-8');
          await writeFile(destPath, content);
        } catch {
          // Template not found, commands should already exist in openspec/commands/speclife/
        }
      }
      console.log(`✓ Slash commands available in ${specDir}/commands/speclife/`);
      
      // Create speclife.md if it doesn't exist
      const speclifeMdPath = join(cwd, specDir, 'speclife.md');
      try {
        await access(speclifeMdPath);
        console.log(`✓ ${specDir}/speclife.md already exists`);
      } catch {
        const speclifeMdContent = `# SpecLife Configuration

This file provides context for AI agents using speclife slash commands.

## Commands

<!-- Values auto-detected by /speclife setup from package.json, Makefile, Cargo.toml, etc. -->
- **Test:** \`TODO: detect test command\`
- **Build:** \`TODO: detect build command\`
- **Lint:** \`TODO: detect lint command\`

## Release Policy

- **Auto-release:** patch and minor versions
- **Manual release:** major versions (breaking changes)

## Publish

<!-- Auto-detected by /speclife setup -->
- **Registry:** TODO: detect (npm / PyPI / crates.io / None)
- **Workflow:** TODO: check .github/workflows/publish.yml
- **Secret:** TODO: NPM_TOKEN / PYPI_TOKEN / CARGO_REGISTRY_TOKEN

## Context Files

When implementing changes, always read:
- \`${specDir}/project.md\` - project context and conventions
- \`${specDir}/AGENTS.md\` - agent guidelines
- \`README.md\` - project overview

## Notes

- Run \`/speclife setup\` to auto-detect commands and publish config
- Or manually edit the TODO items above
`;
        await writeFile(speclifeMdPath, speclifeMdContent);
        console.log(`✓ Created ${specDir}/speclife.md (template)`);
      }
      
      // Create GitHub release workflow (only if no release workflow exists)
      const workflowDir = join(cwd, '.github', 'workflows');
      const releaseWorkflows = ['release.yml', 'speclife-release.yml'];
      let existingReleaseWorkflow: string | null = null;
      
      for (const wf of releaseWorkflows) {
        try {
          await access(join(workflowDir, wf));
          existingReleaseWorkflow = wf;
          break;
        } catch {
          // Continue checking
        }
      }
      
      if (existingReleaseWorkflow) {
        console.log(`✓ Release workflow already exists: .github/workflows/${existingReleaseWorkflow}`);
      } else {
        try {
          await mkdir(workflowDir, { recursive: true });
          const workflowContent = `# SpecLife Release Workflow
# Automatically creates GitHub releases when release commits are merged

name: Create Release

on:
  push:
    branches:
      - ${baseBranch}

jobs:
  release:
    runs-on: ubuntu-latest
    if: startsWith(github.event.head_commit.message, 'chore(release):')
    
    permissions:
      contents: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Extract version from commit
        id: version
        run: |
          VERSION=$(echo "\${{ github.event.head_commit.message }}" | grep -oP 'v\\d+\\.\\d+\\.\\d+')
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "Detected version: $VERSION"
      
      - name: Create and push tag
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag \${{ steps.version.outputs.version }}
          git push origin \${{ steps.version.outputs.version }}
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: \${{ steps.version.outputs.version }}
          generate_release_notes: true
`;
          await writeFile(join(workflowDir, 'speclife-release.yml'), workflowContent);
          console.log('✓ Created .github/workflows/speclife-release.yml');
        } catch (err) {
          console.log('⚠️  Could not create release workflow');
        }
      }
      
      // Configure editor symlinks
      await configureEditorSymlinks(cwd, specDir, options.force);
      
      console.log('\n✅ SpecLife configured!');
      console.log('\nNext steps:');
      console.log('  1. Run /speclife setup to auto-detect project commands');
      console.log('  2. Or manually edit openspec/speclife.md');
      console.log('  3. Use /speclife start to begin a new change');
      
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

/**
 * Configure editor symlinks for slash commands
 */
async function configureEditorSymlinks(cwd: string, specDir: string, force: boolean) {
  const editors = [
    { name: 'Cursor', dir: '.cursor' },
    { name: 'Claude Code', dir: '.claude' },
  ];
  
  const sourceDir = join(cwd, specDir, 'commands', 'speclife');
  
  for (const editor of editors) {
    const editorCommandsDir = join(cwd, editor.dir, 'commands', 'speclife');
    
    try {
      // Check if source commands exist
      await access(sourceDir);
      
      // Create editor commands directory
      await mkdir(dirname(editorCommandsDir), { recursive: true });
      
      // Create symlink (or update if force)
      try {
        await access(editorCommandsDir);
        if (force) {
          await unlink(editorCommandsDir);
          await symlink(sourceDir, editorCommandsDir);
          console.log(`✓ Updated ${editor.name} symlink`);
        } else {
          console.log(`✓ ${editor.name} commands already configured`);
        }
      } catch {
        await symlink(sourceDir, editorCommandsDir);
        console.log(`✓ Configured ${editor.name} commands`);
      }
    } catch {
      // Source doesn't exist yet, skip
    }
  }
}

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
      
      const result = await worktreeCreate(
        {
          changeId,
          skipBootstrap: options.skipBootstrap,
        },
        { git, config },
        (event: ProgressEvent) => console.log(`  ${event.message}`)
      );
      
      console.log(`\n✓ Created worktree: ${result.worktreePath}`);
      console.log(`✓ Created branch: ${result.branch}`);
      console.log(`\nNext: cd ${result.worktreePath}`);
      console.log('Then: Run /openspec-proposal to create the spec');
      
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
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
      
      const result = await worktreeRemove(
        {
          changeId,
          force: options.force,
        },
        { git, config },
        (event: ProgressEvent) => console.log(`  ${event.message}`)
      );
      
      console.log(`\n✓ Removed worktree: ${result.worktreePath}`);
      console.log(`✓ Deleted branch: ${result.branch}`);
      
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

worktreeCmd
  .command('list')
  .description('List all active worktrees')
  .action(async () => {
    try {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const git = createGitAdapter(cwd);
      
      const result = await worktreeList({ git, config });
      
      if (result.worktrees.length === 0) {
        console.log('No active worktrees');
        return;
      }
      
      console.log('Active worktrees:');
      for (const wt of result.worktrees) {
        console.log(`  ${wt.changeId}`);
        console.log(`    Branch: ${wt.branch}`);
        console.log(`    Path: ${wt.path}`);
      }
      
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// =============================================================================
// speclife status - Show change status
// =============================================================================

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

// =============================================================================
// speclife list - List all changes
// =============================================================================

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
