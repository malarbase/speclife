/**
 * RooCode editor configurator
 * AI-powered VS Code extension
 */

import { StandardEditorConfigurator } from './standard.js';

export class RooCodeConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'RooCode',
      id: 'roocode',
      description: 'AI-powered VS Code extension for autonomous coding',
      configDir: '.roo',
      commandPattern: 'commands-subdir-dash',
    });
  }
}
