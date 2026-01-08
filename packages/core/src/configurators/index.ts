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
export { CursorConfigurator } from './cursor.js';
export { ClaudeCodeConfigurator } from './claude-code.js';
export { VSCodeConfigurator } from './vscode.js';
export { WindsurfConfigurator } from './windsurf.js';
export { QwenConfigurator } from './qwen.js';
export { GeminiConfigurator } from './gemini.js';
export { AntigravityConfigurator } from './antigravity.js';

// Export detection utilities
export {
  detectEditors,
  sortByPreference,
  formatDetectionSummary,
  type EditorDetectionResult,
} from './detector.js';

// Auto-register default editors
import { EditorRegistry } from './registry.js';
import { CursorConfigurator } from './cursor.js';
import { ClaudeCodeConfigurator } from './claude-code.js';
import { VSCodeConfigurator } from './vscode.js';
import { WindsurfConfigurator } from './windsurf.js';
import { QwenConfigurator } from './qwen.js';
import { GeminiConfigurator } from './gemini.js';
import { AntigravityConfigurator } from './antigravity.js';

/**
 * Initialize the editor registry with default editors
 * Call this once at startup
 */
export function initializeEditorRegistry(): void {
  EditorRegistry.register(new CursorConfigurator());
  EditorRegistry.register(new ClaudeCodeConfigurator());
  EditorRegistry.register(new VSCodeConfigurator());
  EditorRegistry.register(new WindsurfConfigurator());
  EditorRegistry.register(new QwenConfigurator());
  EditorRegistry.register(new GeminiConfigurator());
  EditorRegistry.register(new AntigravityConfigurator());
}

// Auto-initialize on import
initializeEditorRegistry();

