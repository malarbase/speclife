/**
 * Editor configurator module
 * Provides registry and implementations for supported editors
 */

// Export base interface and types
export {
  EditorConfigurator,
  type ConfigureResult,
  type ConfigureOptions,
} from './base.js';

// Export registry
export { EditorRegistry } from './registry.js';

// Export implementations
export { AmazonQConfigurator } from './amazon-q.js';
export { AntigravityConfigurator } from './antigravity.js';
export { AuggieConfigurator } from './auggie.js';
export { BobConfigurator } from './bob.js';
export { ClaudeCodeConfigurator } from './claude-code.js';
export { ClineConfigurator } from './cline.js';
export { CodeBuddyConfigurator } from './codebuddy.js';
export { CodexConfigurator } from './codex.js';
export { ContinueConfigurator } from './continue.js';
export { CostrictConfigurator } from './costrict.js';
export { CrushConfigurator } from './crush.js';
export { CursorConfigurator } from './cursor.js';
export { GeminiConfigurator } from './gemini.js';
export { GitHubCopilotConfigurator } from './github-copilot.js';
export { IflowConfigurator } from './iflow.js';
export { JunieConfigurator } from './junie.js';
export { KilocodeConfigurator } from './kilocode.js';
export { KiroConfigurator } from './kiro.js';
export { LingmaConfigurator } from './lingma.js';
export { OpenCodeConfigurator } from './opencode.js';
export { PiConfigurator } from './pi.js';
export { QoderConfigurator } from './qoder.js';
export { QwenConfigurator } from './qwen.js';
export { RooCodeConfigurator } from './roocode.js';
export { VSCodeConfigurator } from './vscode.js';
export { WindsurfConfigurator } from './windsurf.js';

// Export detection utilities
export {
  detectEditors,
  sortByPreference,
  formatDetectionSummary,
  type EditorDetectionResult,
} from './detector.js';

// Auto-register default editors
import { EditorRegistry } from './registry.js';
import { AmazonQConfigurator } from './amazon-q.js';
import { AntigravityConfigurator } from './antigravity.js';
import { AuggieConfigurator } from './auggie.js';
import { BobConfigurator } from './bob.js';
import { ClaudeCodeConfigurator } from './claude-code.js';
import { ClineConfigurator } from './cline.js';
import { CodeBuddyConfigurator } from './codebuddy.js';
import { CodexConfigurator } from './codex.js';
import { ContinueConfigurator } from './continue.js';
import { CostrictConfigurator } from './costrict.js';
import { CrushConfigurator } from './crush.js';
import { CursorConfigurator } from './cursor.js';
import { GeminiConfigurator } from './gemini.js';
import { GitHubCopilotConfigurator } from './github-copilot.js';
import { IflowConfigurator } from './iflow.js';
import { JunieConfigurator } from './junie.js';
import { KilocodeConfigurator } from './kilocode.js';
import { KiroConfigurator } from './kiro.js';
import { LingmaConfigurator } from './lingma.js';
import { OpenCodeConfigurator } from './opencode.js';
import { PiConfigurator } from './pi.js';
import { QoderConfigurator } from './qoder.js';
import { QwenConfigurator } from './qwen.js';
import { RooCodeConfigurator } from './roocode.js';
import { VSCodeConfigurator } from './vscode.js';
import { WindsurfConfigurator } from './windsurf.js';

/**
 * Initialize the editor registry with default editors
 * Call this once at startup
 */
export function initializeEditorRegistry(): void {
  EditorRegistry.register(new AmazonQConfigurator());
  EditorRegistry.register(new AntigravityConfigurator());
  EditorRegistry.register(new AuggieConfigurator());
  EditorRegistry.register(new BobConfigurator());
  EditorRegistry.register(new ClaudeCodeConfigurator());
  EditorRegistry.register(new ClineConfigurator());
  EditorRegistry.register(new CodeBuddyConfigurator());
  EditorRegistry.register(new CodexConfigurator());
  EditorRegistry.register(new ContinueConfigurator());
  EditorRegistry.register(new CostrictConfigurator());
  EditorRegistry.register(new CrushConfigurator());
  EditorRegistry.register(new CursorConfigurator());
  EditorRegistry.register(new GeminiConfigurator());
  EditorRegistry.register(new GitHubCopilotConfigurator());
  EditorRegistry.register(new IflowConfigurator());
  EditorRegistry.register(new JunieConfigurator());
  EditorRegistry.register(new KilocodeConfigurator());
  EditorRegistry.register(new KiroConfigurator());
  EditorRegistry.register(new LingmaConfigurator());
  EditorRegistry.register(new OpenCodeConfigurator());
  EditorRegistry.register(new PiConfigurator());
  EditorRegistry.register(new QoderConfigurator());
  EditorRegistry.register(new QwenConfigurator());
  EditorRegistry.register(new RooCodeConfigurator());
  EditorRegistry.register(new VSCodeConfigurator());
  EditorRegistry.register(new WindsurfConfigurator());
}

// Auto-initialize on import
initializeEditorRegistry();
