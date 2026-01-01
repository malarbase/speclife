/**
 * speclife_init tool
 * 
 * Initialize a new change: create branch and scaffold proposal
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  loadConfig, 
  createGitAdapter, 
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
});

export function registerInitTool(server: McpServer): void {
  server.tool(
    "speclife_init",
    "Initialize a new change: create worktree (default) and scaffold proposal files (proposal.md, tasks.md)",
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
        
        // Run workflow
        const result = await initWorkflow(
          {
            changeId: parsed.changeId,
            description: parsed.description,
            noWorktree: parsed.noWorktree,
          },
          { git, openspec, config }
        );
        
        const lines = result.worktreePath
          ? [
              `✓ Created worktree: ${result.worktreePath}`,
              `✓ Created branch: ${result.branch}`,
              `✓ Scaffolded proposal: ${result.proposalPath}`,
              `✓ Scaffolded tasks: ${result.tasksPath}`,
              "",
              "Next steps:",
              `1. cd ${result.worktreePath}`,
              "2. Edit proposal.md to describe your change",
              "3. Edit tasks.md to list implementation steps",
              "4. Run speclife_implement to start AI-driven implementation",
            ]
          : [
              `✓ Created branch: ${result.branch}`,
              `✓ Scaffolded proposal: ${result.proposalPath}`,
              `✓ Scaffolded tasks: ${result.tasksPath}`,
              "",
              "Next steps:",
              "1. Edit proposal.md to describe your change",
              "2. Edit tasks.md to list implementation steps",
              "3. Run speclife_implement to start AI-driven implementation",
            ];
        
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

