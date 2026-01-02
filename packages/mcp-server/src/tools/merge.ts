/**
 * speclife_merge tool
 * 
 * Merge PR, sync main, cleanup worktree/branch, and auto-bump version
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  loadConfig, 
  createGitAdapter, 
  createGitHubAdapter,
  createClaudeCliAdapter,
  createOpenSpecAdapter,
  mergeWorkflow 
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
  versionBump: z.enum(['auto', 'patch', 'minor', 'major', 'none']).optional().describe(
    "Version bump type after merge. 'auto' uses AI to analyze changes and determine bump type (default). 'none' skips version bump."
  ),
  createRelease: z.boolean().optional().describe(
    "Create GitHub release after version bump (default: true when version is bumped)"
  ),
});

export function registerMergeTool(server: McpServer): void {
  server.tool(
    "speclife_merge",
    "Merge a submitted PR, sync main branch, cleanup local branch/worktree, and bump version",
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
        
        // Create optional adapters for version analysis and release notes
        const versionBump = parsed.versionBump ?? 'auto';
        const createRelease = parsed.createRelease ?? true;
        const claudeCli = versionBump === 'auto' ? createClaudeCliAdapter() : undefined;
        // OpenSpec adapter needed for both auto version bump and release notes
        const openspec = (versionBump === 'auto' || createRelease) 
          ? createOpenSpecAdapter({ projectRoot: cwd }) 
          : undefined;
        
        // Run workflow
        const result = await mergeWorkflow(
          {
            changeId: parsed.changeId,
            method: parsed.method,
            deleteBranch: parsed.deleteBranch,
            removeWorktree: parsed.removeWorktree,
            versionBump,
            createRelease,
          },
          { git, github, config, claudeCli, openspec }
        );
        
        const lines = [
          `✓ Merged PR #${result.pullRequest.number}: ${result.pullRequest.url}`,
        ];
        
        if (result.mainSynced) {
          lines.push(`✓ Synced ${config.github.baseBranch} with latest changes`);
        }
        
        // Show version analysis and bump info
        if (result.versionAnalysis) {
          lines.push('');
          lines.push(`📊 Version Analysis:`);
          lines.push(`   Bump: ${result.versionAnalysis.bump}`);
          lines.push(`   Reasoning: ${result.versionAnalysis.reasoning}`);
        }
        
        if (result.newVersion) {
          lines.push(`✓ Bumped version to v${result.newVersion}`);
          lines.push(`✓ Pushed version commit to ${config.github.baseBranch}`);
        }
        
        if (result.release) {
          lines.push(`✓ Created GitHub release: ${result.release.url}`);
        }
        
        if (result.branchDeleted) {
          lines.push(`✓ Deleted local branch spec/${parsed.changeId}`);
        }
        
        if (result.worktreeRemoved) {
          lines.push(`✓ Removed worktree at ${result.worktreePath}`);
        }
        
        lines.push('', 'Change complete! You are now on the main branch with the merged changes.');
        
        if (result.newVersion) {
          lines.push(`CI will automatically publish v${result.newVersion} to npm.`);
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

