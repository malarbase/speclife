/**
 * Environment adapters for language-specific worktree setup
 * 
 * These adapters handle dependency bootstrapping when creating worktrees,
 * ensuring the worktree is ready to build without manual intervention.
 */

import { existsSync, lstatSync, symlinkSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { type ProgressCallback } from '../types.js';

/** Bootstrap strategy for environment setup */
export type BootstrapStrategy = 'symlink' | 'install' | 'none';

/** Result of environment detection */
export interface DetectionResult {
  /** Environment name (e.g., 'nodejs', 'python') */
  name: string;
  /** Confidence level 0-1 */
  confidence: number;
  /** Detected package manager */
  packageManager?: string;
  /** Files that triggered detection */
  markerFiles: string[];
}

/** Result of bootstrap operation */
export interface BootstrapResult {
  /** Environment that was bootstrapped */
  environment: string;
  /** Strategy used */
  strategy: BootstrapStrategy;
  /** Whether bootstrap was successful */
  success: boolean;
  /** Human-readable message */
  message: string;
  /** Path that was set up (if applicable) */
  path?: string;
  /** Whether tsconfig was patched for monorepo support */
  tsconfigPatched?: boolean;
  /** Detected monorepo info */
  monorepo?: MonorepoInfo;
}

/** Monorepo information */
export interface MonorepoInfo {
  /** Whether this is a monorepo */
  isMonorepo: boolean;
  /** Type of monorepo setup */
  type?: 'npm-workspaces' | 'yarn-workspaces' | 'pnpm-workspaces' | 'lerna';
  /** Root package.json path */
  rootPackageJson: string;
  /** List of workspace package paths */
  workspacePackages: WorkspacePackage[];
}

/** A workspace package in a monorepo */
export interface WorkspacePackage {
  /** Package name (from package.json) */
  name: string;
  /** Relative path from project root */
  path: string;
  /** Absolute path */
  absolutePath: string;
  /** Entry point for TypeScript (src/index.ts or similar) */
  entryPoint?: string;
}

/** Environment adapter interface */
export interface EnvironmentAdapter {
  /** Unique identifier for this environment */
  readonly name: string;
  
  /** Human-readable display name */
  readonly displayName: string;
  
  /** Priority for detection (higher = checked first) */
  readonly priority: number;
  
  /**
   * Detect if this environment is present in the project
   * @param projectRoot - Path to the project root
   * @returns Detection result or null if not detected
   */
  detect(projectRoot: string): Promise<DetectionResult | null>;
  
  /**
   * Bootstrap the environment in a worktree
   * @param worktreePath - Path to the worktree
   * @param sourceRoot - Path to the source project root
   * @param strategy - Bootstrap strategy to use
   * @param onProgress - Progress callback
   */
  bootstrap(
    worktreePath: string,
    sourceRoot: string,
    strategy: BootstrapStrategy,
    onProgress?: ProgressCallback
  ): Promise<BootstrapResult>;
  
  /**
   * Clean up environment artifacts before worktree removal
   * @param worktreePath - Path to the worktree
   */
  cleanup(worktreePath: string): Promise<void>;
}

/** Registry of environment adapters */
export interface EnvironmentRegistry {
  /** Register an adapter */
  register(adapter: EnvironmentAdapter): void;
  
  /** Get all registered adapters sorted by priority */
  getAdapters(): EnvironmentAdapter[];
  
  /** Get adapter by name */
  getAdapter(name: string): EnvironmentAdapter | undefined;
  
  /** Detect all environments in a project */
  detectEnvironments(projectRoot: string): Promise<DetectionResult[]>;
  
  /**
   * Bootstrap all detected environments
   * @param worktreePath - Path to the worktree
   * @param sourceRoot - Path to the source project root
   * @param strategy - Bootstrap strategy to use
   * @param onProgress - Progress callback
   */
  bootstrapAll(
    worktreePath: string,
    sourceRoot: string,
    strategy: BootstrapStrategy,
    onProgress?: ProgressCallback
  ): Promise<BootstrapResult[]>;
  
  /** Clean up all environments */
  cleanupAll(worktreePath: string): Promise<void>;
}

/**
 * Create an environment registry with optional initial adapters
 */
export function createEnvironmentRegistry(
  initialAdapters?: EnvironmentAdapter[]
): EnvironmentRegistry {
  const adapters: Map<string, EnvironmentAdapter> = new Map();
  
  // Register initial adapters
  if (initialAdapters) {
    for (const adapter of initialAdapters) {
      adapters.set(adapter.name, adapter);
    }
  }
  
  return {
    register(adapter: EnvironmentAdapter): void {
      adapters.set(adapter.name, adapter);
    },
    
    getAdapters(): EnvironmentAdapter[] {
      return Array.from(adapters.values())
        .sort((a, b) => b.priority - a.priority);
    },
    
    getAdapter(name: string): EnvironmentAdapter | undefined {
      return adapters.get(name);
    },
    
    async detectEnvironments(projectRoot: string): Promise<DetectionResult[]> {
      const results: DetectionResult[] = [];
      
      for (const adapter of this.getAdapters()) {
        const detection = await adapter.detect(projectRoot);
        if (detection) {
          results.push(detection);
        }
      }
      
      return results.sort((a, b) => b.confidence - a.confidence);
    },
    
    async bootstrapAll(
      worktreePath: string,
      sourceRoot: string,
      strategy: BootstrapStrategy,
      onProgress?: ProgressCallback
    ): Promise<BootstrapResult[]> {
      const results: BootstrapResult[] = [];
      const detected = await this.detectEnvironments(sourceRoot);
      
      for (const detection of detected) {
        const adapter = adapters.get(detection.name);
        if (adapter) {
          onProgress?.({
            type: 'step_completed',
            message: `Bootstrapping ${adapter.displayName} environment`,
            data: { environment: detection.name, strategy },
          });
          
          const result = await adapter.bootstrap(
            worktreePath,
            sourceRoot,
            strategy,
            onProgress
          );
          results.push(result);
        }
      }
      
      return results;
    },
    
    async cleanupAll(worktreePath: string): Promise<void> {
      for (const adapter of this.getAdapters()) {
        await adapter.cleanup(worktreePath);
      }
    },
  };
}

// ============================================================================
// Built-in Adapters
// ============================================================================

/**
 * Node.js environment adapter
 * Detects: package.json, package-lock.json, yarn.lock, pnpm-lock.yaml
 * Bootstraps: symlinks node_modules from source to worktree
 * 
 * For monorepos: Detects workspace packages and auto-patches tsconfig.json
 * with paths mappings to ensure TypeScript resolves to worktree source.
 */
export function createNodejsAdapter(): EnvironmentAdapter {
  return {
    name: 'nodejs',
    displayName: 'Node.js',
    priority: 100,
    
    async detect(projectRoot: string): Promise<DetectionResult | null> {
      const markerFiles: string[] = [];
      let packageManager: string | undefined;
      
      // Check for package.json (required)
      if (existsSync(join(projectRoot, 'package.json'))) {
        markerFiles.push('package.json');
      } else {
        return null;
      }
      
      // Detect package manager from lock files
      if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) {
        packageManager = 'pnpm';
        markerFiles.push('pnpm-lock.yaml');
      } else if (existsSync(join(projectRoot, 'yarn.lock'))) {
        packageManager = 'yarn';
        markerFiles.push('yarn.lock');
      } else if (existsSync(join(projectRoot, 'package-lock.json'))) {
        packageManager = 'npm';
        markerFiles.push('package-lock.json');
      } else {
        packageManager = 'npm'; // Default to npm
      }
      
      return {
        name: 'nodejs',
        confidence: 1.0,
        packageManager,
        markerFiles,
      };
    },
    
    async bootstrap(
      worktreePath: string,
      sourceRoot: string,
      strategy: BootstrapStrategy,
      onProgress?: ProgressCallback
    ): Promise<BootstrapResult> {
      const sourceModules = join(sourceRoot, 'node_modules');
      const targetModules = join(worktreePath, 'node_modules');
      
      // Detect monorepo structure
      const monorepo = detectMonorepo(sourceRoot);
      
      if (strategy === 'none') {
        return {
          environment: 'nodejs',
          strategy: 'none',
          success: true,
          message: 'Node.js bootstrap skipped (strategy: none)',
          monorepo,
        };
      }
      
      // Check if source node_modules exists
      if (!existsSync(sourceModules)) {
        return {
          environment: 'nodejs',
          strategy,
          success: false,
          message: 'Source node_modules not found. Run npm install in the main project first.',
          monorepo,
        };
      }
      
      if (strategy === 'symlink') {
        // Remove existing target if present
        if (existsSync(targetModules)) {
          rmSync(targetModules, { recursive: true });
        }
        
        // Create parent directory if needed
        await mkdir(dirname(targetModules), { recursive: true });
        
        // Create symlink
        symlinkSync(sourceModules, targetModules, 'junction');
        
        onProgress?.({
          type: 'file_written',
          message: `Symlinked node_modules`,
          data: { source: sourceModules, target: targetModules },
        });
        
        // For monorepos with symlink strategy, patch tsconfig to fix local package resolution
        let tsconfigPatched = false;
        if (monorepo.isMonorepo && monorepo.workspacePackages.length > 0) {
          onProgress?.({
            type: 'step_completed',
            message: `Detected ${monorepo.type} monorepo with ${monorepo.workspacePackages.length} local packages`,
            data: { monorepo },
          });
          
          tsconfigPatched = patchTsconfigForMonorepo(worktreePath, monorepo, onProgress);
          
          if (tsconfigPatched) {
            onProgress?.({
              type: 'step_completed',
              message: 'Patched tsconfig.json files with local package paths',
              data: { packages: monorepo.workspacePackages.map(p => p.name) },
            });
          }
        }
        
        return {
          environment: 'nodejs',
          strategy: 'symlink',
          success: true,
          message: tsconfigPatched 
            ? `Symlinked node_modules and patched tsconfig for ${monorepo.workspacePackages.length} local packages`
            : `Symlinked node_modules from ${sourceRoot}`,
          path: targetModules,
          tsconfigPatched,
          monorepo,
        };
      }
      
      // strategy === 'install'
      // For install strategy, we'd run the package manager
      // This requires executing shell commands which we'll leave as a TODO
      return {
        environment: 'nodejs',
        strategy: 'install',
        success: false,
        message: 'Install strategy not yet implemented. Use symlink for now.',
        monorepo,
      };
    },
    
    async cleanup(worktreePath: string): Promise<void> {
      const targetModules = join(worktreePath, 'node_modules');
      
      // Only remove if it's a symlink (don't delete real node_modules)
      if (existsSync(targetModules)) {
        try {
          const stats = lstatSync(targetModules);
          if (stats.isSymbolicLink()) {
            rmSync(targetModules);
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    },
  };
}

/**
 * Python environment adapter
 * Detects: requirements.txt, pyproject.toml, setup.py, Pipfile
 * Bootstraps: symlinks .venv from source to worktree
 */
export function createPythonAdapter(): EnvironmentAdapter {
  return {
    name: 'python',
    displayName: 'Python',
    priority: 90,
    
    async detect(projectRoot: string): Promise<DetectionResult | null> {
      const markerFiles: string[] = [];
      let packageManager: string | undefined;
      
      // Check for Python project indicators
      if (existsSync(join(projectRoot, 'pyproject.toml'))) {
        markerFiles.push('pyproject.toml');
        // Could be poetry, uv, or standard setuptools
        if (existsSync(join(projectRoot, 'poetry.lock'))) {
          packageManager = 'poetry';
          markerFiles.push('poetry.lock');
        } else if (existsSync(join(projectRoot, 'uv.lock'))) {
          packageManager = 'uv';
          markerFiles.push('uv.lock');
        } else {
          packageManager = 'pip';
        }
      } else if (existsSync(join(projectRoot, 'requirements.txt'))) {
        markerFiles.push('requirements.txt');
        packageManager = 'pip';
      } else if (existsSync(join(projectRoot, 'Pipfile'))) {
        markerFiles.push('Pipfile');
        packageManager = 'pipenv';
      } else if (existsSync(join(projectRoot, 'setup.py'))) {
        markerFiles.push('setup.py');
        packageManager = 'pip';
      } else {
        return null;
      }
      
      return {
        name: 'python',
        confidence: 1.0,
        packageManager,
        markerFiles,
      };
    },
    
    async bootstrap(
      worktreePath: string,
      sourceRoot: string,
      strategy: BootstrapStrategy,
      onProgress?: ProgressCallback
    ): Promise<BootstrapResult> {
      const sourceVenv = join(sourceRoot, '.venv');
      const targetVenv = join(worktreePath, '.venv');
      
      if (strategy === 'none') {
        return {
          environment: 'python',
          strategy: 'none',
          success: true,
          message: 'Python bootstrap skipped (strategy: none)',
        };
      }
      
      // Check if source .venv exists
      if (!existsSync(sourceVenv)) {
        return {
          environment: 'python',
          strategy,
          success: true, // Not a failure - just no venv to symlink
          message: 'No .venv found in source. Python environment not bootstrapped.',
        };
      }
      
      if (strategy === 'symlink') {
        // Remove existing target if present
        if (existsSync(targetVenv)) {
          rmSync(targetVenv, { recursive: true });
        }
        
        // Create parent directory if needed
        await mkdir(dirname(targetVenv), { recursive: true });
        
        // Create symlink
        symlinkSync(sourceVenv, targetVenv, 'junction');
        
        onProgress?.({
          type: 'file_written',
          message: `Symlinked .venv`,
          data: { source: sourceVenv, target: targetVenv },
        });
        
        return {
          environment: 'python',
          strategy: 'symlink',
          success: true,
          message: `Symlinked .venv from ${sourceRoot}`,
          path: targetVenv,
        };
      }
      
      // strategy === 'install'
      return {
        environment: 'python',
        strategy: 'install',
        success: false,
        message: 'Install strategy not yet implemented. Use symlink for now.',
      };
    },
    
    async cleanup(worktreePath: string): Promise<void> {
      const targetVenv = join(worktreePath, '.venv');
      
      if (existsSync(targetVenv)) {
        try {
          const stats = lstatSync(targetVenv);
          if (stats.isSymbolicLink()) {
            rmSync(targetVenv);
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    },
  };
}

/**
 * Go environment adapter
 * Detects: go.mod
 * Bootstraps: no-op (Go uses global module cache)
 */
export function createGoAdapter(): EnvironmentAdapter {
  return {
    name: 'go',
    displayName: 'Go',
    priority: 80,
    
    async detect(projectRoot: string): Promise<DetectionResult | null> {
      if (existsSync(join(projectRoot, 'go.mod'))) {
        return {
          name: 'go',
          confidence: 1.0,
          packageManager: 'go',
          markerFiles: ['go.mod'],
        };
      }
      return null;
    },
    
    async bootstrap(
      _worktreePath: string,
      _sourceRoot: string,
      strategy: BootstrapStrategy,
      _onProgress?: ProgressCallback
    ): Promise<BootstrapResult> {
      // Go uses a global module cache, no per-project setup needed
      return {
        environment: 'go',
        strategy,
        success: true,
        message: 'Go uses global module cache. No worktree setup needed.',
      };
    },
    
    async cleanup(_worktreePath: string): Promise<void> {
      // Nothing to clean up for Go
    },
  };
}

/**
 * Rust environment adapter
 * Detects: Cargo.toml
 * Bootstraps: no-op (Rust uses global cargo cache)
 */
export function createRustAdapter(): EnvironmentAdapter {
  return {
    name: 'rust',
    displayName: 'Rust',
    priority: 80,
    
    async detect(projectRoot: string): Promise<DetectionResult | null> {
      if (existsSync(join(projectRoot, 'Cargo.toml'))) {
        return {
          name: 'rust',
          confidence: 1.0,
          packageManager: 'cargo',
          markerFiles: ['Cargo.toml'],
        };
      }
      return null;
    },
    
    async bootstrap(
      _worktreePath: string,
      _sourceRoot: string,
      strategy: BootstrapStrategy,
      _onProgress?: ProgressCallback
    ): Promise<BootstrapResult> {
      // Rust uses a global cargo cache, no per-project setup needed
      return {
        environment: 'rust',
        strategy,
        success: true,
        message: 'Rust uses global cargo cache. No worktree setup needed.',
      };
    },
    
    async cleanup(_worktreePath: string): Promise<void> {
      // Nothing to clean up for Rust
    },
  };
}

/**
 * Create the default environment registry with all built-in adapters
 */
export function createDefaultEnvironmentRegistry(): EnvironmentRegistry {
  return createEnvironmentRegistry([
    createNodejsAdapter(),
    createPythonAdapter(),
    createGoAdapter(),
    createRustAdapter(),
  ]);
}

// ============================================================================
// Monorepo Detection and TypeScript Patching
// ============================================================================

/**
 * Detect if a project is a monorepo and identify workspace packages
 */
export function detectMonorepo(projectRoot: string): MonorepoInfo {
  const packageJsonPath = join(projectRoot, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    return { isMonorepo: false, rootPackageJson: packageJsonPath, workspacePackages: [] };
  }
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    // Check for npm/yarn workspaces
    if (packageJson.workspaces) {
      const workspacePatterns = Array.isArray(packageJson.workspaces) 
        ? packageJson.workspaces 
        : packageJson.workspaces.packages ?? [];
      
      const packages = resolveWorkspacePackages(projectRoot, workspacePatterns);
      
      return {
        isMonorepo: true,
        type: 'npm-workspaces',
        rootPackageJson: packageJsonPath,
        workspacePackages: packages,
      };
    }
    
    // Check for pnpm workspaces
    const pnpmWorkspacePath = join(projectRoot, 'pnpm-workspace.yaml');
    if (existsSync(pnpmWorkspacePath)) {
      // Simple YAML parsing for packages array
      const content = readFileSync(pnpmWorkspacePath, 'utf-8');
      const patterns = parsePnpmWorkspaceYaml(content);
      const packages = resolveWorkspacePackages(projectRoot, patterns);
      
      return {
        isMonorepo: true,
        type: 'pnpm-workspaces',
        rootPackageJson: packageJsonPath,
        workspacePackages: packages,
      };
    }
    
    // Check for lerna
    const lernaPath = join(projectRoot, 'lerna.json');
    if (existsSync(lernaPath)) {
      const lernaConfig = JSON.parse(readFileSync(lernaPath, 'utf-8'));
      const patterns = lernaConfig.packages ?? ['packages/*'];
      const packages = resolveWorkspacePackages(projectRoot, patterns);
      
      return {
        isMonorepo: true,
        type: 'lerna',
        rootPackageJson: packageJsonPath,
        workspacePackages: packages,
      };
    }
  } catch {
    // Ignore JSON parse errors
  }
  
  return { isMonorepo: false, rootPackageJson: packageJsonPath, workspacePackages: [] };
}

/**
 * Parse pnpm-workspace.yaml to extract package patterns
 * Simple parser that handles common cases
 */
function parsePnpmWorkspaceYaml(content: string): string[] {
  const patterns: string[] = [];
  const lines = content.split('\n');
  let inPackages = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === 'packages:') {
      inPackages = true;
      continue;
    }
    
    if (inPackages) {
      if (trimmed.startsWith('-')) {
        // Extract pattern from "- packages/*" or "- 'packages/*'"
        let pattern = trimmed.slice(1).trim();
        pattern = pattern.replace(/^['"]|['"]$/g, '');
        if (pattern) {
          patterns.push(pattern);
        }
      } else if (!trimmed.startsWith('#') && trimmed.length > 0 && !trimmed.startsWith('-')) {
        // End of packages section
        break;
      }
    }
  }
  
  return patterns;
}

/**
 * Resolve workspace patterns to actual package directories
 */
function resolveWorkspacePackages(projectRoot: string, patterns: string[]): WorkspacePackage[] {
  const packages: WorkspacePackage[] = [];
  
  for (const pattern of patterns) {
    // Handle simple glob patterns like "packages/*"
    if (pattern.endsWith('/*')) {
      const baseDir = pattern.slice(0, -2);
      const fullPath = join(projectRoot, baseDir);
      
      if (existsSync(fullPath)) {
        try {
          const entries = readdirSync(fullPath, { withFileTypes: true });
          
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const pkgPath = join(fullPath, entry.name);
              const pkgJsonPath = join(pkgPath, 'package.json');
              
              if (existsSync(pkgJsonPath)) {
                try {
                  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
                  const relativePath = relative(projectRoot, pkgPath);
                  
                  // Find TypeScript entry point
                  const entryPoint = findTypeScriptEntryPoint(pkgPath);
                  
                  packages.push({
                    name: pkgJson.name,
                    path: relativePath,
                    absolutePath: pkgPath,
                    entryPoint,
                  });
                } catch {
                  // Skip packages with invalid package.json
                }
              }
            }
          }
        } catch {
          // Ignore directory read errors
        }
      }
    } else if (!pattern.includes('*')) {
      // Direct path like "packages/core"
      const fullPath = join(projectRoot, pattern);
      const pkgJsonPath = join(fullPath, 'package.json');
      
      if (existsSync(pkgJsonPath)) {
        try {
          const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
          const entryPoint = findTypeScriptEntryPoint(fullPath);
          
          packages.push({
            name: pkgJson.name,
            path: pattern,
            absolutePath: fullPath,
            entryPoint,
          });
        } catch {
          // Skip packages with invalid package.json
        }
      }
    }
  }
  
  return packages;
}

/**
 * Find the TypeScript entry point for a package
 */
function findTypeScriptEntryPoint(packagePath: string): string | undefined {
  // Common entry points in order of preference
  const candidates = [
    'src/index.ts',
    'src/index.tsx',
    'lib/index.ts',
    'index.ts',
  ];
  
  for (const candidate of candidates) {
    if (existsSync(join(packagePath, candidate))) {
      return candidate;
    }
  }
  
  return undefined;
}

/**
 * Patch tsconfig files in a worktree to add paths for local workspace packages
 * This ensures TypeScript resolves to worktree source, not the symlinked main repo
 */
export function patchTsconfigForMonorepo(
  worktreePath: string,
  monorepo: MonorepoInfo,
  onProgress?: ProgressCallback
): boolean {
  if (!monorepo.isMonorepo || monorepo.workspacePackages.length === 0) {
    return false;
  }
  
  let patched = false;
  
  // Find all tsconfig files in the worktree
  const tsconfigPaths = findTsconfigFiles(worktreePath);
  
  for (const tsconfigPath of tsconfigPaths) {
    try {
      const pathedPackages = patchSingleTsconfig(tsconfigPath, worktreePath, monorepo);
      if (pathedPackages > 0) {
        patched = true;
        onProgress?.({
          type: 'file_written',
          message: `Patched ${tsconfigPath} with ${pathedPackages} local package paths`,
          data: { tsconfigPath, packageCount: pathedPackages },
        });
      }
    } catch {
      // Skip files that can't be patched
    }
  }
  
  return patched;
}

/**
 * Find all tsconfig.json files in a directory tree
 */
function findTsconfigFiles(rootPath: string): string[] {
  const tsconfigs: string[] = [];
  
  function scan(dirPath: string, depth: number): void {
    if (depth > 5) return; // Limit depth to avoid traversing too deep
    
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isFile() && entry.name === 'tsconfig.json') {
          tsconfigs.push(fullPath);
        } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scan(fullPath, depth + 1);
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }
  
  scan(rootPath, 0);
  return tsconfigs;
}

/**
 * Patch a single tsconfig.json file with paths for local packages
 */
function patchSingleTsconfig(
  tsconfigPath: string,
  worktreePath: string,
  monorepo: MonorepoInfo
): number {
  const content = readFileSync(tsconfigPath, 'utf-8');
  
  // Parse tsconfig (handle comments by stripping them)
  const jsonContent = stripJsonComments(content);
  const tsconfig = JSON.parse(jsonContent);
  
  // Ensure compilerOptions exists
  if (!tsconfig.compilerOptions) {
    tsconfig.compilerOptions = {};
  }
  
  // Calculate relative path from tsconfig location to worktree root
  const tsconfigDir = dirname(tsconfigPath);
  const relativeToRoot = relative(tsconfigDir, worktreePath);
  
  // Set baseUrl if not already set
  if (!tsconfig.compilerOptions.baseUrl) {
    tsconfig.compilerOptions.baseUrl = '.';
  }
  
  // Build paths mapping for local packages
  if (!tsconfig.compilerOptions.paths) {
    tsconfig.compilerOptions.paths = {};
  }
  
  let addedCount = 0;
  
  for (const pkg of monorepo.workspacePackages) {
    // Skip if path already exists for this package
    if (tsconfig.compilerOptions.paths[pkg.name]) {
      continue;
    }
    
    // Calculate relative path from tsconfig to package source
    const packageSrcPath = pkg.entryPoint
      ? join(relativeToRoot, pkg.path, pkg.entryPoint)
      : join(relativeToRoot, pkg.path, 'src/index.ts');
    
    // Add path mapping
    tsconfig.compilerOptions.paths[pkg.name] = [packageSrcPath];
    addedCount++;
  }
  
  if (addedCount > 0) {
    // Write back with pretty formatting
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf-8');
  }
  
  return addedCount;
}

/**
 * Strip JSON comments for parsing (single-line // and multi-line block comments)
 */
function stripJsonComments(content: string): string {
  // Remove single-line comments
  let result = content.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  return result;
}

