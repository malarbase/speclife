/**
 * Shell completion system
 */

export type { Shell, CompletionType, CommandDef, OptionDef, ArgDef, CompletionGenerator } from './types.js';

export { getCommandDefinitions } from './commands.js';
export { BashGenerator } from './bash-generator.js';
export { ZshGenerator } from './zsh-generator.js';
export { FishGenerator } from './fish-generator.js';

import type { Shell, CompletionGenerator } from './types.js';
import { BashGenerator } from './bash-generator.js';
import { ZshGenerator } from './zsh-generator.js';
import { FishGenerator } from './fish-generator.js';
import { getCommandDefinitions } from './commands.js';

const generators: Record<Shell, CompletionGenerator> = {
  bash: new BashGenerator(),
  zsh: new ZshGenerator(),
  fish: new FishGenerator(),
};

export function getGenerator(shell: Shell): CompletionGenerator {
  return generators[shell];
}

export function generateCompletions(shell: Shell): string {
  const generator = getGenerator(shell);
  const commands = getCommandDefinitions();
  return generator.generate(commands);
}

export function getInstallInstructions(shell: Shell): string {
  return getGenerator(shell).getInstallInstructions();
}

export function getSupportedShells(): Shell[] {
  return ['bash', 'zsh', 'fish'];
}
