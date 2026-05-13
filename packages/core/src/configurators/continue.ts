/**
 * Continue editor configurator
 * Open-source AI coding assistant for VS Code
 */

import { StandardEditorConfigurator } from './standard.js';

export class ContinueConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Continue',
      id: 'continue',
      description: 'Open-source AI coding assistant for VS Code',
      configDir: '.continue',
      commandPattern: 'prompts-flat',
      fileExtension: '.prompt',
    });
  }
}
