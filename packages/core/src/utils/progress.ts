/**
 * Progress bar utilities for CLI display
 */

import type { ChangeProgress } from '../types.js';

/** Progress bar display options */
export interface ProgressBarOptions {
  /** Width of the bar in characters (default: 10) */
  width?: number;
  /** Character for filled portion (default: █) */
  filledChar?: string;
  /** Character for empty portion (default: ░) */
  emptyChar?: string;
  /** Include percentage text (default: false) */
  showPercentage?: boolean;
  /** Include count text like "3/5" (default: false) */
  showCount?: boolean;
}

/**
 * Create a progress bar string from percentage
 * @param percentage Value from 0-100
 * @param options Display options
 * @returns Formatted progress bar string
 */
export function createProgressBar(
  percentage: number,
  options: ProgressBarOptions = {}
): string {
  const {
    width = 10,
    filledChar = '█',
    emptyChar = '░',
    showPercentage = false,
  } = options;
  
  // Clamp percentage to valid range
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  
  let bar = `[${filledChar.repeat(filled)}${emptyChar.repeat(empty)}]`;
  
  if (showPercentage) {
    bar += ` ${Math.round(clamped)}%`;
  }
  
  return bar;
}

/**
 * Create a progress bar from ChangeProgress object
 * @param progress Progress info with completed/total
 * @param options Display options
 * @returns Formatted progress bar string
 */
export function createProgressBarFromChange(
  progress: ChangeProgress,
  options: ProgressBarOptions = {}
): string {
  const { showCount = false } = options;
  
  let bar = createProgressBar(progress.percentage, options);
  
  if (showCount) {
    bar += ` ${progress.completed}/${progress.total}`;
  }
  
  return bar;
}

/** Symbol options for different states */
export interface SymbolOptions {
  /** Symbol for pending/incomplete (default: ○) */
  pending?: string;
  /** Symbol for in-progress (default: ◉) */
  inProgress?: string;
  /** Symbol for completed/success (default: ✓) */
  completed?: string;
  /** Symbol for error/failed (default: ✗) */
  error?: string;
  /** Symbol for warning (default: ⚠) */
  warning?: string;
  /** Symbol for info (default: ℹ) */
  info?: string;
}

/** Default symbols for progress display */
export const defaultSymbols: Required<SymbolOptions> = {
  pending: '○',
  inProgress: '◉',
  completed: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
};

/**
 * Get a symbol for a given state
 * @param state State name
 * @param options Custom symbols
 * @returns Symbol character
 */
export function getSymbol(
  state: keyof SymbolOptions,
  options: SymbolOptions = {}
): string {
  return options[state] ?? defaultSymbols[state];
}

/**
 * Format a step indicator for multi-step operations
 * @param current Current step (1-based)
 * @param total Total steps
 * @returns Formatted string like "Step 2/5:"
 */
export function formatStepIndicator(current: number, total: number): string {
  return `Step ${current}/${total}:`;
}

/**
 * Format a spinner frame (for use with ora or custom spinners)
 * @param frameIndex Current frame index
 * @param frames Array of frames (default: dots)
 * @returns Current frame character
 */
export function getSpinnerFrame(
  frameIndex: number,
  frames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
): string {
  return frames[frameIndex % frames.length];
}

/**
 * Create a simple text-based loading indicator
 * @param message Message to display
 * @param elapsed Elapsed time in ms
 * @returns Formatted loading string
 */
export function formatLoadingMessage(message: string, elapsed?: number): string {
  const dots = '.'.repeat((Math.floor(Date.now() / 500) % 3) + 1).padEnd(3);
  const timeStr = elapsed ? ` (${Math.round(elapsed / 1000)}s)` : '';
  return `${message}${dots}${timeStr}`;
}

