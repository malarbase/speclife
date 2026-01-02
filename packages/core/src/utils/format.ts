/**
 * Formatting utilities for display
 */

import type { ChangeProgress, ChangeListItem, PRDisplayStatus } from '../types.js';

/**
 * Format a progress bar using ASCII characters
 * @param progress Progress info
 * @param width Width of the bar (default 10)
 * @returns ASCII progress bar like "████████░░"
 */
export function formatProgressBar(progress: ChangeProgress, width: number = 10): string {
  const filled = Math.round((progress.percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Format a relative time string
 * @param date Date to format
 * @returns String like "2 hours ago", "3 days ago"
 */
export function formatRelativeTime(date: Date | undefined): string {
  if (!date) return 'unknown';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format PR status for display
 * @param status PR status
 * @param prNumber PR number (if exists)
 * @returns Formatted string like "PR #42 (draft)" or "local only"
 */
export function formatPRStatus(status: PRDisplayStatus, prNumber?: number): string {
  if (status === 'local') return 'local only';
  if (!prNumber) return status;
  
  const statusLabel = status === 'ready' ? 'ready' : status;
  return `PR #${prNumber} (${statusLabel})`;
}

/**
 * Format a change item as a compact single line
 * @param item Change list item
 * @returns Compact format string
 */
export function formatCompactLine(item: ChangeListItem): string {
  const name = item.id.padEnd(24);
  const bar = `[${formatProgressBar(item.progress)}]`;
  const progress = `${item.progress.completed}/${item.progress.total}`.padStart(5);
  const pr = formatPRStatus(item.prStatus, item.prNumber).padEnd(16);
  const time = formatRelativeTime(item.lastActive).padStart(8);
  const current = item.isCurrent ? ' ←' : '';
  
  return `${name} ${bar} ${progress}  ${pr} ${time}${current}`;
}

/**
 * Format changes as a detailed table
 * @param items Change list items
 * @returns Formatted table string
 */
export function formatTable(items: ChangeListItem[]): string {
  const lines: string[] = [];
  
  // Header
  lines.push('┌─────────────────────────────────┬────────────────┬─────────────────┬──────────────┐');
  lines.push('│ Change                          │ Progress       │ PR Status       │ Last Active  │');
  lines.push('├─────────────────────────────────┼────────────────┼─────────────────┼──────────────┤');
  
  // Rows
  for (const item of items) {
    const name = (item.id + (item.isCurrent ? ' ←' : '')).slice(0, 31).padEnd(31);
    const bar = formatProgressBar(item.progress);
    const progressText = `${item.progress.completed}/${item.progress.total}`.padStart(4);
    const progress = `${bar} ${progressText}`.padEnd(14);
    const pr = formatPRStatus(item.prStatus, item.prNumber).slice(0, 15).padEnd(15);
    const time = formatRelativeTime(item.lastActive).padEnd(12);
    
    lines.push(`│ ${name} │ ${progress} │ ${pr} │ ${time} │`);
  }
  
  // Footer
  lines.push('└─────────────────────────────────┴────────────────┴─────────────────┴──────────────┘');
  
  return lines.join('\n');
}

/**
 * Format a summary line for the list
 * @param items All change items
 * @returns Summary string
 */
export function formatSummary(items: ChangeListItem[]): string {
  const total = items.length;
  const withPRs = items.filter(i => i.prStatus !== 'local').length;
  const ready = items.filter(i => i.prStatus === 'ready').length;
  const drafts = items.filter(i => i.prStatus === 'draft').length;
  
  const parts = [`${total} change${total !== 1 ? 's' : ''}`];
  
  if (ready > 0) {
    parts.push(`${ready} ready for review`);
  }
  if (drafts > 0) {
    parts.push(`${drafts} draft${drafts !== 1 ? 's' : ''}`);
  }
  if (withPRs < total) {
    const local = total - withPRs;
    parts.push(`${local} local only`);
  }
  
  return `Summary: ${parts.join(', ')}`;
}

/**
 * Sort change items based on sort option
 * @param items Change list items
 * @param sort Sort option
 * @returns Sorted items
 */
export function sortItems(items: ChangeListItem[], sort: 'activity' | 'progress' | 'name' = 'activity'): ChangeListItem[] {
  const sorted = [...items];
  
  switch (sort) {
    case 'activity':
      sorted.sort((a, b) => {
        const aTime = a.lastActive?.getTime() ?? 0;
        const bTime = b.lastActive?.getTime() ?? 0;
        return bTime - aTime; // Most recent first
      });
      break;
    case 'progress':
      sorted.sort((a, b) => b.progress.percentage - a.progress.percentage);
      break;
    case 'name':
      sorted.sort((a, b) => a.id.localeCompare(b.id));
      break;
  }
  
  return sorted;
}

/**
 * Filter change items by status
 * @param items Change list items
 * @param status Status to filter by
 * @returns Filtered items
 */
export function filterByStatus(items: ChangeListItem[], status?: PRDisplayStatus): ChangeListItem[] {
  if (!status) return items;
  return items.filter(i => i.prStatus === status);
}

