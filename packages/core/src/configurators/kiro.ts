/**
 * Kiro editor configurator
 * AI coding assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class KiroConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Kiro',
      id: 'kiro',
      description: 'AI coding assistant',
      configDir: '.kiro',
      commandPattern: 'prompts-flat',
      fileExtension: '.prompt.md',
    });
  }
}
