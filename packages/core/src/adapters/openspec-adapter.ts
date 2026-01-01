/**
 * OpenSpec adapter for spec file operations
 */

import { readFile, writeFile, mkdir, readdir, rename, access } from 'fs/promises';
import { join } from 'path';
import { type Change, type ChangeProposal, type ChangeTask, SpecLifeError, ErrorCodes } from '../types.js';

/** OpenSpec operations interface */
export interface OpenSpecAdapter {
  /** Scaffold a new change with proposal and tasks */
  scaffoldChange(changeId: string, options?: { description?: string }): Promise<{
    proposalPath: string;
    tasksPath: string;
  }>;
  
  /** Read a change's full context */
  readChange(changeId: string): Promise<Change>;
  
  /** Read raw proposal.md content */
  readProposal(changeId: string): Promise<string>;
  
  /** List all active changes (excluding archive) */
  listChanges(): Promise<string[]>;
  
  /** Check if a change exists */
  changeExists(changeId: string): Promise<boolean>;
  
  /** Archive a completed change */
  archiveChange(changeId: string): Promise<void>;
  
  /** Update tasks.md with completed tasks */
  updateTasks(changeId: string, tasks: ChangeTask[]): Promise<void>;
}

interface OpenSpecAdapterOptions {
  /** Project root directory */
  projectRoot: string;
  /** OpenSpec directory name (default: "openspec") */
  specDir?: string;
}

/**
 * Create an OpenSpec adapter
 */
export function createOpenSpecAdapter(options: OpenSpecAdapterOptions): OpenSpecAdapter {
  const { projectRoot, specDir = 'openspec' } = options;
  const changesDir = join(projectRoot, specDir, 'changes');
  
  return {
    async scaffoldChange(changeId: string, opts = {}): Promise<{ proposalPath: string; tasksPath: string }> {
      const changeDir = join(changesDir, changeId);
      
      // Check if already exists
      if (await fileExists(changeDir)) {
        throw new SpecLifeError(
          ErrorCodes.CHANGE_EXISTS,
          `Change '${changeId}' already exists`,
          { changeId, path: changeDir }
        );
      }
      
      // Create directory
      await mkdir(changeDir, { recursive: true });
      
      // Generate proposal content
      const proposalContent = generateProposal(changeId, opts.description);
      const proposalPath = join(changeDir, 'proposal.md');
      await writeFile(proposalPath, proposalContent, 'utf-8');
      
      // Generate tasks content
      const tasksContent = generateTasks();
      const tasksPath = join(changeDir, 'tasks.md');
      await writeFile(tasksPath, tasksContent, 'utf-8');
      
      return { proposalPath, tasksPath };
    },
    
    async readChange(changeId: string): Promise<Change> {
      const changeDir = join(changesDir, changeId);
      
      if (!await fileExists(changeDir)) {
        throw new SpecLifeError(
          ErrorCodes.CHANGE_NOT_FOUND,
          `Change '${changeId}' not found`,
          { changeId }
        );
      }
      
      // Read proposal
      const proposalPath = join(changeDir, 'proposal.md');
      const proposalContent = await readFile(proposalPath, 'utf-8');
      const proposal = parseProposal(proposalContent);
      
      // Read tasks
      const tasksPath = join(changeDir, 'tasks.md');
      const tasksContent = await readFile(tasksPath, 'utf-8');
      const tasks = parseTasks(tasksContent);
      
      // Read design (optional)
      let design: string | undefined;
      const designPath = join(changeDir, 'design.md');
      if (await fileExists(designPath)) {
        design = await readFile(designPath, 'utf-8');
      }
      
      return {
        id: changeId,
        branch: `spec/${changeId}`,
        state: 'created', // TODO: Detect actual state
        proposal,
        tasks,
        design,
        createdAt: new Date(), // TODO: Get from git or file stat
      };
    },
    
    async readProposal(changeId: string): Promise<string> {
      const proposalPath = join(changesDir, changeId, 'proposal.md');
      
      if (!await fileExists(proposalPath)) {
        throw new SpecLifeError(
          ErrorCodes.CHANGE_NOT_FOUND,
          `Proposal for change '${changeId}' not found`,
          { changeId }
        );
      }
      
      return readFile(proposalPath, 'utf-8');
    },
    
    async listChanges(): Promise<string[]> {
      if (!await fileExists(changesDir)) {
        return [];
      }
      
      const entries = await readdir(changesDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && e.name !== 'archive')
        .map(e => e.name);
    },
    
    async changeExists(changeId: string): Promise<boolean> {
      const changeDir = join(changesDir, changeId);
      return fileExists(changeDir);
    },
    
    async archiveChange(changeId: string): Promise<void> {
      const changeDir = join(changesDir, changeId);
      const archiveDir = join(changesDir, 'archive');
      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const archivePath = join(archiveDir, `${date}-${changeId}`);
      
      await mkdir(archiveDir, { recursive: true });
      await rename(changeDir, archivePath);
    },
    
    async updateTasks(changeId: string, tasks: ChangeTask[]): Promise<void> {
      const tasksPath = join(changesDir, changeId, 'tasks.md');
      const content = formatTasks(tasks);
      await writeFile(tasksPath, content, 'utf-8');
    },
  };
}

