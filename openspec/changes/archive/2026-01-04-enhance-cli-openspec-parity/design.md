# Design: Enhanced CLI with OpenSpec-Inspired Features

## Context

SpecLife currently has a functional but basic CLI. OpenSpec (from Fission-AI) has evolved through 17+ releases with polished UX features. This design brings the most impactful OpenSpec features to SpecLife while maintaining our existing architecture patterns.

**Stakeholders:**
- Users of both OpenSpec and SpecLife who expect consistent UX
- CI/CD systems that need JSON output and non-interactive operation
- Contributors who benefit from better discoverability

**Constraints:**
- Must maintain backward compatibility with existing CLI commands
- Must work within monorepo structure (packages/core, packages/cli)
- Must not require new runtime dependencies beyond ora/chalk

## Goals / Non-Goals

### Goals
- Match OpenSpec's UX polish for common operations (init, view, status)
- Enable scriptable automation via `--json` and `--no-interactive`
- Support shell completions for faster command entry
- Create extensible editor configurator pattern for future editors

### Non-Goals
- Full feature parity with all 17 OpenSpec commands
- Supporting all 15+ editors OpenSpec supports (start with top 4)
- Workflow schema system (artifact dependency graphs)
- MCP server changes (this is CLI-focused)

## Decisions

### Decision 1: Global Config Location (XDG Compliance)

**Choice:** Use XDG Base Directory Specification for cross-platform support.

**Rationale:**
- OpenSpec uses this pattern successfully
- Works on macOS, Linux, and Windows
- Respects user environment preferences

**Alternatives considered:**
- Home directory dotfile (`~/.specliferc`) - Less organized, mixes with project configs
- Application support directory - macOS-specific, doesn't work well on Linux

**Implementation:**
```typescript
export function getGlobalConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) return path.join(xdgConfigHome, 'speclife');
  
  if (os.platform() === 'win32') {
    return path.join(process.env.APPDATA || os.homedir(), 'speclife');
  }
  
  return path.join(os.homedir(), '.config', 'speclife');
}
```

### Decision 2: Editor Configurator Registry Pattern

**Choice:** Use registry pattern with abstract base class.

**Rationale:**
- Mirrors OpenSpec's ToolRegistry pattern which is proven
- Makes adding new editors straightforward
- Enables runtime discovery of available editors

**Alternatives considered:**
- Switch statement in init - Doesn't scale, hard to extend
- Config-driven approach - Requires complex template language

**Implementation:**
```typescript
export abstract class EditorConfigurator {
  abstract readonly name: string;
  abstract readonly id: string;
  abstract readonly isAvailable: boolean;
  
  abstract configure(projectPath: string, specDir: string): Promise<void>;
  abstract isConfigured(projectPath: string): Promise<boolean>;
}

export class EditorRegistry {
  private static editors = new Map<string, EditorConfigurator>();
  
  static register(editor: EditorConfigurator): void {
    this.editors.set(editor.id, editor);
  }
  
  static get(id: string): EditorConfigurator | undefined {
    return this.editors.get(id);
  }
  
  static getAvailable(): EditorConfigurator[] {
    return Array.from(this.editors.values()).filter(e => e.isAvailable);
  }
}
```

### Decision 3: Shell Completion Strategy

**Choice:** Generate static completion scripts that call back to CLI for dynamic values.

**Rationale:**
- Static scripts are fast and don't require speclife to be installed globally
- Callback pattern (`speclife --complete <context>`) enables dynamic completion
- Matches how modern CLI tools (gh, kubectl) handle completions

**Alternatives considered:**
- Fully dynamic completions - Slow startup, requires global install
- Only static completions - Can't complete change IDs dynamically

**Implementation:**
```bash
# In generated bash completion
_speclife_complete_change_id() {
  COMPREPLY=($(speclife --complete change-id 2>/dev/null))
}
```

### Decision 4: Non-Interactive Implementation

**Choice:** Dynamic import of @inquirer/prompts to avoid event listener issues in CI.

**Rationale:**
- OpenSpec discovered that static imports of inquirer cause pre-commit hooks to hang
- Dynamic imports only load inquirer when actually prompting
- Matches OpenSpec's fix in v0.17.1

**Alternatives considered:**
- Always check stdin.isTTY - Doesn't prevent event listener registration
- Separate CLI binaries - Unnecessary complexity

