/**
 * GitHub Copilot editor configurator
 * GitHub's AI pair programmer
 */

import { StandardEditorConfigurator } from './standard.js';

export class GitHubCopilotConfigurator extends StandardEditorConfigurator {
  constructor() {
    super({
      name: 'GitHub Copilot',
      id: 'github-copilot',
      description: "GitHub's AI pair programmer",
      configDir: '.github',
      commandPattern: 'prompts-flat',
      fileExtension: '.prompt.md',
      extraDetectionPaths: ['.github/prompts'],
    });
  }
}
