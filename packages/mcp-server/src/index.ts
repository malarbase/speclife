#!/usr/bin/env node
/*
 * SpecLife - Git and GitHub automation for spec-driven development
 * Copyright (C) 2026 malarbase
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

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

