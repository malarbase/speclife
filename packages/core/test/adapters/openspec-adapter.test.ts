/**
 * OpenSpec adapter tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createOpenSpecAdapter } from '../../src/adapters/openspec-adapter.js';
import { 
  createTempDir, 
  removeTempDir, 
  createOpenSpecStructure,
  createMockChange,
} from '../helpers.js';

describe('OpenSpecAdapter', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await createOpenSpecStructure(tempDir);
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  describe('changeExists', () => {
    it('returns true when change directory exists', async () => {
      await createMockChange(tempDir, 'test-change');
      const adapter = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      const exists = await adapter.changeExists('test-change');

      expect(exists).toBe(true);
    });

    it('returns false when change directory does not exist', async () => {
      const adapter = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      const exists = await adapter.changeExists('nonexistent-change');

      expect(exists).toBe(false);
    });
  });

  describe('readChange', () => {
    it('reads change with proposal and tasks', async () => {
      await createMockChange(tempDir, 'test-change', {
        proposal: '## Why\nTest reason\n\n## What Changes\n- Change 1\n',
        tasks: '## 1. Implementation\n- [ ] 1.1 Task one\n- [x] 1.2 Task two\n',
      });
      const adapter = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      const change = await adapter.readChange('test-change');

      expect(change.id).toBe('test-change');
      expect(change.branch).toBe('spec/test-change');
      expect(change.tasks).toHaveLength(2);
      // Task has id, content, completed
      expect(change.tasks[0].id).toBe('1.1');
      expect(change.tasks[0].content).toBe('Task one');
      expect(change.tasks[0].completed).toBe(false);
      expect(change.tasks[1].id).toBe('1.2');
      expect(change.tasks[1].content).toBe('Task two');
      expect(change.tasks[1].completed).toBe(true);
    });

    it('throws when change does not exist', async () => {
      const adapter = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      await expect(adapter.readChange('nonexistent')).rejects.toThrow();
    });
  });

  describe('scaffoldChange', () => {
    it('creates proposal and tasks files', async () => {
      const adapter = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      const result = await adapter.scaffoldChange('new-feature', { description: 'Add a new feature' });

      expect(result.proposalPath).toContain('new-feature/proposal.md');
      expect(result.tasksPath).toContain('new-feature/tasks.md');
      expect(await adapter.changeExists('new-feature')).toBe(true);
    });

    it('throws when change already exists', async () => {
      await createMockChange(tempDir, 'existing-change');
      const adapter = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      await expect(
        adapter.scaffoldChange('existing-change', { description: 'Description' })
      ).rejects.toThrow();
    });
  });

  describe('listChanges', () => {
    it('returns empty array when no changes exist', async () => {
      const adapter = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      const changes = await adapter.listChanges();

      expect(changes).toEqual([]);
    });

    it('lists all active change IDs', async () => {
      await createMockChange(tempDir, 'change-a');
      await createMockChange(tempDir, 'change-b');
      const adapter = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      const changes = await adapter.listChanges();

      expect(changes).toHaveLength(2);
      expect(changes.sort()).toEqual(['change-a', 'change-b']);
    });
  });

  describe('archiveChange', () => {
    it('moves change to archive directory with date prefix', async () => {
      await createMockChange(tempDir, 'completed-change');
      const adapter = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      await adapter.archiveChange('completed-change');

      expect(await adapter.changeExists('completed-change')).toBe(false);
      // Archived changes are in archive/ subdirectory
    });

    it('throws when change does not exist', async () => {
      const adapter = createOpenSpecAdapter({ projectRoot: tempDir, specDir: 'openspec' });

      await expect(adapter.archiveChange('nonexistent')).rejects.toThrow();
    });
  });
});
