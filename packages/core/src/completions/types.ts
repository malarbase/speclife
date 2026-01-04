/**
 * Types for shell completion system
 */

/** Supported shells for completion generation */
export type Shell = 'bash' | 'zsh' | 'fish';

/** Completion type for a command argument */
export type CompletionType = 
  | 'none'           // No completion
  | 'file'           // File path completion
  | 'directory'      // Directory path completion
  | 'change-id'      // Change ID completion (dynamic)
  | 'shell'          // Shell name (bash, zsh, fish)
  | 'editor'         // Editor ID completion
  | 'config-key'     // Config key completion
  | 'static';        // Static list of values

/** Definition of a completable command */
export interface CommandDef {
  /** Command name (e.g., "status", "worktree create") */
  name: string;
  /** Subcommands if any */
  subcommands?: CommandDef[];
  /** Options/flags */
  options?: OptionDef[];
  /** Positional arguments */
  args?: ArgDef[];
}

/** Definition of a command option */
export interface OptionDef {
  /** Short flag (e.g., "-f") */
  short?: string;
  /** Long flag (e.g., "--force") */
  long: string;
  /** Description for help */
  description: string;
  /** Whether this option takes a value */
  takesValue?: boolean;
  /** Completion type for the value */
  valueCompletion?: CompletionType;
  /** Static values if valueCompletion is 'static' */
  staticValues?: string[];
}

/** Definition of a positional argument */
export interface ArgDef {
  /** Argument name for help */
  name: string;
  /** Completion type */
  completion: CompletionType;
  /** Static values if completion is 'static' */
  staticValues?: string[];
  /** Whether this argument is optional */
  optional?: boolean;
}

/** Interface for shell completion generators */
export interface CompletionGenerator {
  /** Shell this generator targets */
  readonly shell: Shell;
  
  /**
   * Generate the completion script
   * @param commands Command definitions
   * @returns Shell script for completions
   */
  generate(commands: CommandDef[]): string;
  
  /**
   * Get installation instructions
   * @returns Human-readable installation instructions
   */
  getInstallInstructions(): string;
}