// Helper functions

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function generateProposal(_changeId: string, description?: string): string {
  return `## Why
${description ?? '[Describe the problem or opportunity]'}

## What Changes
- [List the changes to be made]

## Impact
- Affected specs: [list capabilities]
- Affected code: [key files/systems]
`;
}

function generateTasks(): string {
  return `## 1. Implementation
- [ ] 1.1 [First task]
- [ ] 1.2 [Second task]

## 2. Testing
- [ ] 2.1 Add unit tests
- [ ] 2.2 Add integration tests
`;
}

function parseProposal(content: string): ChangeProposal {
  // Simple parsing - extract sections
  const whyMatch = content.match(/## Why\n([\s\S]*?)(?=\n## |$)/);
  const whatMatch = content.match(/## What Changes\n([\s\S]*?)(?=\n## |$)/);
  const impactMatch = content.match(/## Impact\n([\s\S]*?)(?=\n## |$)/);
  
  const why = whyMatch?.[1]?.trim() ?? '';
  const whatChanges = (whatMatch?.[1] ?? '')
    .split('\n')
    .filter(line => line.startsWith('-'))
    .map(line => line.slice(1).trim());
  
  const impactSection = impactMatch?.[1] ?? '';
  const affectedSpecs = extractListItems(impactSection, 'Affected specs:');
  const affectedCode = extractListItems(impactSection, 'Affected code:');
  
  return {
    why,
    whatChanges,
    impact: { affectedSpecs, affectedCode },
  };
}

function extractListItems(content: string, prefix: string): string[] {
  const match = content.match(new RegExp(`${prefix}\\s*(.+?)(?=\\n|$)`));
  if (!match) return [];
  return match[1].split(',').map(s => s.trim()).filter(Boolean);
}

function parseTasks(content: string): ChangeTask[] {
  const tasks: ChangeTask[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^- \[([ x])\] (\d+\.\d+)\s+(.+)$/);
    if (match) {
      tasks.push({
        id: match[2],
        content: match[3],
        completed: match[1] === 'x',
      });
    }
  }
  
  return tasks;
}

function formatTasks(tasks: ChangeTask[]): string {
  // Group by section (1.x, 2.x, etc.)
  const sections = new Map<string, ChangeTask[]>();
  
  for (const task of tasks) {
    const section = task.id.split('.')[0];
    if (!sections.has(section)) {
      sections.set(section, []);
    }
    sections.get(section)!.push(task);
  }
  
  let content = '';
  for (const [section, sectionTasks] of sections) {
    content += `## ${section}. Tasks\n`;
    for (const task of sectionTasks) {
      const checkbox = task.completed ? '[x]' : '[ ]';
      content += `- ${checkbox} ${task.id} ${task.content}\n`;
    }
    content += '\n';
  }
  
  return content.trim() + '\n';
}

