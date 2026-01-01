/**
 * Claude SDK adapter for fully automated implementation
 * 
 * Uses the Anthropic SDK directly with tool-use for a fully automated
 * agentic loop that can read/write files and execute shell commands.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { execa } from 'execa';
import { type ProgressCallback } from '../types.js';

/** Tool definition for Claude SDK */
interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

/** Tool result from execution */
interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

/** Options for the agentic loop */
export interface AgenticLoopOptions {
  /** Working directory */
  cwd: string;
  /** Model to use */
  model: string;
  /** Maximum iterations for the agentic loop */
  maxIterations?: number;
  /** Maximum tokens per response */
  maxTokens?: number;
  /** Progress callback */
  onProgress?: ProgressCallback;
}

/** Result from the agentic loop */
export interface AgenticLoopResult {
  /** Whether the loop completed successfully */
  success: boolean;
  /** Number of iterations performed */
  iterations: number;
  /** Files that were modified */
  filesModified: string[];
  /** Final response from Claude */
  finalResponse: string;
  /** Any errors encountered */
  errors: string[];
}

/** Claude SDK adapter interface */
export interface ClaudeSdkAdapter {
  /** Check if API key is configured */
  isConfigured(): boolean;
  
  /** Run the agentic loop with tool-use */
  runAgenticLoop(
    systemPrompt: string,
    userPrompt: string,
    options: AgenticLoopOptions
  ): Promise<AgenticLoopResult>;
}

/**
 * Create a Claude SDK adapter
 */
export function createClaudeSdkAdapter(): ClaudeSdkAdapter {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  return {
    isConfigured(): boolean {
      return !!apiKey;
    },
    
    async runAgenticLoop(
      systemPrompt: string,
      userPrompt: string,
      options: AgenticLoopOptions
    ): Promise<AgenticLoopResult> {
      if (!apiKey) {
        return {
          success: false,
          iterations: 0,
          filesModified: [],
          finalResponse: '',
          errors: ['ANTHROPIC_API_KEY environment variable is not set'],
        };
      }
      
      const client = new Anthropic({ apiKey });
      const tools = buildToolDefinitions();
      const maxIterations = options.maxIterations ?? 50;
      const maxTokens = options.maxTokens ?? 4096;
      
      const messages: Anthropic.Messages.MessageParam[] = [
        { role: 'user', content: userPrompt },
      ];
      
      const filesModified: Set<string> = new Set();
      const errors: string[] = [];
      let iterations = 0;
      let finalResponse = '';
      
      while (iterations < maxIterations) {
        iterations++;
        
        options.onProgress?.({
          type: 'step_completed',
          message: `Agentic loop iteration ${iterations}`,
          data: { iteration: iterations },
        });
        
        try {
          const response = await client.messages.create({
            model: options.model,
            max_tokens: maxTokens,
            system: systemPrompt,
            tools: tools as Anthropic.Messages.Tool[],
            messages,
          });
          
          // Check if we're done (no more tool use)
          if (response.stop_reason === 'end_turn') {
            // Extract final text response
            for (const block of response.content) {
              if (block.type === 'text') {
                finalResponse = block.text;
              }
            }
            break;
          }
          
          // Process tool calls
          const assistantContent: Array<Anthropic.Messages.TextBlockParam | Anthropic.Messages.ToolUseBlockParam> = [];
          const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
          
          for (const block of response.content) {
            if (block.type === 'text') {
              assistantContent.push({ type: 'text', text: block.text });
            } else if (block.type === 'tool_use') {
              assistantContent.push({
                type: 'tool_use',
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              });
              
              // Execute the tool
              const result = await executeTool(
                block.name,
                block.input as Record<string, unknown>,
                options.cwd
              );
              
              // Track modified files
              if (block.name === 'write_file' && result.success) {
                const input = block.input as { path?: string };
                if (input.path) {
                  filesModified.add(input.path);
                }
              }
              
              if (!result.success && result.error) {
                errors.push(result.error);
              }
              
              options.onProgress?.({
                type: 'step_completed',
                message: `Tool ${block.name}: ${result.success ? 'success' : 'failed'}`,
                data: { tool: block.name, success: result.success },
              });
              
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result.output,
              });
            }
          }
          
          // Add assistant message
          messages.push({ role: 'assistant', content: assistantContent });
          
          // Add tool results
          if (toolResults.length > 0) {
            messages.push({ role: 'user', content: toolResults });
          }
          
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`API error: ${message}`);
          break;
        }
      }
      
      return {
        success: errors.length === 0,
        iterations,
        filesModified: Array.from(filesModified),
        finalResponse,
        errors,
      };
    },
  };
}

/**
 * Build tool definitions for the agentic loop
 */
function buildToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'read_file',
      description: 'Read the contents of a file at the given path',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path to read, relative to the working directory',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'write_file',
      description: 'Write content to a file at the given path. Creates directories if needed.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path to write, relative to the working directory',
          },
          content: {
            type: 'string',
            description: 'The content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'run_command',
      description: 'Run a shell command and return its output. Use for running tests, builds, etc.',
      input_schema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
        },
        required: ['command'],
      },
    },
    {
      name: 'list_directory',
      description: 'List files and directories at the given path',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The directory path to list, relative to the working directory',
          },
        },
        required: ['path'],
      },
    },
  ];
}

/**
 * Execute a tool and return the result
 */
async function executeTool(
  name: string,
  input: Record<string, unknown>,
  cwd: string
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'read_file': {
        const path = join(cwd, input.path as string);
        const content = await readFile(path, 'utf-8');
        return { success: true, output: content };
      }
      
      case 'write_file': {
        const path = join(cwd, input.path as string);
        const content = input.content as string;
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, 'utf-8');
        return { success: true, output: `File written: ${input.path}` };
      }
      
      case 'run_command': {
        const command = input.command as string;
        const result = await execa(command, {
          cwd,
          shell: true,
          reject: false,
        });
        const output = [
          `Exit code: ${result.exitCode}`,
          result.stdout ? `stdout:\n${result.stdout}` : '',
          result.stderr ? `stderr:\n${result.stderr}` : '',
        ].filter(Boolean).join('\n');
        return {
          success: result.exitCode === 0,
          output,
          error: result.exitCode !== 0 ? `Command failed with exit code ${result.exitCode}` : undefined,
        };
      }
      
      case 'list_directory': {
        const path = join(cwd, input.path as string);
        const { readdir } = await import('fs/promises');
        const entries = await readdir(path, { withFileTypes: true });
        const output = entries
          .map(e => `${e.isDirectory() ? 'd' : 'f'} ${e.name}`)
          .join('\n');
        return { success: true, output };
      }
      
      default:
        return {
          success: false,
          output: '',
          error: `Unknown tool: ${name}`,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: '',
      error: message,
    };
  }
}

/**
 * Generate system prompt for the agentic implementation loop
 */
export function generateAgenticSystemPrompt(): string {
  return `You are an expert software engineer implementing changes based on a proposal and task list.

Your capabilities:
- read_file: Read file contents
- write_file: Create or modify files
- run_command: Execute shell commands (tests, builds, etc.)
- list_directory: Explore the codebase structure

Guidelines:
1. Work through each uncompleted task systematically
2. Read relevant files before making changes
3. Make minimal, focused changes to complete each task
4. Run tests after making changes to verify correctness
5. If tests fail, analyze the output and fix the issues
6. Continue until all tasks are complete or you encounter a blocking issue

When you've completed all tasks or cannot proceed further, provide a summary of what was accomplished.`;
}

