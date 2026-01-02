/**
 * speclife_release tool
 * 
 * Create a release PR with AI-driven version decisions.
 * Analyzes commits since last release and suggests appropriate version bump.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  loadConfig, 
  createGitAdapter, 
  createGitHubAdapter,
  releaseWorkflow,
  bumpVersion,
} from "@speclife/core";
import { z } from "zod";

const ReleaseArgsSchema = z.object({
  version: z.string().optional().describe(
    "Explicit version to release (e.g., '0.2.0'). If not provided, version is suggested based on commit analysis."
  ),
  major: z.boolean().optional().describe(
    "Force a major version bump (e.g., 0.x.x → 1.0.0). Use for intentional breaking releases."
  ),
  minor: z.boolean().optional().describe(
    "Force a minor version bump (e.g., 0.1.x → 0.2.0)."
  ),
  patch: z.boolean().optional().describe(
    "Force a patch version bump (e.g., 0.1.0 → 0.1.1)."
  ),
  dryRun: z.boolean().optional().describe(
    "Show what would be released without making changes (default: false)"
  ),
  skipChangelog: z.boolean().optional().describe(
    "Skip changelog generation (default: false)"
  ),
});

export function registerReleaseTool(server: McpServer): void {
  server.tool(
    "speclife_release",
    "Create a release PR with version bump and changelog. Analyzes commits since last release to suggest appropriate version. Use --major for intentional breaking releases, --minor/--patch to override suggestions.",
    ReleaseArgsSchema.shape,
    async (args) => {
      try {
        const parsed = ReleaseArgsSchema.parse(args);
        const cwd = process.cwd();
        
        // Load config and create adapters
        const config = await loadConfig(cwd);
        const git = createGitAdapter(cwd);
        const github = createGitHubAdapter({
          owner: config.github.owner,
          repo: config.github.repo,
        });
        
        // Determine version from flags
        let version = parsed.version;
        let forcedBumpType: 'major' | 'minor' | 'patch' | undefined;
        
        if (!version) {
          // Check for forced bump type flags
          if (parsed.major) {
            forcedBumpType = 'major';
          } else if (parsed.minor) {
            forcedBumpType = 'minor';
          } else if (parsed.patch) {
            forcedBumpType = 'patch';
          }
          
          // If forced bump, calculate version now
          if (forcedBumpType) {
            const latestTag = await git.getLatestTag();
            const previousVersion = latestTag ? latestTag.replace(/^v/, '') : '0.0.0';
            version = bumpVersion(previousVersion, forcedBumpType);
          }
        }
        
        // Run workflow
        const result = await releaseWorkflow(
          {
            version,
            dryRun: parsed.dryRun,
            skipChangelog: parsed.skipChangelog,
          },
          { git, github, repoPath: cwd }
        );
        
        const lines: string[] = [];
        
        if (parsed.dryRun) {
          lines.push('🔍 **Dry Run** - No changes made');
          lines.push('');
        }
        
        lines.push(`## Version: ${result.previousVersion} → ${result.version}`);
        
        // Show if bump was forced or auto-detected
        if (forcedBumpType) {
          lines.push(`Bump type: **${forcedBumpType}** (forced via --${forcedBumpType})`);
        } else if (parsed.version) {
          lines.push(`Bump type: **${result.bumpType}** (explicit version provided)`);
        } else {
          lines.push(`Bump type: **${result.bumpType}** (auto-detected from commits)`);
        }
        lines.push('');
        
        // Commits summary
        lines.push(`### Commits (${result.commits.length})`);
        const breaking = result.commits.filter(c => c.isBreaking);
        const features = result.commits.filter(c => c.type === 'feat');
        const fixes = result.commits.filter(c => c.type === 'fix');
        
        if (breaking.length > 0) {
          lines.push(`- ⚠️ ${breaking.length} breaking change(s)`);
        }
        if (features.length > 0) {
          lines.push(`- ✨ ${features.length} feature(s)`);
        }
        if (fixes.length > 0) {
          lines.push(`- 🐛 ${fixes.length} fix(es)`);
        }
        lines.push('');
        
        // Commit list
        lines.push('**Changes:**');
        for (const commit of result.commits.slice(0, 10)) {
          const icon = commit.isBreaking ? '⚠️' : commit.type === 'feat' ? '✨' : commit.type === 'fix' ? '🐛' : '📝';
          lines.push(`- ${icon} ${commit.message.slice(0, 80)}${commit.message.length > 80 ? '...' : ''}`);
        }
        if (result.commits.length > 10) {
          lines.push(`- ... and ${result.commits.length - 10} more`);
        }
        lines.push('');
        
        if (!parsed.dryRun) {
          lines.push('---');
          lines.push(`✓ Created release branch: ${result.branch}`);
          lines.push(`✓ Updated package versions to ${result.version}`);
          if (result.changelog) {
            lines.push('✓ Generated changelog');
          }
          lines.push(`✓ Created PR: ${result.prUrl}`);
          lines.push('');
          lines.push('**Next steps:**');
          lines.push('1. Review and merge the release PR');
          lines.push('2. CI will automatically create git tag and GitHub release');
          lines.push('3. CI will publish packages to npm');
        } else {
          lines.push('---');
          lines.push('Run `speclife_release` without `--dry-run` to create the release PR.');
          if (parsed.version) {
            lines.push(`Using explicit version: ${parsed.version}`);
          } else if (forcedBumpType) {
            lines.push(`Forced ${forcedBumpType} bump → ${result.version}`);
          } else {
            lines.push(`Suggested version: ${result.version} (based on commit analysis)`);
          }
        }
        
        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
