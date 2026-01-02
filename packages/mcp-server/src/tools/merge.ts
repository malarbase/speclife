/**
 * speclife_merge tool
 * 
 * Merge PR, sync main, cleanup worktree/branch.
 * Version bumping and releases are handled by GitHub Actions (release-please).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  loadConfig, 
  createGitAdapter, 
  createGitHubAdapter,
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
});

export function registerMergeTool(server: McpServer): void {
  server.tool(
    "speclife_merge",
    "Merge a submitted PR, sync main branch, and cleanup local branch/worktree. Version bumping and releases are handled automatically by CI.",
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
        
        // Run workflow
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
        lines.push('');
        lines.push('📦 CI will automatically handle version bump and release.');
        
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
