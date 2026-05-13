/**
 * Cline editor configurator
 * VS Code extension for AI coding
 *
 * Uses .clinerules/workflows/ directory (not .cline/)
 */

import { StandardEditorConfigurator } from './standard.js';

export class ClineConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Cline',
      id: 'cline',
      description: 'VS Code extension for AI coding',
      configDir: '.clinerules',
      commandPattern: 'workflows-flat',
    });
  }
}
