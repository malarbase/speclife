/**
 * speclife_submit tool
 * 
 * Commit, push, create PR, and archive a change
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  loadConfig, 
  createGitAdapter, 
  createGitHubAdapter,
  createOpenSpecAdapter, 
  submitWorkflow 
} from "@speclife/core";
import { z } from "zod";

const SubmitArgsSchema = z.object({
  changeId: z.string().describe(
    "Change ID to submit (e.g., 'add-user-auth')"
  ),
  draft: z.boolean().optional().describe(
    "Create PR as draft (default: false)"
  ),
  commitMessage: z.string().optional().describe(
    "Custom commit message (defaults to proposal-based message)"
  ),
});

export function registerSubmitTool(server: McpServer): void {
  server.tool(
    "speclife_submit",
    "Submit a change: commit all changes, push to remote, create GitHub PR, and archive the change",
    SubmitArgsSchema.shape,
    async (args) => {
      try {
        const parsed = SubmitArgsSchema.parse(args);
        const cwd = process.cwd();
        
        // Load config and create adapters
        const config = await loadConfig(cwd);
        const git = createGitAdapter(cwd);
        const github = createGitHubAdapter({
          owner: config.github.owner,
          repo: config.github.repo,
        });
        const openspec = createOpenSpecAdapter({ 
          projectRoot: cwd, 
          specDir: config.specDir 
        });
        
        // Run workflow
        const result = await submitWorkflow(
          {
            changeId: parsed.changeId,
            draft: parsed.draft,
            commitMessage: parsed.commitMessage,
          },
          { git, github, openspec, config }
        );
        
        const lines = [
          `✓ Committed: ${result.commitSha.slice(0, 7)}`,
          `✓ Pushed to: origin/${result.branch}`,
          result.prCreated 
            ? `✓ Created PR #${result.pullRequest.number}: ${result.pullRequest.url}`
            : `✓ PR #${result.pullRequest.number} already exists: ${result.pullRequest.url}`,
        ];
        
        if (result.archived) {
          lines.push(`✓ Archived change to openspec/changes/archive/`);
        }
        
        if (result.pullRequest.draft) {
          lines.push('', 'Note: PR created as draft. Mark ready for review when complete.');
        }
        
        lines.push('', 'Next steps:', '1. Review the PR on GitHub', '2. Once approved, run speclife_merge to complete');
        
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

