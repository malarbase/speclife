/**
 * speclife_implement tool
 * 
 * AI-driven code implementation with multiple modes:
 * - claude-cli: Uses Claude CLI with MCP servers (primary)
 * - claude-sdk: Direct Anthropic SDK with tool-use (fully automated)
 * - cursor: Opens Cursor IDE for manual implementation
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  loadConfig, 
  createOpenSpecAdapter, 
  implementWorkflow,
  type ImplementMode,
} from "@speclife/core";
import { z } from "zod";

const ImplementArgsSchema = z.object({
  changeId: z.string().describe(
    "Change ID to implement (e.g., 'add-user-auth')"
  ),
  mode: z.enum(['claude-cli', 'claude-sdk', 'cursor']).optional().describe(
    "Implementation mode: 'claude-cli' (primary, uses MCP servers), 'claude-sdk' (fully automated), or 'cursor' (opens IDE)"
  ),
  taskId: z.string().optional().describe(
    "Specific task ID to implement (e.g., '1.2'). If not provided, implements all uncompleted tasks."
  ),
  dryRun: z.boolean().optional().describe(
    "Return the planned prompt/actions without executing (default: false)"
  ),
});

export function registerImplementTool(server: McpServer): void {
  server.tool(
    "speclife_implement",
    "Implement a change using AI. Supports multiple modes: 'claude-cli' (primary - uses Claude CLI with MCP servers), 'claude-sdk' (fully automated with tool-use), or 'cursor' (opens IDE for manual implementation).",
    ImplementArgsSchema.shape,
    async (args) => {
      try {
        const parsed = ImplementArgsSchema.parse(args);
        const cwd = process.cwd();
        
        // Load config and create adapters
        const config = await loadConfig(cwd);
        const openspec = createOpenSpecAdapter({ 
          projectRoot: cwd, 
          specDir: config.specDir 
        });
        
        // Collect progress messages
        const progressMessages: string[] = [];
        
        // Run workflow
        const result = await implementWorkflow(
          {
            changeId: parsed.changeId,
            mode: parsed.mode as ImplementMode | undefined,
            taskId: parsed.taskId,
            dryRun: parsed.dryRun,
          },
          { openspec, config },
          (event) => {
            progressMessages.push(event.message);
          }
        );
        
        // Format output based on result
        const lines: string[] = [];
        
        // Mode indicator
        lines.push(`Mode: ${result.mode}`);
        lines.push('');
        
        // Status
        const statusEmoji = {
          success: '✓',
          partial: '⚠',
          failed: '✗',
          manual: '📝',
        }[result.status];
        lines.push(`${statusEmoji} Status: ${result.status}`);
        lines.push('');
        
        // For dry run, show the plan
        if (parsed.dryRun && result.plan) {
          lines.push('## Planned Prompt/Actions');
          lines.push('');
          lines.push('```');
          // Truncate if very long
          const maxPlanLength = 2000;
          if (result.plan.length > maxPlanLength) {
            lines.push(result.plan.slice(0, maxPlanLength));
            lines.push(`... (truncated, ${result.plan.length - maxPlanLength} more characters)`);
          } else {
            lines.push(result.plan);
          }
          lines.push('```');
        } else {
          // Show output
          lines.push('## Output');
          lines.push('');
          if (result.output) {
            // Truncate if very long
            const maxOutputLength = 3000;
            if (result.output.length > maxOutputLength) {
              lines.push(result.output.slice(0, maxOutputLength));
              lines.push(`... (truncated, ${result.output.length - maxOutputLength} more characters)`);
            } else {
              lines.push(result.output);
            }
          }
          
          // Tasks completed
          if (result.tasksCompleted.length > 0) {
            lines.push('');
            lines.push('## Tasks Completed');
            for (const taskId of result.tasksCompleted) {
              lines.push(`- [x] ${taskId}`);
            }
          }
          
          // Tasks failed
          if (result.tasksFailed && result.tasksFailed.length > 0) {
            lines.push('');
            lines.push('## Tasks Failed');
            for (const { taskId, reason } of result.tasksFailed) {
              lines.push(`- [ ] ${taskId}: ${reason}`);
            }
          }
        }
        
        // Next steps based on mode and status
        lines.push('');
        lines.push('## Next Steps');
        if (result.mode === 'cursor') {
          lines.push('1. Implement the tasks in Cursor');
          lines.push('2. Run tests to verify changes');
          lines.push('3. Update tasks.md to mark completed tasks');
          lines.push('4. Run speclife_submit when ready');
        } else if (result.status === 'success') {
          lines.push('1. Review the changes made');
          lines.push('2. Run speclife_submit to create a PR');
        } else if (result.status === 'partial') {
          lines.push('1. Review completed tasks');
          lines.push('2. Address failed tasks manually or retry');
          lines.push('3. Run speclife_submit when all tasks are complete');
        } else if (result.status === 'failed') {
          lines.push('1. Review the error message above');
          lines.push('2. Fix any issues and retry');
          lines.push('3. Consider using a different mode if the issue persists');
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

