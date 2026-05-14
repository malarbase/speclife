/**
 * Tests for shell completion generators
 */

import { describe, it, expect } from 'vitest';
import {
  generateCompletions,
  getInstallInstructions,
  getSupportedShells,
  getGenerator,
  getCommandDefinitions,
  BashGenerator,
  ZshGenerator,
  FishGenerator,
} from '../src/completions/index.js';

describe('Shell Completions', () => {
  describe('getSupportedShells', () => {
    it('returns bash, zsh, and fish', () => {
      const shells = getSupportedShells();
      expect(shells).toContain('bash');
      expect(shells).toContain('zsh');
      expect(shells).toContain('fish');
      expect(shells).toHaveLength(3);
    });
  });

  describe('getCommandDefinitions', () => {
    it('returns all command definitions', () => {
      const commands = getCommandDefinitions();
      expect(commands.length).toBeGreaterThan(0);

      const names = commands.map(c => c.name);
      expect(names).toContain('init');
      expect(names).toContain('completion');
      expect(names).toContain('update');
      expect(names).toContain('version');
    });
  });

  describe('getGenerator', () => {
    it('returns correct generator for each shell', () => {
      expect(getGenerator('bash')).toBeInstanceOf(BashGenerator);
      expect(getGenerator('zsh')).toBeInstanceOf(ZshGenerator);
      expect(getGenerator('fish')).toBeInstanceOf(FishGenerator);
    });
  });
});

describe('BashGenerator', () => {
  const generator = new BashGenerator();

  it('has correct shell property', () => {
    expect(generator.shell).toBe('bash');
  });

  describe('generate', () => {
    it('produces valid bash script', () => {
      const script = generateCompletions('bash');
      expect(script).toContain('# Bash completion for speclife');
      expect(script).toContain('_speclife()');
      expect(script).toContain('complete -F _speclife speclife');
    });

    it('includes all main commands', () => {
      const script = generateCompletions('bash');
      expect(script).toContain('init');
      expect(script).toContain('completion');
      expect(script).toContain('update');
      expect(script).toContain('version');
    });

    it('includes option completions', () => {
      const script = generateCompletions('bash');
      expect(script).toContain('--force');
    });
  });

  describe('getInstallInstructions', () => {
    it('provides bash installation instructions', () => {
      const instructions = generator.getInstallInstructions();
      expect(instructions).toContain('bashrc');
      expect(instructions).toContain('bash_profile');
    });
  });
});

describe('ZshGenerator', () => {
  const generator = new ZshGenerator();

  it('has correct shell property', () => {
    expect(generator.shell).toBe('zsh');
  });

  describe('generate', () => {
    it('produces valid zsh script', () => {
      const script = generateCompletions('zsh');
      expect(script).toContain('#compdef speclife');
      expect(script).toContain('_speclife()');
      expect(script).toContain('_speclife "$@"');
    });

    it('includes command descriptions', () => {
      const script = generateCompletions('zsh');
      expect(script).toContain('Initialize SpecLife');
    });

    it('uses _describe for command completion', () => {
      const script = generateCompletions('zsh');
      expect(script).toContain('_describe');
    });

    it('includes _arguments for option completion', () => {
      const script = generateCompletions('zsh');
      expect(script).toContain('_arguments');
    });
  });

  describe('getInstallInstructions', () => {
    it('provides zsh installation instructions', () => {
      const instructions = generator.getInstallInstructions();
      expect(instructions).toContain('zshrc');
      expect(instructions).toContain('fpath');
    });
  });
});

describe('FishGenerator', () => {
  const generator = new FishGenerator();

  it('has correct shell property', () => {
    expect(generator.shell).toBe('fish');
  });

  describe('generate', () => {
    it('produces valid fish script', () => {
      const script = generateCompletions('fish');
      expect(script).toContain('complete -c speclife');
    });

    it('disables file completion by default', () => {
      const script = generateCompletions('fish');
      expect(script).toContain('complete -c speclife -f');
    });

    it('includes command descriptions', () => {
      const script = generateCompletions('fish');
      expect(script).toContain('-d "Initialize SpecLife');
    });

    it('uses __fish_use_subcommand for top-level', () => {
      const script = generateCompletions('fish');
      expect(script).toContain('__fish_use_subcommand');
    });

    it('uses __fish_seen_subcommand_from for subcommands', () => {
      const script = generateCompletions('fish');
      expect(script).toContain('__fish_seen_subcommand_from');
    });
  });

  describe('getInstallInstructions', () => {
    it('provides fish installation instructions', () => {
      const instructions = generator.getInstallInstructions();
      expect(instructions).toContain('fish');
      expect(instructions).toContain('completions');
    });
  });
});

describe('getInstallInstructions', () => {
  it('returns instructions for each shell', () => {
    for (const shell of getSupportedShells()) {
      const instructions = getInstallInstructions(shell);
      expect(instructions.length).toBeGreaterThan(0);
    }
  });
});
