/**
 * MCP Tool schema validation tests
 * 
 * Validates tool schemas and basic configuration.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Define schemas matching tool definitions
const InitArgsSchema = z.object({
  changeId: z.string(),
  description: z.string().optional(),
  noWorktree: z.boolean().optional(),
  skipDraftPR: z.boolean().optional(),
  generateTasks: z.boolean().optional(),
});

const StatusArgsSchema = z.object({
  changeId: z.string().optional(),
});

const ListArgsSchema = z.object({
  compact: z.boolean().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
});

const SubmitArgsSchema = z.object({
  changeId: z.string(),
  draft: z.boolean().optional(),
  commitMessage: z.string().optional(),
  skipArchive: z.boolean().optional(),
  skipValidation: z.boolean().optional(),
  strict: z.boolean().optional(),
});

const MergeArgsSchema = z.object({
  changeId: z.string(),
  method: z.enum(['squash', 'merge', 'rebase']).optional(),
  deleteBranch: z.boolean().optional(),
  removeWorktree: z.boolean().optional(),
  skipRelease: z.boolean().optional(),
});

const ImplementArgsSchema = z.object({
  changeId: z.string(),
  mode: z.enum(['claude-cli', 'claude-sdk', 'cursor']).optional(),
  taskId: z.string().optional(),
  dryRun: z.boolean().optional(),
});

const ReleaseArgsSchema = z.object({
  major: z.boolean().optional(),
  minor: z.boolean().optional(),
  patch: z.boolean().optional(),
  version: z.string().optional(),
  dryRun: z.boolean().optional(),
  skipChangelog: z.boolean().optional(),
  autoMerge: z.boolean().optional(),
});

describe('Tool Schemas', () => {
  describe('speclife_init', () => {
    it('requires changeId', () => {
      expect(() => InitArgsSchema.parse({})).toThrow();
      expect(() => InitArgsSchema.parse({ changeId: 'test' })).not.toThrow();
    });

    it('accepts valid changeId formats', () => {
      expect(InitArgsSchema.parse({ changeId: 'add-feature' })).toBeDefined();
      expect(InitArgsSchema.parse({ changeId: 'fix-bug-123' })).toBeDefined();
      expect(InitArgsSchema.parse({ changeId: 'refactor-api' })).toBeDefined();
    });

    it('accepts optional description', () => {
      const result = InitArgsSchema.parse({
        changeId: 'test',
        description: 'Add new feature',
      });
      expect(result.description).toBe('Add new feature');
    });

    it('accepts optional noWorktree flag', () => {
      const result = InitArgsSchema.parse({
        changeId: 'test',
        noWorktree: true,
      });
      expect(result.noWorktree).toBe(true);
    });

    it('accepts optional generateTasks flag', () => {
      const result = InitArgsSchema.parse({
        changeId: 'test',
        generateTasks: true,
      });
      expect(result.generateTasks).toBe(true);
    });
  });

  describe('speclife_status', () => {
    it('accepts empty args', () => {
      expect(() => StatusArgsSchema.parse({})).not.toThrow();
    });

    it('accepts optional changeId', () => {
      const result = StatusArgsSchema.parse({ changeId: 'add-feature' });
      expect(result.changeId).toBe('add-feature');
    });
  });

  describe('speclife_list', () => {
    it('accepts empty args', () => {
      expect(() => ListArgsSchema.parse({})).not.toThrow();
    });

    it('accepts filtering options', () => {
      const result = ListArgsSchema.parse({
        compact: true,
        status: 'implementing',
        sort: 'activity',
      });
      expect(result.compact).toBe(true);
      expect(result.status).toBe('implementing');
      expect(result.sort).toBe('activity');
    });
  });

  describe('speclife_submit', () => {
    it('requires changeId', () => {
      expect(() => SubmitArgsSchema.parse({})).toThrow();
    });

    it('accepts valid submission options', () => {
      const result = SubmitArgsSchema.parse({
        changeId: 'add-feature',
        draft: true,
        commitMessage: 'Custom commit',
      });
      expect(result.draft).toBe(true);
      expect(result.commitMessage).toBe('Custom commit');
    });

    it('accepts skipArchive option', () => {
      const result = SubmitArgsSchema.parse({
        changeId: 'test',
        skipArchive: true,
      });
      expect(result.skipArchive).toBe(true);
    });

    it('accepts validation options', () => {
      const result = SubmitArgsSchema.parse({
        changeId: 'test',
        skipValidation: true,
        strict: true,
      });
      expect(result.skipValidation).toBe(true);
      expect(result.strict).toBe(true);
    });
  });

  describe('speclife_merge', () => {
    it('requires changeId', () => {
      expect(() => MergeArgsSchema.parse({})).toThrow();
    });

    it('accepts valid merge methods', () => {
      expect(MergeArgsSchema.parse({ changeId: 'test', method: 'squash' })).toBeDefined();
      expect(MergeArgsSchema.parse({ changeId: 'test', method: 'merge' })).toBeDefined();
      expect(MergeArgsSchema.parse({ changeId: 'test', method: 'rebase' })).toBeDefined();
    });

    it('rejects invalid merge methods', () => {
      expect(() => MergeArgsSchema.parse({ changeId: 'test', method: 'invalid' })).toThrow();
    });

    it('accepts cleanup options', () => {
      const result = MergeArgsSchema.parse({
        changeId: 'test',
        deleteBranch: false,
        removeWorktree: false,
      });
      expect(result.deleteBranch).toBe(false);
      expect(result.removeWorktree).toBe(false);
    });

    it('accepts skipRelease option', () => {
      const result = MergeArgsSchema.parse({
        changeId: 'test',
        skipRelease: true,
      });
      expect(result.skipRelease).toBe(true);
    });
  });

  describe('speclife_implement', () => {
    it('requires changeId', () => {
      expect(() => ImplementArgsSchema.parse({})).toThrow();
    });

    it('accepts valid modes', () => {
      expect(ImplementArgsSchema.parse({ changeId: 'test', mode: 'claude-cli' })).toBeDefined();
      expect(ImplementArgsSchema.parse({ changeId: 'test', mode: 'claude-sdk' })).toBeDefined();
      expect(ImplementArgsSchema.parse({ changeId: 'test', mode: 'cursor' })).toBeDefined();
    });

    it('rejects invalid modes', () => {
      expect(() => ImplementArgsSchema.parse({ changeId: 'test', mode: 'invalid' })).toThrow();
    });

    it('accepts taskId for specific task', () => {
      const result = ImplementArgsSchema.parse({
        changeId: 'test',
        taskId: '1.2',
      });
      expect(result.taskId).toBe('1.2');
    });

    it('accepts dryRun option', () => {
      const result = ImplementArgsSchema.parse({
        changeId: 'test',
        dryRun: true,
      });
      expect(result.dryRun).toBe(true);
    });
  });

  describe('speclife_release', () => {
    it('accepts empty args', () => {
      expect(() => ReleaseArgsSchema.parse({})).not.toThrow();
    });

    it('accepts version bump flags', () => {
      expect(ReleaseArgsSchema.parse({ major: true })).toBeDefined();
      expect(ReleaseArgsSchema.parse({ minor: true })).toBeDefined();
      expect(ReleaseArgsSchema.parse({ patch: true })).toBeDefined();
    });

    it('accepts explicit version', () => {
      const result = ReleaseArgsSchema.parse({ version: '2.0.0' });
      expect(result.version).toBe('2.0.0');
    });

    it('accepts dryRun option', () => {
      const result = ReleaseArgsSchema.parse({ dryRun: true });
      expect(result.dryRun).toBe(true);
    });

    it('accepts skipChangelog option', () => {
      const result = ReleaseArgsSchema.parse({ skipChangelog: true });
      expect(result.skipChangelog).toBe(true);
    });

    it('accepts autoMerge option', () => {
      const result = ReleaseArgsSchema.parse({ autoMerge: true });
      expect(result.autoMerge).toBe(true);
    });
  });
});

describe('Tool Names', () => {
  const toolNames = [
    'speclife_init',
    'speclife_status',
    'speclife_list',
    'speclife_submit',
    'speclife_merge',
    'speclife_implement',
    'speclife_release',
  ];

  it('all tool names follow speclife_ prefix convention', () => {
    for (const name of toolNames) {
      expect(name.startsWith('speclife_')).toBe(true);
    }
  });

  it('all tool names are unique', () => {
    const uniqueNames = new Set(toolNames);
    expect(uniqueNames.size).toBe(toolNames.length);
  });
});

