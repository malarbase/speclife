/**
 * Amazon Q Developer editor configurator
 * AWS AI coding assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class AmazonQConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Amazon Q Developer',
      id: 'amazon-q',
      description: "AWS's AI coding assistant",
      configDir: '.amazonq',
      commandPattern: 'prompts-flat',
    });
  }
}
