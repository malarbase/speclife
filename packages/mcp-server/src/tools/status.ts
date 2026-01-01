/**
 * speclife_status tool
 * 
 * Show current change state and progress
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  loadConfig, 
  createGitAdapter, 
  createOpenSpecAdapter, 
  statusWorkflow 
} from "@speclife/core";
import { z } from "zod";

const StatusArgsSchema = z.object({
  changeId: z.string().optional().describe(
    "Change ID to get status for (uses current branch if not provided)"
  ),
});

export function registerStatusTool(server: McpServer): void {
  server.tool(
    "speclife_status",
    "Show the current state and progress of a change",
    StatusArgsSchema.shape,
    async (args) => {
      try {
        const parsed = StatusArgsSchema.parse(args);
        const cwd = process.cwd();
        
        // Load config and create adapters
        const config = await loadConfig(cwd);
        const git = createGitAdapter(cwd);
        const openspec = createOpenSpecAdapter({ 
          projectRoot: cwd, 
          specDir: config.specDir 
        });
        
        // Run workflow
        const result = await statusWorkflow(
          { changeId: parsed.changeId },
          { git, openspec }
        );
        
        if (!result) {
          return {
            content: [{
              type: "text",
              text: parsed.changeId 
                ? `Change '${parsed.changeId}' not found`
                : "No active change on current branch. Use speclife_init to create one.",
            }],
          };
        }
        
        const { change, currentBranch, onBranch, taskSummary } = result;
        
        const lines = [
          `# Change: ${change.id}`,
          "",
          `**State:** ${change.state}`,
          `**Branch:** ${change.branch}${onBranch ? " (current)" : ""}`,
          `**Tasks:** ${taskSummary.completed}/${taskSummary.total} (${taskSummary.percentage}%)`,
          "",
          "## Proposal Summary",
          change.proposal.why.slice(0, 200) + (change.proposal.why.length > 200 ? "..." : ""),
          "",
          "## Tasks",
        ];
        
        for (const task of change.tasks) {
          const checkbox = task.completed ? "☑" : "☐";
          lines.push(`${checkbox} ${task.id} ${task.content}`);
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

