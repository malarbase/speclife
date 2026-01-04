# Delta for Core

## ADDED Requirements

### Requirement: Global Configuration
The core module SHALL support global user configuration stored in XDG-compliant locations.

#### Scenario: Config directory location
- **WHEN** determining config location
- **THEN** the system uses:
  - `$XDG_CONFIG_HOME/speclife/` if XDG_CONFIG_HOME is set
  - `~/.config/speclife/` on Unix/macOS fallback
  - `%APPDATA%/speclife/` on Windows

#### Scenario: Load global config
- **WHEN** calling `getGlobalConfig()`
- **THEN** the system returns merged config (defaults + user overrides)

#### Scenario: Save global config
- **WHEN** calling `saveGlobalConfig(config)`
- **THEN** the system writes to config file, creating directory if needed

#### Scenario: Default config values
- **WHEN** no config file exists
- **THEN** the system returns sensible defaults for all settings

#### Scenario: AI provider in global config
- **WHEN** global config includes `aiProvider` and `aiModel`
- **THEN** these values are used as defaults for all projects

#### Scenario: Project overrides global AI config
- **WHEN** project `.specliferc.yaml` specifies `aiProvider`
- **THEN** project value overrides global config

---

### Requirement: Editor Configurator Registry
The core module SHALL provide a pluggable registry for editor-specific configuration.

#### Scenario: Register editor configurator
- **WHEN** calling `EditorRegistry.register(configurator)`
- **THEN** the configurator is stored by its ID

#### Scenario: Get editor configurator
- **WHEN** calling `EditorRegistry.get('cursor')`
- **THEN** the system returns the Cursor configurator or undefined

#### Scenario: List available editors
- **WHEN** calling `EditorRegistry.getAvailable()`
- **THEN** the system returns all configurators marked as available

#### Scenario: Configure editor
- **WHEN** calling `configurator.configure(projectPath, specDir)`
- **THEN** the configurator creates editor-specific files and symlinks

---

### Requirement: Editor Configurator Interface
Each editor configurator SHALL implement a standard interface.

#### Scenario: Configurator properties
- **WHEN** accessing configurator properties
- **THEN** it exposes: `name`, `id`, `isAvailable`, `configFileName`

#### Scenario: Check if configured
- **WHEN** calling `configurator.isConfigured(projectPath)`
- **THEN** it returns true if editor is already configured for SpecLife

#### Scenario: Generate slash commands
- **WHEN** calling `configurator.generateSlashCommands(projectPath, specDir)`
- **THEN** it creates editor-specific command files

---

### Requirement: Shell Completion Generation
The core module SHALL generate shell completion scripts.

#### Scenario: Generate bash completions
- **WHEN** calling `generateCompletions('bash', commands)`
- **THEN** the system returns valid bash completion script

#### Scenario: Generate zsh completions
- **WHEN** calling `generateCompletions('zsh', commands)`
- **THEN** the system returns valid zsh completion script

#### Scenario: Generate fish completions
- **WHEN** calling `generateCompletions('fish', commands)`
- **THEN** the system returns valid fish completion script

#### Scenario: Dynamic completions
- **WHEN** completion scripts run
- **THEN** they invoke `speclife --complete <context>` for dynamic values

---

### Requirement: Task Progress Parsing
The core module SHALL parse task progress from tasks.md files.

#### Scenario: Count completed tasks
- **WHEN** calling `countTasksFromContent(content)`
- **THEN** the system returns `{ total: number, completed: number }`

#### Scenario: Task checkbox patterns
- **WHEN** parsing task content
- **THEN** the system recognizes:
  - `- [ ]` and `- [x]` (dash format)
  - `* [ ]` and `* [x]` (asterisk format)

#### Scenario: Format task status
- **WHEN** calling `formatTaskStatus(progress)`
- **THEN** the system returns human-readable string like "4/7 tasks"

---

### Requirement: Progress Bar Rendering
The core module SHALL provide progress bar rendering utilities.

#### Scenario: Render progress bar
- **WHEN** calling `createProgressBar(completed, total, width)`
- **THEN** the system returns a visual bar like `[████░░░░░░]`

#### Scenario: Zero progress
- **WHEN** rendering with 0 completed
- **THEN** the system shows empty bar `[░░░░░░░░░░]`

#### Scenario: Complete progress
- **WHEN** rendering with completed === total
- **THEN** the system shows full bar `[██████████]`


