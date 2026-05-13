/**
 * Auggie editor configurator
 * Augment Code's AI assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class AuggieConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Auggie',
      id: 'auggie',
      description: "Augment Code's AI assistant",
      configDir: '.augment',
      commandPattern: 'commands-subdir-dash',
    });
  }
}
