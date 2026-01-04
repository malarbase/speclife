/**
 * Tests for progress bar and symbol utilities
 */

import { describe, it, expect } from 'vitest';
import {
  createProgressBar,
  createProgressBarFromChange,
  getSymbol,
  defaultSymbols,
  formatStepIndicator,
  getSpinnerFrame,
  formatLoadingMessage,
} from '../../src/utils/progress.js';

describe('createProgressBar', () => {
  it('creates bar for 0%', () => {
    const bar = createProgressBar(0);
    expect(bar).toBe('[░░░░░░░░░░]');
  });
  
  it('creates bar for 100%', () => {
    const bar = createProgressBar(100);
    expect(bar).toBe('[██████████]');
  });
  
  it('creates bar for 50%', () => {
    const bar = createProgressBar(50);
    expect(bar).toBe('[█████░░░░░]');
  });
  
  it('clamps negative values to 0', () => {
    const bar = createProgressBar(-10);
    expect(bar).toBe('[░░░░░░░░░░]');
  });
  
  it('clamps values over 100 to 100', () => {
    const bar = createProgressBar(150);
    expect(bar).toBe('[██████████]');
  });
  
  it('supports custom width', () => {
    const bar = createProgressBar(50, { width: 20 });
    expect(bar).toBe('[██████████░░░░░░░░░░]');
  });
  
  it('supports custom characters', () => {
    const bar = createProgressBar(50, { filledChar: '#', emptyChar: '-' });
    expect(bar).toBe('[#####-----]');
  });
  
  it('shows percentage when requested', () => {
    const bar = createProgressBar(75, { showPercentage: true });
    expect(bar).toBe('[████████░░] 75%');
  });
  
  it('rounds percentage', () => {
    const bar = createProgressBar(33.7, { showPercentage: true });
    expect(bar).toBe('[███░░░░░░░] 34%');
  });
});

describe('createProgressBarFromChange', () => {
  it('creates bar from progress object', () => {
    const bar = createProgressBarFromChange({
      completed: 5,
      total: 10,
      percentage: 50,
    });
    expect(bar).toBe('[█████░░░░░]');
  });
  
  it('shows count when requested', () => {
    const bar = createProgressBarFromChange(
      { completed: 3, total: 10, percentage: 30 },
      { showCount: true }
    );
    expect(bar).toBe('[███░░░░░░░] 3/10');
  });
  
  it('combines percentage and count', () => {
    const bar = createProgressBarFromChange(
      { completed: 8, total: 10, percentage: 80 },
      { showPercentage: true, showCount: true }
    );
    expect(bar).toBe('[████████░░] 80% 8/10');
  });
});

describe('getSymbol', () => {
  it('returns default symbols', () => {
    expect(getSymbol('pending')).toBe('○');
    expect(getSymbol('inProgress')).toBe('◉');
    expect(getSymbol('completed')).toBe('✓');
    expect(getSymbol('error')).toBe('✗');
    expect(getSymbol('warning')).toBe('⚠');
    expect(getSymbol('info')).toBe('ℹ');
  });
  
  it('allows custom symbols', () => {
    expect(getSymbol('completed', { completed: '✔' })).toBe('✔');
    expect(getSymbol('pending', { pending: '⬜' })).toBe('⬜');
  });
  
  it('falls back to defaults for missing custom', () => {
    expect(getSymbol('error', { completed: '✔' })).toBe('✗');
  });
});

describe('defaultSymbols', () => {
  it('has all required symbols', () => {
    expect(defaultSymbols.pending).toBeDefined();
    expect(defaultSymbols.inProgress).toBeDefined();
    expect(defaultSymbols.completed).toBeDefined();
    expect(defaultSymbols.error).toBeDefined();
    expect(defaultSymbols.warning).toBeDefined();
    expect(defaultSymbols.info).toBeDefined();
  });
});

describe('formatStepIndicator', () => {
  it('formats step indicator', () => {
    expect(formatStepIndicator(1, 5)).toBe('Step 1/5:');
    expect(formatStepIndicator(3, 3)).toBe('Step 3/3:');
  });
});

describe('getSpinnerFrame', () => {
  const defaultFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  
  it('returns correct frame for index', () => {
    expect(getSpinnerFrame(0)).toBe('⠋');
    expect(getSpinnerFrame(1)).toBe('⠙');
    expect(getSpinnerFrame(5)).toBe('⠴');
  });
  
  it('wraps around for large indices', () => {
    expect(getSpinnerFrame(10)).toBe('⠋'); // 10 % 10 = 0
    expect(getSpinnerFrame(11)).toBe('⠙'); // 11 % 10 = 1
  });
  
  it('supports custom frames', () => {
    const frames = ['|', '/', '-', '\\'];
    expect(getSpinnerFrame(0, frames)).toBe('|');
    expect(getSpinnerFrame(1, frames)).toBe('/');
    expect(getSpinnerFrame(4, frames)).toBe('|'); // wraps
  });
});

describe('formatLoadingMessage', () => {
  it('adds animated dots', () => {
    const msg = formatLoadingMessage('Loading');
    // Function pads dots to 3 chars, so expect pattern like "Loading.  " or "Loading..."
    expect(msg).toMatch(/^Loading\.{1,3}\s*$/);
  });
  
  it('includes elapsed time when provided', () => {
    const msg = formatLoadingMessage('Processing', 5000);
    expect(msg).toContain('(5s)');
  });
  
  it('rounds elapsed time', () => {
    const msg = formatLoadingMessage('Working', 2500);
    expect(msg).toContain('(3s)');
  });
});

