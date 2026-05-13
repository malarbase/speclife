/**
 * Qoder editor configurator
 * AI coding assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class QoderConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Qoder',
      id: 'qoder',
      description: 'AI coding assistant',
      configDir: '.qoder',
      commandPattern: 'commands-subdir-only',
    });
  }
}
