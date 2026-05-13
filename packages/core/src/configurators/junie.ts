/**
 * Junie editor configurator
 * JetBrains AI coding assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class JunieConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Junie',
      id: 'junie',
      description: "JetBrains' AI coding assistant",
      configDir: '.junie',
      commandPattern: 'commands-subdir-dash',
    });
  }
}
