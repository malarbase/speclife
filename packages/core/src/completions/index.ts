/**
 * Shell completion system
 * Generates completion scripts for bash, zsh, and fish
 */

export type { Shell, CompletionType, CommandDef, OptionDef, ArgDef, CompletionGenerator } from './types.js';

export { getCommandDefinitions, getConfigKeys } from './commands.js';
export { BashGenerator } from './bash-generator.js';
export { ZshGenerator } from './zsh-generator.js';
export { FishGenerator } from './fish-generator.js';

import type { Shell, CompletionGenerator } from './types.js';
import { BashGenerator } from './bash-generator.js';
import { ZshGenerator } from './zsh-generator.js';
import { FishGenerator } from './fish-generator.js';
import { getCommandDefinitions } from './commands.js';

/** Map of shells to their generators */
const generators: Record<Shell, CompletionGenerator> = {
  bash: new BashGenerator(),
  zsh: new ZshGenerator(),
  fish: new FishGenerator(),
};

/**
 * Get a completion generator for a shell
 * @param shell Target shell
 * @returns Completion generator
 */
export function getGenerator(shell: Shell): CompletionGenerator {
  return generators[shell];
}

/**
 * Generate completion script for a shell
 * @param shell Target shell
 * @returns Shell script for completions
 */
export function generateCompletions(shell: Shell): string {
  const generator = getGenerator(shell);
  const commands = getCommandDefinitions();
  return generator.generate(commands);
}

/**
 * Get installation instructions for a shell
 * @param shell Target shell
 * @returns Human-readable installation instructions
 */
export function getInstallInstructions(shell: Shell): string {
  return getGenerator(shell).getInstallInstructions();
}

/**
 * Get list of supported shells
 * @returns Array of shell names
 */
export function getSupportedShells(): Shell[] {
  return ['bash', 'zsh', 'fish'];
}

