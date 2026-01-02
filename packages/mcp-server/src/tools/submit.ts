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
  skipValidation: z.boolean().optional().describe(
    "Skip spec validation before submitting (default: false)"
  ),
  strict: z.boolean().optional().describe(
    "Enable strict validation mode - fail on any warnings (default: false)"
  ),
});

export function registerSubmitTool(server: McpServer): void {
  server.tool(
    "speclife_submit",
    "[DEPRECATED: Use /speclife ship slash command instead] Submit a change: validate spec, commit all changes, push to remote, create GitHub PR, and archive the change",
    SubmitArgsSchema.shape,
    async (args) => {
      try {
        const parsed = SubmitArgsSchema.parse(args);
        const cwd = process.cwd();
        
        // Load config and create adapters
        const config = await loadConfig(cwd);
        const git = createGitAdapter(cwd);
        const github = createGitHubAdapter(config.github.owner, config.github.repo);
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
            skipValidation: parsed.skipValidation,
            strict: parsed.strict,
          },
          { git, github, openspec, config }
        );
        
        const lines: string[] = [];
        
        // Show validation results if validation was run
        if (result.validation) {
          const statusEmoji = result.validation.status === 'pass' ? '✅' : 
                              result.validation.status === 'pass_with_warnings' ? '⚠️' : '❌';
          lines.push(`${statusEmoji} Spec Validation: ${result.validation.status.replace(/_/g, ' ').toUpperCase()}`);
          
          if (result.validation.errors.length > 0) {
            for (const error of result.validation.errors) {
              lines.push(`  ❌ ${error}`);
            }
          }
          
          if (result.validation.warnings.length > 0) {
            for (const warning of result.validation.warnings) {
              lines.push(`  ⚠️ ${warning}`);
            }
          }
          
          lines.push('');
        }
        
        lines.push(
          `✓ Committed: ${result.commitSha.slice(0, 7)}`,
          `✓ Pushed to: origin/${result.branch}`,
        );
        
        if (result.prCreated) {
          lines.push(`✓ Created PR #${result.pullRequest.number}: ${result.pullRequest.url}`);
        } else if (result.prMarkedReady) {
          lines.push(`✓ Marked PR #${result.pullRequest.number} ready for review: ${result.pullRequest.url}`);
        } else {
          lines.push(`✓ PR #${result.pullRequest.number} already exists: ${result.pullRequest.url}`);
        }
        
        if (result.archived) {
          lines.push(`✓ Archived change to openspec/changes/archive/`);
        }
        
        if (result.pullRequest.draft) {
          lines.push('', 'Note: PR is still a draft. Mark ready for review when complete.');
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