**Implementation:**
```typescript
async function promptForTools(): Promise<string[]> {
  // Dynamic import avoids registering stdin listeners until needed
  const { select } = await import('@inquirer/prompts');
  return select({...});
}
```

### Decision 5: View Command Layout

**Choice:** Dashboard-style view similar to OpenSpec's `view` command.

**Rationale:**
- Single-glance overview is more useful than multiple commands
- Progress bars provide instant feedback on change status
- Grouping by state (draft/active/ready) matches mental model

**Layout:**
```
╔══════════════════════════════════════════════════════════════╗
║                    SpecLife Dashboard                         ║
╠══════════════════════════════════════════════════════════════╣
║ Summary:                                                      ║
║   ● Worktrees: 3 active                                       ║
║   ● Changes: 2 in progress, 1 ready to land                   ║
╠══════════════════════════════════════════════════════════════╣
║ Draft Changes                                                 ║
║   ○ plan-refactor                                             ║
╠──────────────────────────────────────────────────────────────╣
║ Active Changes                                                ║
║   ◉ add-feature          [████░░░░░░] 40%  PR #42 pending     ║
║   ◉ fix-bug              [██████░░░░] 60%  PR #43 approved    ║
╠──────────────────────────────────────────────────────────────╣
║ Ready to Land                                                 ║
║   ✓ improve-tests        [██████████] 100% PR #44 approved    ║
╚══════════════════════════════════════════════════════════════╝
```

## Risks / Trade-offs

### Risk: Dependency on ora/chalk
**Risk:** Adding ora and chalk increases bundle size.
**Mitigation:** Both are well-maintained, widely used, and small. Tree-shaking removes unused code.

### Risk: Shell completion maintenance
**Risk:** Completion scripts may become outdated when commands change.
**Mitigation:** Generate completions from command definitions at build time, ensuring sync.

### Risk: Breaking changes in init
**Risk:** Enhanced init might confuse users expecting old behavior.
**Mitigation:** Keep non-interactive path identical to current behavior; enhancements only in interactive mode.

### Trade-off: Editor support breadth vs. depth
**Choice:** Start with 4 editors (Cursor, Claude Code, VS Code, Windsurf) rather than 15+.
**Rationale:** Better to do 4 well than 15 poorly. Registry pattern makes adding more easy.

## Migration Plan

1. **v0.3.0:** Add new commands (view, completion, config, validate, update) - no breaking changes
2. **v0.3.1:** Enhance init with wizard - backward compatible via `--no-interactive`
3. **v0.3.2:** Add JSON output to status/list - additive change
4. Future: Add more editors as community requests

## Resolved Questions

### 1. Should global config include AI provider preferences?

**Decision:** Yes, include `aiProvider` and `aiModel` in global config.

**Rationale:**
- Users typically use the same AI provider across all projects
- Follows git's familiar global/local config precedence model
- Reduces repetitive project setup
- API keys stay secure in env vars (never in config files)

```yaml
# ~/.config/speclife/config.yaml (global)
aiProvider: claude
aiModel: claude-sonnet-4-20250514

# .specliferc.yaml (project) - overrides global
aiProvider: openai  # This project uses OpenAI
```

### 2. Should completion scripts be part of `speclife init` output?

**Decision:** Keep `speclife completion <shell>` as separate command, print installation hint after init.

**Rationale:**
- Init already does a lot; adding shell config is scope creep
- Installation varies by shell and system (`.bashrc` vs `.zshrc` vs `.config/fish/`)
- Matches established CLI patterns (kubectl, gh, docker)
- Users who want it get clear instructions

```
✅ SpecLife configured!

Tip: Enable tab completion with:
  bash:  speclife completion bash >> ~/.bashrc
  zsh:   speclife completion zsh >> ~/.zshrc
  fish:  speclife completion fish > ~/.config/fish/completions/speclife.fish
```

### 3. How to handle editor detection vs. explicit selection?

**Decision:** Hybrid approach—auto-detect installed editors, pre-select them, let user confirm.

**Rationale:**
- Zero-friction for common case (user has Cursor, we detect it, they confirm)
- Still gives control (user can deselect unwanted editors)
- Handles edge cases (user has VS Code installed but uses Cursor)
- Mirrors OpenSpec's proven wizard pattern

```
Step 2/3: Select editors

  Detected editors are pre-selected. Press Space to toggle.

  › ◉ Cursor (detected)
    ◉ Claude Code (detected)
    ○ VS Code
    ○ Windsurf
```

