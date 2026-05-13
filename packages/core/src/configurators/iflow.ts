/**
 * iFlow editor configurator
 * AI workflow coding assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class IflowConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'iFlow',
      id: 'iflow',
      description: 'AI workflow coding assistant',
      configDir: '.iflow',
      commandPattern: 'commands-subdir-dash',
    });
  }
}
