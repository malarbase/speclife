/**
 * Cursor IDE adapter for manual implementation
 * 
 * Opens Cursor IDE in the worktree directory for manual/assisted implementation.
 */

import { execa } from 'execa';

/** Result from Cursor operations */
export interface CursorResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Human-readable message */
  message: string;
}

/** Cursor adapter interface */
export interface CursorAdapter {
  /** Check if Cursor CLI is available */
  isAvailable(): Promise<boolean>;
  
  /** Get Cursor version if available */
  getVersion(): Promise<string | null>;
  
  /** Open Cursor in the specified directory */
  open(directoryPath: string): Promise<CursorResult>;
}

/**
 * Create a Cursor adapter
 */
export function createCursorAdapter(): CursorAdapter {
  return {
    async isAvailable(): Promise<boolean> {
      try {
        await execa('cursor', ['--version']);
        return true;
      } catch {
        return false;
      }
    },
    
    async getVersion(): Promise<string | null> {
      try {
        const result = await execa('cursor', ['--version']);
        return result.stdout.trim();
      } catch {
        return null;
      }
    },
    
    async open(directoryPath: string): Promise<CursorResult> {
      try {
        // Open Cursor in the background (don't wait for it to close)
        const subprocess = execa('cursor', [directoryPath], {
          detached: true,
          stdio: 'ignore',
        });
        
        // Unref so the parent process can exit
        subprocess.unref();
        
        return {
          success: true,
          message: `Cursor opened at: ${directoryPath}`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Failed to open Cursor: ${message}`,
        };
      }
    },
  };
}

