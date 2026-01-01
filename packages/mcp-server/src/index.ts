#!/usr/bin/env node
/**
 * SpecLife MCP Server
 * 
 * Exposes spec-driven development workflows as MCP tools
 * for AI assistants (Claude Desktop, Cursor).
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

