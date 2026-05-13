/**
 * CodeBuddy editor configurator
 * AI pair programming assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class CodeBuddyConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'CodeBuddy',
      id: 'codebuddy',
      description: 'AI pair programming assistant',
      configDir: '.codebuddy',
      commandPattern: 'commands-subdir-only',
    });
  }
}
