/**
 * MCP Tool registration
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerInitTool } from "./init.js";
import { registerStatusTool } from "./status.js";
import { registerListTool } from "./list.js";

/**
 * Register all SpecLife tools with the MCP server
 */
export function registerTools(server: McpServer): void {
  // Phase 1: Foundation
  registerInitTool(server);
  registerStatusTool(server);
  registerListTool(server);
  
  // Phase 2: Submit and Merge
  // registerSubmitTool(server);
  // registerMergeTool(server);
  
  // Phase 3: Implement (includes internal test loop)
  // registerImplementTool(server);
}

