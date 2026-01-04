/**
 * Editor configurator registry
 * Manages available editor configurators and provides discovery
 */

import type { EditorConfigurator } from './base.js';

/**
 * Registry for editor configurators
 * Use this to register new editors or discover available ones
 */
export class EditorRegistry {
  private static editors = new Map<string, EditorConfigurator>();
  
  /**
   * Register an editor configurator
   * @param editor Configurator instance to register
   */
  static register(editor: EditorConfigurator): void {
    this.editors.set(editor.id, editor);
  }
  
  /**
   * Unregister an editor configurator
   * @param id Editor ID to unregister
   */
  static unregister(id: string): void {
    this.editors.delete(id);
  }
  
  /**
   * Get a configurator by ID
   * @param id Editor ID
   * @returns Configurator or undefined
   */
  static get(id: string): EditorConfigurator | undefined {
    return this.editors.get(id);
  }
  
  /**
   * Get all registered configurators
   * @returns Array of all configurators
   */
  static getAll(): EditorConfigurator[] {
    return Array.from(this.editors.values());
  }
  
  /**
   * Get all editor IDs
   * @returns Array of editor IDs
   */
  static getIds(): string[] {
    return Array.from(this.editors.keys());
  }
  
  /**
   * Get configurators that are available on the system
   * @param projectPath Project path to check
   * @returns Array of available configurators
   */
  static async getAvailable(projectPath: string): Promise<EditorConfigurator[]> {
    const available: EditorConfigurator[] = [];
    
    for (const editor of this.editors.values()) {
      if (await editor.isAvailable(projectPath)) {
        available.push(editor);
      }
    }
    
    return available;
  }
  
  /**
   * Get configurators that are already configured
   * @param projectPath Project path to check
   * @returns Array of configured editors
   */
  static async getConfigured(projectPath: string): Promise<EditorConfigurator[]> {
    const configured: EditorConfigurator[] = [];
    
    for (const editor of this.editors.values()) {
      if (await editor.isConfigured(projectPath)) {
        configured.push(editor);
      }
    }
    
    return configured;
  }
  
  /**
   * Clear all registered editors (useful for testing)
   */
  static clear(): void {
    this.editors.clear();
  }
}

