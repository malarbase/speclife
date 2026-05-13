/**
 * Bob editor configurator
 * IBM Bob Shell AI assistant
 */

import { StandardEditorConfigurator } from './standard.js';

export class BobConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'Bob Shell',
      id: 'bob',
      description: "IBM's Bob Shell AI assistant",
      configDir: '.bob',
      commandPattern: 'commands-subdir-dash',
    });
  }
}
