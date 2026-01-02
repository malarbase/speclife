/**
 * speclife_list tool
 * 
 * List all active changes with progress, PR status, and timestamps
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  loadConfig, 
  createGitAdapter,
  createGitHubAdapter,
  createOpenSpecAdapter, 
  statusWorkflow,
  formatCompactLine,
  formatTable,
  formatSummary,
  sortItems,
  filterByStatus,
  type ChangeListItem,
  type ChangeProgress,
  type PRDisplayStatus,
  type ListOptions,
} from "@speclife/core";
import { z } from "zod";

const ListArgsSchema = z.object({
  compact: z.boolean().optional().describe(
    "Show compact single-line output per change (default: false)"
  ),
  status: z.enum(['draft', 'ready', 'merged', 'closed', 'local']).optional().describe(
    "Filter by PR status: draft, ready, merged, closed, or local"
  ),
  sort: z.enum(['activity', 'progress', 'name']).optional().describe(
    "Sort by: activity (default), progress, or name"
  ),
});

/**
 * Calculate progress from task summary
 */
function calculateProgress(completed: number, total: number): ChangeProgress {
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Get PR status for a branch
 */
async function getPRStatus(
  github: ReturnType<typeof createGitHubAdapter>,
  branch: string
): Promise<{ status: PRDisplayStatus; number?: number; url?: string }> {
  try {
    const pr = await github.getPullRequestByBranch(branch);
    if (!pr) {
      return { status: 'local' };
    }
    
    let status: PRDisplayStatus;
    if (pr.state === 'merged') {
      status = 'merged';
    } else if (pr.state === 'closed') {
      status = 'closed';
    } else if (pr.draft) {
      status = 'draft';
    } else {
      status = 'ready';
    }
    
    return { status, number: pr.number, url: pr.url };
  } catch {
    // If GitHub lookup fails, treat as local
    return { status: 'local' };
  }
}

export function registerListTool(server: McpServer): void {
  server.tool(
    "speclife_list",
    "List all active changes with progress bars, PR status, and last activity timestamps",
    ListArgsSchema.shape,
    async (args) => {
      try {
        const parsed = ListArgsSchema.parse(args);
        const options: ListOptions = {
          compact: parsed.compact,
          status: parsed.status as PRDisplayStatus | undefined,
          sort: parsed.sort,
        };
        
        const cwd = process.cwd();
        
        // Load config and create adapters
        const config = await loadConfig(cwd);
        const git = createGitAdapter(cwd);
        const openspec = createOpenSpecAdapter({ 
          projectRoot: cwd, 
          specDir: config.specDir 
        });
        
        // Create GitHub adapter for PR lookups
        let github: ReturnType<typeof createGitHubAdapter> | null = null;
        try {
          github = createGitHubAdapter(config.github.owner, config.github.repo);
        } catch {
          // GitHub not configured, will show all as "local"
        }
        
        // List changes
        const changeIds = await openspec.listChanges();
        
        if (changeIds.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No active changes. Use `speclife_init` to create one.",
            }],
          };
        }
        
        // Collect enriched data for each change
        const items: ChangeListItem[] = [];
        
        for (const changeId of changeIds) {
          const result = await statusWorkflow({ changeId }, { git, openspec });
          if (!result) continue;
          
          const { change, taskSummary, onBranch } = result;
          const branch = `spec/${changeId}`;
          
          // Get PR status
          let prInfo: { status: PRDisplayStatus; number?: number; url?: string } = { status: 'local' };
          if (github) {
            prInfo = await getPRStatus(github, branch);
          }
          
          // Get last activity (use change createdAt as fallback)
          const lastActive = change.createdAt;
          
          items.push({
            id: changeId,
            progress: calculateProgress(taskSummary.completed, taskSummary.total),
            prStatus: prInfo.status,
            prNumber: prInfo.number,
            prUrl: prInfo.url,
            lastActive,
            isCurrent: onBranch,
          });
        }
        
        // Filter and sort
        let filtered = filterByStatus(items, options.status);
        const sorted = sortItems(filtered, options.sort ?? 'activity');
        
        // Format output
        const lines: string[] = [];
        
        if (options.status) {
          lines.push(`# Changes (filtered: ${options.status})`, '');
        } else {
          lines.push('# Active Changes', '');
        }
        
        if (sorted.length === 0) {
          lines.push('No changes match the filter.');
        } else if (options.compact) {
          // Compact format
          for (const item of sorted) {
            lines.push(formatCompactLine(item));
          }
        } else {
          // Table format
          lines.push(formatTable(sorted));
        }
        
        lines.push('');
        lines.push(formatSummary(items)); // Use unfiltered items for summary
        
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
