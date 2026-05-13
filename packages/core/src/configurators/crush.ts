/**
 * Crush editor configurator
 * AI coding assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class CrushConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Crush',
      id: 'crush',
      description: 'AI coding assistant',
      configDir: '.crush',
      commandPattern: 'commands-subdir-only',
    });
  }
}
