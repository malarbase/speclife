/**
 * Command definitions for completion generation
 */

import type { CommandDef } from './types.js';

export function getCommandDefinitions(): CommandDef[] {
  return [
    {
      name: 'init',
      options: [
        { long: '--force', short: '-f', description: 'Overwrite existing configuration' },
        { long: '--tools', description: 'Tools to configure (comma-separated)', takesValue: true, valueCompletion: 'static', staticValues: ['cursor', 'claude-code', 'vscode', 'windsurf'] },
        { long: '--no-interactive', description: 'Run without prompts' },
        { long: '--yes', short: '-y', description: 'Accept all defaults' },
      ],
    },
    {
      name: 'completion',
      args: [{ name: 'shell', completion: 'static', staticValues: ['bash', 'zsh', 'fish'] }],
    },
    {
      name: 'update',
      options: [
        { long: '--force', short: '-f', description: 'Overwrite customizations' },
      ],
    },
    {
      name: 'version',
    },
  ];
}
