# @speclife/mcp-server

> ⚠️ **DEPRECATED**: This MCP server is deprecated in favor of slash commands.
> See [Migration Guide](#migration-guide) below.

MCP server for SpecLife - provides spec-driven development tools for AI assistants.

## Migration Guide

Replace MCP tool calls with slash commands:

| MCP Tool | Slash Command | Notes |
|----------|---------------|-------|
| `speclife_init` | `/speclife start` | Creates worktree + branch |
| `speclife_submit` | `/speclife ship` | Commit, push, create PR |
| `speclife_merge` | `/speclife land` | Merge PR, cleanup, release |
| `speclife_release` | `/speclife release` | Manual release |
| `speclife_implement` | `/openspec-apply` | Use OpenSpec for implementation |
| `speclife_status` | `speclife status` | CLI command |
| `speclife_list` | `speclife worktree list` | CLI command |

### Why Migrate?

1. **No token configuration**: Slash commands use your editor's @github MCP
2. **Better integration**: Works with OpenSpec's existing commands
3. **Simpler setup**: No `GITHUB_TOKEN` or `ANTHROPIC_API_KEY` needed

### Setup Slash Commands

```bash
# Install CLI
npm install -g @speclife/cli

# Initialize project (creates slash commands)
speclife init

# Run AI-guided setup
/speclife setup
```

## Continued Support

The MCP server remains available for:
- CI/automation scenarios
- Editors without slash command support
- Gradual migration

No breaking changes are planned. The server will continue to work as-is.

## Installation

```bash
npm install -g @speclife/mcp-server
```

## Configuration

Add to your MCP configuration:

### Claude Desktop

```json
{
  "mcpServers": {
    "speclife": {
      "command": "speclife-mcp",
      "env": {
        "GITHUB_TOKEN": "ghp_xxxx"
      }
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "speclife": {
      "command": "speclife-mcp",
      "env": {
        "GITHUB_TOKEN": "ghp_xxxx"
      }
    }
  }
}
```

## Available Tools

All tools are deprecated. Use slash commands instead.

| Tool | Description | Replacement |
|------|-------------|-------------|
| `speclife_init` | Create worktree and scaffold proposal | `/speclife start` |
| `speclife_status` | Show change state and progress | `speclife status` |
| `speclife_list` | List all active changes | `speclife worktree list` |
| `speclife_submit` | Commit, push, create PR | `/speclife ship` |
| `speclife_merge` | Merge PR and cleanup | `/speclife land` |
| `speclife_implement` | AI-driven implementation | `/openspec-apply` |
| `speclife_release` | Create release PR | `/speclife release` |

## License

MIT

