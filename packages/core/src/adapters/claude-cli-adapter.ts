/**
 * Claude CLI adapter for implementation
 * 
 * Uses the Claude CLI which supports MCP servers natively.
 * This is the primary/recommended implementation mode.
 */

import { execa } from 'execa';

/** Options for running Claude CLI */
export interface ClaudeCliOptions {
  /** Working directory for the CLI */
  cwd: string;
  /** Model to use (optional, uses CLI default if not specified) */
  model?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Whether to print to stdout/stderr */
  print?: boolean;
}

/** Result from Claude CLI execution */
export interface ClaudeCliResult {
  /** Exit code from the process */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Whether execution was successful */
  success: boolean;
}

/** Claude CLI adapter interface */
export interface ClaudeCliAdapter {
  /** Check if Claude CLI is available */
  isAvailable(): Promise<boolean>;
  
  /** Get Claude CLI version */
  getVersion(): Promise<string | null>;
  
  /** Run Claude CLI with a prompt */
  run(prompt: string, options: ClaudeCliOptions): Promise<ClaudeCliResult>;
  
  /** Run Claude CLI with streaming output */
  runStreaming(
    prompt: string,
    options: ClaudeCliOptions,
    onOutput?: (chunk: string) => void
  ): Promise<ClaudeCliResult>;
}

/**
 * Create a Claude CLI adapter
 */
export function createClaudeCliAdapter(): ClaudeCliAdapter {
  return {
    async isAvailable(): Promise<boolean> {
      try {
        await execa('claude', ['--version']);
        return true;
      } catch {
        return false;
      }
    },
    
    async getVersion(): Promise<string | null> {
      try {
        const result = await execa('claude', ['--version']);
        return result.stdout.trim();
      } catch {
        return null;
      }
    },
    
    async run(prompt: string, options: ClaudeCliOptions): Promise<ClaudeCliResult> {
      const args = buildArgs(options);
      
      try {
        const result = await execa('claude', args, {
          cwd: options.cwd,
          input: prompt,
          reject: false,
        });
        
        const exitCode = result.exitCode ?? 1;
        return {
          exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          success: exitCode === 0,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          exitCode: 1,
          stdout: '',
          stderr: message,
          success: false,
        };
      }
    },
    
    async runStreaming(
      prompt: string,
      options: ClaudeCliOptions,
      onOutput?: (chunk: string) => void
    ): Promise<ClaudeCliResult> {
      const args = buildArgs(options);
      
      try {
        const subprocess = execa('claude', args, {
          cwd: options.cwd,
          input: prompt,
          reject: false,
        });
        
        // Stream stdout if callback provided
        if (onOutput && subprocess.stdout) {
          subprocess.stdout.on('data', (chunk: Buffer) => {
            onOutput(chunk.toString());
          });
        }
        
        // Also optionally stream stderr
        if (onOutput && subprocess.stderr) {
          subprocess.stderr.on('data', (chunk: Buffer) => {
            onOutput(chunk.toString());
          });
        }
        
        const result = await subprocess;
        
        const exitCode = result.exitCode ?? 1;
        return {
          exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          success: exitCode === 0,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          exitCode: 1,
          stdout: '',
          stderr: message,
          success: false,
        };
      }
    },
  };
}

/**
 * Build CLI arguments from options
 */
function buildArgs(options: ClaudeCliOptions): string[] {
  const args: string[] = [];
  
  // Use print mode for non-interactive execution
  args.push('--print');
  
  if (options.model) {
    args.push('--model', options.model);
  }
  
  if (options.maxTokens) {
    args.push('--max-tokens', String(options.maxTokens));
  }
  
  return args;
}

/**
 * Generate an implementation prompt for Claude CLI
 */
