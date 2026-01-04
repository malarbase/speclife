/**
 * Command definitions for completion generation
 */

import type { CommandDef } from './types.js';

/**
 * Get all speclife command definitions
 * Used to generate shell completions
 */
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
      name: 'worktree',
      subcommands: [
        {
          name: 'create',
          args: [{ name: 'change-id', completion: 'none' }],
          options: [
            { long: '--skip-bootstrap', description: 'Skip environment bootstrapping' },
          ],
        },
        {
          name: 'rm',
          args: [{ name: 'change-id', completion: 'change-id' }],
          options: [
            { long: '--force', short: '-f', description: 'Force removal' },
          ],
        },
        {
          name: 'list',
          options: [
            { long: '--json', description: 'Output as JSON' },
          ],
        },
      ],
    },
    {
      name: 'status',
      args: [{ name: 'change-id', completion: 'change-id', optional: true }],
      options: [
        { long: '--json', description: 'Output as JSON' },
      ],
    },
    {
      name: 'list',
      options: [
        { long: '--json', description: 'Output as JSON' },
        { long: '--compact', description: 'Compact output' },
        { long: '--sort', description: 'Sort order', takesValue: true, valueCompletion: 'static', staticValues: ['activity', 'progress', 'name'] },
        { long: '--status', description: 'Filter by status', takesValue: true, valueCompletion: 'static', staticValues: ['draft', 'ready', 'merged', 'closed', 'local'] },
      ],
    },
    {
      name: 'view',
      options: [
        { long: '--json', description: 'Output as JSON' },
      ],
    },
    {
      name: 'completion',
      args: [{ name: 'shell', completion: 'static', staticValues: ['bash', 'zsh', 'fish'] }],
    },
    {
      name: 'config',
      subcommands: [
        { name: 'path' },
        { name: 'list', options: [{ long: '--json', description: 'Output as JSON' }] },
        { name: 'get', args: [{ name: 'key', completion: 'config-key' }] },
        { name: 'set', args: [{ name: 'key', completion: 'config-key' }, { name: 'value', completion: 'none' }] },
        { name: 'unset', args: [{ name: 'key', completion: 'config-key' }] },
        { name: 'reset' },
        { name: 'edit' },
      ],
    },
    {
      name: 'validate',
      args: [{ name: 'change-id', completion: 'change-id', optional: true }],
      options: [
        { long: '--json', description: 'Output as JSON' },
        { long: '--strict', description: 'Fail on warnings' },
      ],
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

/**
 * Get config keys for completion
 */
export function getConfigKeys(): string[] {
  return [
    'aiProvider',
    'aiModel',
    'defaultEditor',
    'preferences.colors',
    'preferences.spinners',
    'preferences.outputFormat',
  ];
}

