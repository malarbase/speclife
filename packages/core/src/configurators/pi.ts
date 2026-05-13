/**
 * Pi editor configurator
 * Inflection AI's coding assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class PiConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Pi',
      id: 'pi',
      description: "Inflection AI's coding assistant",
      configDir: '.pi',
      commandPattern: 'prompts-flat',
    });
  }
}
