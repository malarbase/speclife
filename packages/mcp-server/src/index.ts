#!/usr/bin/env node
/**
 * SpecLife MCP Server
 * 
 * ⚠️ DEPRECATED: This MCP server is deprecated in favor of slash commands.
 * 
 * Use /speclife slash commands instead:
 *   - /speclife start  → replaces speclife_init
 *   - /speclife ship   → replaces speclife_submit
 *   - /speclife land   → replaces speclife_merge
 *   - /speclife release → replaces speclife_release
 *   - /openspec-apply  → replaces speclife_implement
 * 
 * The MCP server remains available for:
 *   - CI/automation scenarios
 *   - Editors without slash command support
 * 
 * See README.md for migration guide.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";

const server = new McpServer({
  name: "speclife",
  version: "0.1.0",
});

// Register all tools
registerTools(server);

// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

