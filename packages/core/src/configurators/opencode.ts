/**
 * OpenCode editor configurator
 * Open-source AI coding assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class OpenCodeConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'OpenCode',
      id: 'opencode',
      description: 'Open-source AI coding assistant',
      configDir: '.opencode',
      commandPattern: 'commands-subdir-dash',
    });
  }
}
