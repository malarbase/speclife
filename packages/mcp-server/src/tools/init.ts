/**
 * speclife_init tool
 * 
 * Initialize a new change: create branch and scaffold proposal
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  loadConfig, 
  createGitAdapter,
  createGitHubAdapter,
  createOpenSpecAdapter, 
  initWorkflow 
} from "@speclife/core";
import { z } from "zod";

const InitArgsSchema = z.object({
  changeId: z.string().describe(
    "Unique identifier for the change (kebab-case, e.g., 'add-user-auth')"
  ),
  description: z.string().optional().describe(
    "Brief description of the change (populates proposal.md)"
  ),
  noWorktree: z.boolean().optional().describe(
    "Disable worktree creation - create branch in current directory instead (default: false)"
  ),
  skipDraftPR: z.boolean().optional().describe(
    "Skip creating a draft PR (overrides config.createDraftPR)"
  ),
});

export function registerInitTool(server: McpServer): void {
  server.tool(
    "speclife_init",
    "Initialize a new change: create worktree (default), scaffold proposal files (proposal.md, tasks.md), and create a draft PR for early visibility",
    InitArgsSchema.shape,
    async (args) => {
      try {
        const parsed = InitArgsSchema.parse(args);
        const cwd = process.cwd();
        
        // Load config and create adapters
        const config = await loadConfig(cwd);
        const git = createGitAdapter(cwd);
        const openspec = createOpenSpecAdapter({ 
          projectRoot: cwd, 
          specDir: config.specDir 
        });
        
        // Create GitHub adapter if draft PR creation is enabled
        const shouldCreateDraftPR = config.createDraftPR && !parsed.skipDraftPR;
        const github = shouldCreateDraftPR 
          ? createGitHubAdapter({
              owner: config.github.owner,
              repo: config.github.repo,
            })
          : undefined;
        
        // Run workflow
        const result = await initWorkflow(
          {
            changeId: parsed.changeId,
            description: parsed.description,
            noWorktree: parsed.noWorktree,
            skipDraftPR: parsed.skipDraftPR,
          },
          { git, openspec, config, github }
        );
        
        const lines = result.worktreePath
          ? [
              `✓ Created worktree: ${result.worktreePath}`,
              `✓ Created branch: ${result.branch}`,
              `✓ Scaffolded proposal: ${result.proposalPath}`,
              `✓ Scaffolded tasks: ${result.tasksPath}`,
            ]
          : [
              `✓ Created branch: ${result.branch}`,
              `✓ Scaffolded proposal: ${result.proposalPath}`,
              `✓ Scaffolded tasks: ${result.tasksPath}`,
            ];
        
        // Add PR info if created
        if (result.pullRequest) {
          lines.push(`✓ Created draft PR #${result.pullRequest.number}: ${result.pullRequest.url}`);
        }
        
        lines.push("");
        lines.push("Next steps:");
        
        if (result.worktreePath) {
          lines.push(`1. cd ${result.worktreePath}`);
          lines.push("2. Edit proposal.md to describe your change");
          lines.push("3. Edit tasks.md to list implementation steps");
          lines.push("4. Run speclife_implement to start AI-driven implementation");
        } else {
          lines.push("1. Edit proposal.md to describe your change");
          lines.push("2. Edit tasks.md to list implementation steps");
          lines.push("3. Run speclife_implement to start AI-driven implementation");
        }
        
        if (result.pullRequest) {
          lines.push("");
          lines.push(`Note: Draft PR is live at ${result.pullRequest.url} - team can see progress early!`);
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

