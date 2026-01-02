/**
 * speclife_merge tool
 * 
 * Merge PR, sync main, cleanup worktree/branch.
 * Optionally auto-releases based on config (auto for patch/minor, manual for major).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  loadConfig, 
  createGitAdapter, 
  createGitHubAdapter,
  mergeWorkflow,
  releaseWorkflow,
  suggestVersionBump,
  parseConventionalCommit,
  isAutoReleaseAllowed,
  type VersionBumpType,
  type CommitInfo,
} from "@speclife/core";
import { z } from "zod";

const MergeArgsSchema = z.object({
  changeId: z.string().describe(
    "Change ID to merge (e.g., 'add-user-auth')"
  ),
  method: z.enum(['squash', 'merge', 'rebase']).optional().describe(
    "Merge method: 'squash' (default), 'merge', or 'rebase'"
  ),
  deleteBranch: z.boolean().optional().describe(
    "Delete local branch after merge (default: true)"
  ),
  removeWorktree: z.boolean().optional().describe(
    "Remove worktree after merge if applicable (default: true)"
  ),
  skipRelease: z.boolean().optional().describe(
    "Skip auto-release even if enabled in config (default: false)"
  ),
});

export function registerMergeTool(server: McpServer): void {
  server.tool(
    "speclife_merge",
    "Merge a submitted PR, sync main branch, and cleanup local branch/worktree. Auto-creates release PR for patch/minor bumps (configurable).",
    MergeArgsSchema.shape,
    async (args) => {
      try {
        const parsed = MergeArgsSchema.parse(args);
        const cwd = process.cwd();
        
        // Load config and create adapters
        const config = await loadConfig(cwd);
        const git = createGitAdapter(cwd);
        const github = createGitHubAdapter({
          owner: config.github.owner,
          repo: config.github.repo,
        });
        
        // Run merge workflow
        const result = await mergeWorkflow(
          {
            changeId: parsed.changeId,
            method: parsed.method,
            deleteBranch: parsed.deleteBranch,
            removeWorktree: parsed.removeWorktree,
          },
          { git, github, config }
        );
        
        const lines = [
          `✓ Merged PR #${result.pullRequest.number}: ${result.pullRequest.url}`,
        ];
        
        if (result.mainSynced) {
          lines.push(`✓ Synced ${config.github.baseBranch} with latest changes`);
        }
        
        if (result.branchDeleted) {
          lines.push(`✓ Deleted local branch spec/${parsed.changeId}`);
        }
        
        if (result.worktreeRemoved) {
          lines.push(`✓ Removed worktree at ${result.worktreePath}`);
        }
        
        lines.push('');
        lines.push('Change complete! You are now on the main branch with the merged changes.');
        
        // Auto-release analysis (if not skipped)
        if (!parsed.skipRelease) {
          lines.push('');
          lines.push('---');
          lines.push('');
          
          try {
            // Create git adapter for main repo
            const mainRepoPath = result.repoPath || cwd;
            const mainGit = createGitAdapter(mainRepoPath);
            
            // Get latest tag and commits
            const latestTag = await mainGit.getLatestTag();
            const previousVersion = latestTag ? latestTag.replace(/^v/, '') : '0.0.0';
            
            const rawCommits = latestTag 
              ? await mainGit.getCommitsSince(latestTag)
              : await mainGit.getCommitsSince('HEAD~10');
            
            if (rawCommits.length > 0) {
              // Parse commits
              const commits: CommitInfo[] = rawCommits.map(({ sha, message }) => {
                const parsed = parseConventionalCommit(message);
                return {
                  sha,
                  message,
                  type: parsed.type,
                  scope: parsed.scope,
                  isBreaking: parsed.isBreaking,
                };
              });
              
              // Determine bump type
              const bumpType = suggestVersionBump(commits, previousVersion);
              
              // Check if auto-release is allowed
              const autoReleaseAllowed = isAutoReleaseAllowed(config, bumpType);
              
              lines.push(`📊 **Release Analysis**`);
              lines.push(`   Commits since ${latestTag || 'start'}: ${commits.length}`);
              lines.push(`   Suggested bump: **${bumpType}** (${previousVersion} → next)`);
              lines.push('');
              
              if (autoReleaseAllowed) {
                // Auto-release!
                lines.push(`✨ Auto-release enabled for ${bumpType} bumps. Creating release PR...`);
                lines.push('');
                
                const releaseResult = await releaseWorkflow(
                  { dryRun: false },
                  { git: mainGit, github, repoPath: mainRepoPath }
                );
                
                lines.push(`✓ Created release PR: ${releaseResult.prUrl}`);
                lines.push(`   Version: ${releaseResult.previousVersion} → ${releaseResult.version}`);
                lines.push('');
                lines.push('**Next:** Review and merge the release PR to publish.');
              } else {
                // Manual release required (major bump)
                lines.push(`⚠️ **Manual release required** (${bumpType} bump)`);
                lines.push('');
                if (bumpType === 'major') {
                  lines.push('Major releases require explicit confirmation. Run:');
                  lines.push('```');
                  lines.push('speclife_release --major');
                  lines.push('```');
                } else {
                  lines.push(`Auto-release disabled for ${bumpType} in config. Run:`);
                  lines.push('```');
                  lines.push('speclife_release');
                  lines.push('```');
                }
              }
            } else {
              lines.push('💡 No commits since last release. Run `speclife_release` when ready.');
            }
          } catch (releaseError) {
            // Release analysis/creation failed - not critical
            lines.push('💡 Ready to release? Run `speclife_release` to create a release PR.');
          }
        } else {
          lines.push('');
          lines.push('💡 Ready to release? Run `speclife_release` to create a release PR.');
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
