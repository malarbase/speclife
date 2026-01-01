/**
 * Config loading and validation tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config.js';
import { 
  createTempDir, 
  removeTempDir, 
  createSpecLifeConfig 
} from './helpers.js';

describe('loadConfig', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  it('loads config from .specliferc.json', async () => {
    await createSpecLifeConfig(tempDir, {
      specDir: 'custom-spec',
      aiProvider: 'openai',
    });

    const config = await loadConfig(tempDir);

    expect(config.specDir).toBe('custom-spec');
    expect(config.aiProvider).toBe('openai');
  });

  it('applies default values for missing fields', async () => {
    await createSpecLifeConfig(tempDir, {});

    const config = await loadConfig(tempDir);

    expect(config.specDir).toBe('openspec');
    expect(config.aiProvider).toBe('claude');
    expect(config.aiModel).toBe('claude-sonnet-4-20250514');
    expect(config.implementMode).toBe('claude-cli');
    expect(config.github.baseBranch).toBe('main');
  });

  it('merges github config with defaults', async () => {
    await createSpecLifeConfig(tempDir, {
      github: {
        owner: 'my-org',
        repo: 'my-repo',
      },
    });

    const config = await loadConfig(tempDir);

    expect(config.github.owner).toBe('my-org');
    expect(config.github.repo).toBe('my-repo');
    expect(config.github.baseBranch).toBe('main');
  });

  it('validates aiProvider enum', async () => {
    await createSpecLifeConfig(tempDir, {
      aiProvider: 'invalid-provider',
    });

    await expect(loadConfig(tempDir)).rejects.toThrow('Invalid aiProvider');
  });

  it('validates implementMode enum', async () => {
    await createSpecLifeConfig(tempDir, {
      implementMode: 'invalid-mode',
    });

    await expect(loadConfig(tempDir)).rejects.toThrow('Invalid implementMode');
  });

  it('validates worktree.bootstrap.strategy enum', async () => {
    await createSpecLifeConfig(tempDir, {
      worktree: {
        bootstrap: {
          strategy: 'invalid-strategy',
        },
      },
    });

    await expect(loadConfig(tempDir)).rejects.toThrow('Invalid worktree.bootstrap.strategy');
  });

  it('applies environment variable overrides', async () => {
    await createSpecLifeConfig(tempDir, {});

    const originalProvider = process.env.SPECLIFE_AI_PROVIDER;
    process.env.SPECLIFE_AI_PROVIDER = 'openai';

    try {
      const config = await loadConfig(tempDir);
      expect(config.aiProvider).toBe('openai');
    } finally {
      if (originalProvider) {
        process.env.SPECLIFE_AI_PROVIDER = originalProvider;
      } else {
        delete process.env.SPECLIFE_AI_PROVIDER;
      }
    }
  });

  it('uses defaults when no config file exists', async () => {
    const config = await loadConfig(tempDir);

    expect(config.specDir).toBe('openspec');
    expect(config.aiProvider).toBe('claude');
  });
});