export function generateImplementationPrompt(context: {
  changeId: string;
  proposal: string;
  tasks: string;
  design?: string;
  contextFiles?: Array<{ path: string; content: string }>;
}): string {
  const sections: string[] = [];
  
  sections.push(`# Implementation Request: ${context.changeId}`);
  sections.push('');
  sections.push('You are implementing a change based on the following proposal and tasks.');
  sections.push('Please implement each uncompleted task, writing code and running tests as needed.');
  sections.push('');
  
  sections.push('## Proposal');
  sections.push('```markdown');
  sections.push(context.proposal);
  sections.push('```');
  sections.push('');
  
  sections.push('## Tasks');
  sections.push('```markdown');
  sections.push(context.tasks);
  sections.push('```');
  sections.push('');
  
  if (context.design) {
    sections.push('## Design');
    sections.push('```markdown');
    sections.push(context.design);
    sections.push('```');
    sections.push('');
  }
  
  if (context.contextFiles && context.contextFiles.length > 0) {
    sections.push('## Context Files');
    for (const file of context.contextFiles) {
      sections.push(`### ${file.path}`);
      sections.push('```');
      sections.push(file.content);
      sections.push('```');
      sections.push('');
    }
  }
  
  sections.push('## Instructions');
  sections.push('');
  sections.push('1. Work through each uncompleted task (marked with `[ ]`)');
  sections.push('2. Write the necessary code changes');
  sections.push('3. Run tests to verify your changes work');
  sections.push('4. If tests fail, analyze the failure and fix the code');
  sections.push('5. Continue until all tasks are complete or you encounter a blocking issue');
  sections.push('');
  sections.push('Begin implementation now.');
  
  return sections.join('\n');
}

/**
 * Generate a version analysis prompt for Claude CLI
 */
export function generateVersionAnalysisPrompt(context: {
  changeId: string;
  proposal: string;
  diff: string;
}): string {
  const sections: string[] = [];
  
  sections.push('# Version Bump Analysis');
  sections.push('');
  sections.push('Analyze the following change and determine the appropriate semantic version bump.');
  sections.push('');
  
  sections.push('## Change Proposal');
  sections.push('```markdown');
  sections.push(context.proposal);
  sections.push('```');
  sections.push('');
  
  sections.push('## Code Changes (Diff)');
  sections.push('```diff');
  sections.push(context.diff);
  sections.push('```');
  sections.push('');
  
  sections.push('## Semantic Versioning Guidelines');
  sections.push('');
  sections.push('- **major**: Breaking changes that require users to update their code');
  sections.push('  - Removed or renamed public APIs, types, or exports');
  sections.push('  - Changed function signatures or behavior in incompatible ways');
  sections.push('  - Removed support for previously supported features');
  sections.push('');
  sections.push('- **minor**: New features that are backwards compatible');
  sections.push('  - New exports, functions, types, or options');
  sections.push('  - New optional parameters with defaults');
  sections.push('  - Additive changes that don\'t break existing code');
  sections.push('');
  sections.push('- **patch**: Bug fixes and internal changes');
  sections.push('  - Bug fixes that don\'t change the API');
  sections.push('  - Documentation updates');
  sections.push('  - Internal refactoring without API changes');
  sections.push('  - Dependency updates');
  sections.push('  - Performance improvements');
  sections.push('');
  
  sections.push('## Instructions');
  sections.push('');
  sections.push('Respond with ONLY a JSON object (no markdown code fences, no explanation outside the JSON):');
  sections.push('');
  sections.push('{');
  sections.push('  "bump": "patch" | "minor" | "major",');
  sections.push('  "reasoning": "Brief explanation of why this bump type is appropriate"');
  sections.push('}');
  
  return sections.join('\n');
}

/**
 * Parse version analysis response from Claude
 */
export function parseVersionAnalysisResponse(response: string): { bump: 'patch' | 'minor' | 'major'; reasoning: string } | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*"bump"[\s\S]*"reasoning"[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!['patch', 'minor', 'major'].includes(parsed.bump)) {
      return null;
    }
    
    return {
      bump: parsed.bump as 'patch' | 'minor' | 'major',
      reasoning: String(parsed.reasoning || 'No reasoning provided'),
    };
  } catch {
    return null;
  }
}

