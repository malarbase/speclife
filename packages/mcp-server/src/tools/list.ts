/**
 * speclife_list tool
 * 
 * List all active changes in the project
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  loadConfig, 
  createGitAdapter,
  createOpenSpecAdapter, 
  statusWorkflow 
} from "@speclife/core";
import { z } from "zod";

const ListArgsSchema = z.object({});

export function registerListTool(server: McpServer): void {
  server.tool(
    "speclife_list",
    "List all active changes in the project",
    ListArgsSchema.shape,
    async () => {
      try {
        const cwd = process.cwd();
        
        // Load config and create adapters
        const config = await loadConfig(cwd);
        const git = createGitAdapter(cwd);
        const openspec = createOpenSpecAdapter({ 
          projectRoot: cwd, 
          specDir: config.specDir 
        });
        
        // List changes
        const changeIds = await openspec.listChanges();
        
        if (changeIds.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No active changes. Use speclife_init to create one.",
            }],
          };
        }
        
        // Get status for each change
        const lines = ["# Active Changes", ""];
        
        for (const changeId of changeIds) {
          const result = await statusWorkflow({ changeId }, { git, openspec });
          if (result) {
            const { change, taskSummary, onBranch } = result;
            const branchIndicator = onBranch ? " ← current" : "";
            lines.push(
              `- **${changeId}**${branchIndicator}`,
              `  State: ${change.state} | Tasks: ${taskSummary.completed}/${taskSummary.total}`,
              ""
            );
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

