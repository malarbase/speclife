/**
 * Kilo Code editor configurator
 * Lightweight AI coding assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class KilocodeConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Kilo Code',
      id: 'kilocode',
      description: 'Lightweight AI coding assistant',
      configDir: '.kilocode',
      commandPattern: 'workflows-flat',
    });
  }
}
