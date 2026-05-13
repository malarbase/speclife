/**
 * Factory Droid editor configurator
 * Factory's AI coding assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class FactoryConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Factory Droid',
      id: 'factory',
      description: "Factory's AI coding assistant",
      configDir: '.factory',
      commandPattern: 'commands-subdir-dash',
    });
  }
}
