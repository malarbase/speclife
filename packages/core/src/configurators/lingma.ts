/**
 * Lingma editor configurator
 * Alibaba Lingma AI coding assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class LingmaConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Lingma',
      id: 'lingma',
      description: "Alibaba's Lingma AI coding assistant",
      configDir: '.lingma',
      commandPattern: 'commands-subdir-only',
    });
  }
}
