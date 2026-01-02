/**
 * Environment adapter tests
 * 
 * Tests environment detection and bootstrap strategies for various languages.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { existsSync, symlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { 
  createTempDir, 
  removeTempDir,
} from '../helpers.js';
import {
  createEnvironmentRegistry,
  createNodejsAdapter,
  createPythonAdapter,
  createGoAdapter,
  createRustAdapter,
  createDefaultEnvironmentRegistry,
  detectMonorepo,
} from '../../src/adapters/environment-adapter.js';

describe('EnvironmentRegistry', () => {
  describe('createEnvironmentRegistry', () => {
    it('creates an empty registry', () => {
      const registry = createEnvironmentRegistry();
      expect(registry.getAdapters()).toHaveLength(0);
    });

    it('creates registry with initial adapters', () => {
      const registry = createEnvironmentRegistry([
        createNodejsAdapter(),
        createPythonAdapter(),
      ]);
      expect(registry.getAdapters()).toHaveLength(2);
    });

    it('sorts adapters by priority (highest first)', () => {
      const registry = createEnvironmentRegistry([
        createGoAdapter(),      // priority 80
        createNodejsAdapter(),  // priority 100
        createRustAdapter(),    // priority 80
      ]);
      
      const adapters = registry.getAdapters();
      expect(adapters[0].name).toBe('nodejs');
    });
  });

  describe('register', () => {
    it('registers new adapters', () => {
      const registry = createEnvironmentRegistry();
      registry.register(createNodejsAdapter());
      
      expect(registry.getAdapters()).toHaveLength(1);
      expect(registry.getAdapter('nodejs')).toBeDefined();
    });
  });

  describe('getAdapter', () => {
    it('returns undefined for unknown adapter', () => {
      const registry = createEnvironmentRegistry();
      expect(registry.getAdapter('unknown')).toBeUndefined();
    });
  });
});

describe('NodejsAdapter', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof createNodejsAdapter>;

  beforeEach(async () => {
    tempDir = await createTempDir('nodejs-test-');
    adapter = createNodejsAdapter();
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  describe('detect', () => {
    it('detects Node.js project with package.json', async () => {
      await writeFile(join(tempDir, 'package.json'), '{}');

      const result = await adapter.detect(tempDir);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('nodejs');
      expect(result?.markerFiles).toContain('package.json');
    });

    it('returns null without package.json', async () => {
      const result = await adapter.detect(tempDir);
      expect(result).toBeNull();
    });

    it('detects npm as package manager from package-lock.json', async () => {
      await writeFile(join(tempDir, 'package.json'), '{}');
      await writeFile(join(tempDir, 'package-lock.json'), '{}');

      const result = await adapter.detect(tempDir);

      expect(result?.packageManager).toBe('npm');
      expect(result?.markerFiles).toContain('package-lock.json');
    });

    it('detects yarn as package manager from yarn.lock', async () => {
      await writeFile(join(tempDir, 'package.json'), '{}');
      await writeFile(join(tempDir, 'yarn.lock'), '');

      const result = await adapter.detect(tempDir);

      expect(result?.packageManager).toBe('yarn');
      expect(result?.markerFiles).toContain('yarn.lock');
    });

    it('detects pnpm as package manager from pnpm-lock.yaml', async () => {
      await writeFile(join(tempDir, 'package.json'), '{}');
      await writeFile(join(tempDir, 'pnpm-lock.yaml'), '');

      const result = await adapter.detect(tempDir);

      expect(result?.packageManager).toBe('pnpm');
      expect(result?.markerFiles).toContain('pnpm-lock.yaml');
    });
  });

  describe('bootstrap', () => {
    it('returns success with strategy none', async () => {
      const result = await adapter.bootstrap(
        join(tempDir, 'worktree'),
        tempDir,
        'none'
      );

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('none');
    });

    it('fails when source node_modules does not exist', async () => {
      const result = await adapter.bootstrap(
        join(tempDir, 'worktree'),
        tempDir,
        'symlink'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('node_modules not found');
    });

    it('creates symlink to node_modules', async () => {
      // Create source node_modules
      await mkdir(join(tempDir, 'node_modules'), { recursive: true });
      await writeFile(join(tempDir, 'node_modules', 'test.txt'), 'test');
      
      // Create worktree directory
      const worktreePath = join(tempDir, 'worktree');
      await mkdir(worktreePath, { recursive: true });

      const result = await adapter.bootstrap(worktreePath, tempDir, 'symlink');

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('symlink');
      expect(existsSync(join(worktreePath, 'node_modules'))).toBe(true);
    });

    it('returns not implemented for install strategy', async () => {
      await mkdir(join(tempDir, 'node_modules'));

      const result = await adapter.bootstrap(
        join(tempDir, 'worktree'),
        tempDir,
        'install'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('not yet implemented');
    });
  });

  describe('cleanup', () => {
    it('removes symlinked node_modules', async () => {
      const worktreePath = join(tempDir, 'worktree');
      await mkdir(worktreePath, { recursive: true });
      
      // Create source and symlink
      const sourceModules = join(tempDir, 'source_modules');
      await mkdir(sourceModules);
      symlinkSync(sourceModules, join(worktreePath, 'node_modules'), 'junction');

      await adapter.cleanup(worktreePath);

      expect(existsSync(join(worktreePath, 'node_modules'))).toBe(false);
    });

    it('does not throw when no node_modules exists', async () => {
      const worktreePath = join(tempDir, 'worktree');
      await mkdir(worktreePath, { recursive: true });

      await expect(adapter.cleanup(worktreePath)).resolves.not.toThrow();
    });
  });
});

describe('PythonAdapter', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof createPythonAdapter>;

  beforeEach(async () => {
    tempDir = await createTempDir('python-test-');
    adapter = createPythonAdapter();
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  describe('detect', () => {
    it('detects Python project with requirements.txt', async () => {
      await writeFile(join(tempDir, 'requirements.txt'), 'flask==2.0.0');

      const result = await adapter.detect(tempDir);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('python');
      expect(result?.packageManager).toBe('pip');
    });

    it('detects Python project with pyproject.toml', async () => {
      await writeFile(join(tempDir, 'pyproject.toml'), '[project]');

      const result = await adapter.detect(tempDir);

      expect(result?.name).toBe('python');
      expect(result?.markerFiles).toContain('pyproject.toml');
    });

    it('detects poetry from poetry.lock', async () => {
      await writeFile(join(tempDir, 'pyproject.toml'), '[project]');
      await writeFile(join(tempDir, 'poetry.lock'), '');

      const result = await adapter.detect(tempDir);

      expect(result?.packageManager).toBe('poetry');
    });

    it('detects pipenv from Pipfile', async () => {
      await writeFile(join(tempDir, 'Pipfile'), '');

      const result = await adapter.detect(tempDir);

      expect(result?.packageManager).toBe('pipenv');
    });

    it('returns null for non-Python project', async () => {
      const result = await adapter.detect(tempDir);
      expect(result).toBeNull();
    });
  });

  describe('bootstrap', () => {
    it('returns success when no .venv exists', async () => {
      const result = await adapter.bootstrap(
        join(tempDir, 'worktree'),
        tempDir,
        'symlink'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('No .venv found');
    });

    it('creates symlink to .venv when exists', async () => {
      // Create source .venv
      await mkdir(join(tempDir, '.venv'), { recursive: true });
      
      const worktreePath = join(tempDir, 'worktree');
      await mkdir(worktreePath, { recursive: true });

      const result = await adapter.bootstrap(worktreePath, tempDir, 'symlink');

      expect(result.success).toBe(true);
      expect(existsSync(join(worktreePath, '.venv'))).toBe(true);
    });
  });
});

describe('GoAdapter', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof createGoAdapter>;

  beforeEach(async () => {
    tempDir = await createTempDir('go-test-');
    adapter = createGoAdapter();
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  describe('detect', () => {
    it('detects Go project with go.mod', async () => {
      await writeFile(join(tempDir, 'go.mod'), 'module example.com/test');

      const result = await adapter.detect(tempDir);

      expect(result?.name).toBe('go');
      expect(result?.packageManager).toBe('go');
    });

    it('returns null without go.mod', async () => {
      const result = await adapter.detect(tempDir);
      expect(result).toBeNull();
    });
  });

  describe('bootstrap', () => {
    it('returns success without action (global cache)', async () => {
      const result = await adapter.bootstrap(
        join(tempDir, 'worktree'),
        tempDir,
        'symlink'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('global module cache');
    });
  });
});

describe('RustAdapter', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof createRustAdapter>;

  beforeEach(async () => {
    tempDir = await createTempDir('rust-test-');
    adapter = createRustAdapter();
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  describe('detect', () => {
    it('detects Rust project with Cargo.toml', async () => {
      await writeFile(join(tempDir, 'Cargo.toml'), '[package]');

      const result = await adapter.detect(tempDir);

      expect(result?.name).toBe('rust');
      expect(result?.packageManager).toBe('cargo');
    });

    it('returns null without Cargo.toml', async () => {
      const result = await adapter.detect(tempDir);
      expect(result).toBeNull();
    });
  });
});

describe('detectMonorepo', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('monorepo-test-');
  });

  afterEach(async () => {
    await removeTempDir(tempDir);
  });

  it('returns isMonorepo false without package.json', () => {
    const result = detectMonorepo(tempDir);
    expect(result.isMonorepo).toBe(false);
  });

  it('returns isMonorepo false for non-monorepo', async () => {
    await writeFile(join(tempDir, 'package.json'), JSON.stringify({
      name: 'simple-project',
    }));

    const result = detectMonorepo(tempDir);
    expect(result.isMonorepo).toBe(false);
  });

  it('detects npm workspaces', async () => {
    await writeFile(join(tempDir, 'package.json'), JSON.stringify({
      name: 'monorepo',
      workspaces: ['packages/*'],
    }));
    
    // Create a workspace package
    await mkdir(join(tempDir, 'packages', 'core'), { recursive: true });
    await writeFile(
      join(tempDir, 'packages', 'core', 'package.json'),
      JSON.stringify({ name: '@test/core' })
    );

    const result = detectMonorepo(tempDir);

    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('npm-workspaces');
    expect(result.workspacePackages).toHaveLength(1);
    expect(result.workspacePackages[0].name).toBe('@test/core');
  });

  it('detects pnpm workspaces', async () => {
    await writeFile(join(tempDir, 'package.json'), JSON.stringify({
      name: 'pnpm-monorepo',
    }));
    await writeFile(join(tempDir, 'pnpm-workspace.yaml'), `packages:
  - 'packages/*'
`);
    
    // Create a workspace package
    await mkdir(join(tempDir, 'packages', 'lib'), { recursive: true });
    await writeFile(
      join(tempDir, 'packages', 'lib', 'package.json'),
      JSON.stringify({ name: '@test/lib' })
    );

    const result = detectMonorepo(tempDir);

    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('pnpm-workspaces');
  });

  it('detects lerna', async () => {
    await writeFile(join(tempDir, 'package.json'), JSON.stringify({
      name: 'lerna-monorepo',
    }));
    await writeFile(join(tempDir, 'lerna.json'), JSON.stringify({
      packages: ['packages/*'],
    }));
    
    // Create a workspace package
    await mkdir(join(tempDir, 'packages', 'app'), { recursive: true });
    await writeFile(
      join(tempDir, 'packages', 'app', 'package.json'),
      JSON.stringify({ name: '@test/app' })
    );

    const result = detectMonorepo(tempDir);

    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('lerna');
  });
});

describe('createDefaultEnvironmentRegistry', () => {
  it('includes all built-in adapters', () => {
    const registry = createDefaultEnvironmentRegistry();
    const adapters = registry.getAdapters();

    expect(adapters.map(a => a.name)).toContain('nodejs');
    expect(adapters.map(a => a.name)).toContain('python');
    expect(adapters.map(a => a.name)).toContain('go');
    expect(adapters.map(a => a.name)).toContain('rust');
  });

  it('detects multiple environments in multi-language project', async () => {
    const tempDir = await createTempDir('multi-lang-');
    
    try {
      await writeFile(join(tempDir, 'package.json'), '{}');
      await writeFile(join(tempDir, 'go.mod'), 'module test');

      const registry = createDefaultEnvironmentRegistry();
      const detected = await registry.detectEnvironments(tempDir);

      expect(detected.length).toBeGreaterThanOrEqual(2);
      expect(detected.map(d => d.name)).toContain('nodejs');
      expect(detected.map(d => d.name)).toContain('go');
    } finally {
      await removeTempDir(tempDir);
    }
  });
});

