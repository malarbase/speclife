/**
 * Tests for task progress parsing utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  parseTaskLine,
  parseSectionHeader,
  parseTasksContent,
  loadTasksFile,
  getSectionProgress,
  getNextTask,
  getTasksByStatus,
} from '../../src/utils/task-progress.js';

describe('parseTaskLine', () => {
  it('parses numbered task line', () => {
    const task = parseTaskLine('- [x] 1.1 Add feature');
    
    expect(task).not.toBeNull();
    expect(task!.id).toBe('1.1');
    expect(task!.content).toBe('Add feature');
    expect(task!.completed).toBe(true);
  });
  
  it('parses unchecked task', () => {
    const task = parseTaskLine('- [ ] 2.3 Fix bug');
    
    expect(task).not.toBeNull();
    expect(task!.id).toBe('2.3');
    expect(task!.content).toBe('Fix bug');
    expect(task!.completed).toBe(false);
  });
  
  it('handles uppercase X', () => {
    const task = parseTaskLine('- [X] 1.2 Task');
    expect(task!.completed).toBe(true);
  });
  
  it('handles asterisk bullets', () => {
    const task = parseTaskLine('* [x] 3.1 Another task');
    expect(task!.id).toBe('3.1');
    expect(task!.completed).toBe(true);
  });
  
  it('includes section info when provided', () => {
    const task = parseTaskLine('- [x] 1.1 Task', '1', 'Setup');
    
    expect(task!.section).toBe('1');
    expect(task!.sectionName).toBe('Setup');
  });
  
  it('returns null for non-task lines', () => {
    expect(parseTaskLine('# Header')).toBeNull();
    expect(parseTaskLine('Regular text')).toBeNull();
    expect(parseTaskLine('')).toBeNull();
  });
  
  it('parses simple checkbox without number', () => {
    const task = parseTaskLine('- [x] Simple task');
    
    expect(task).not.toBeNull();
    expect(task!.content).toBe('Simple task');
    expect(task!.completed).toBe(true);
  });
});

describe('parseSectionHeader', () => {
  it('parses section header', () => {
    const section = parseSectionHeader('## 1. Setup');
    
    expect(section).not.toBeNull();
    expect(section!.number).toBe('1');
    expect(section!.name).toBe('Setup');
  });
  
  it('handles multi-word names', () => {
    const section = parseSectionHeader('## 3. Global Configuration System');
    
    expect(section!.number).toBe('3');
    expect(section!.name).toBe('Global Configuration System');
  });
  
  it('returns null for non-headers', () => {
    expect(parseSectionHeader('# Title')).toBeNull();
    expect(parseSectionHeader('Regular line')).toBeNull();
    expect(parseSectionHeader('### 1. Not a section')).toBeNull();
  });
});

describe('parseTasksContent', () => {
  it('parses full tasks.md content', () => {
    const content = `# Tasks

## 1. Setup

- [x] 1.1 Install dependencies
- [x] 1.2 Configure build

## 2. Implementation

- [x] 2.1 Create module
- [ ] 2.2 Add tests
- [ ] 2.3 Write docs
`;
    
    const result = parseTasksContent(content);
    
    expect(result.tasks).toHaveLength(5);
    expect(result.progress.completed).toBe(3);
    expect(result.progress.total).toBe(5);
    expect(result.progress.percentage).toBe(60);
  });
  
  it('groups tasks by section', () => {
    const content = `# Tasks

## 1. Setup

- [x] 1.1 Task A
- [x] 1.2 Task B

## 2. Build

- [ ] 2.1 Task C
`;
    
    const result = parseTasksContent(content);
    
    expect(result.sections.size).toBe(2);
    expect(result.sections.get('1')?.length).toBe(2);
    expect(result.sections.get('2')?.length).toBe(1);
  });
  
  it('handles empty content', () => {
    const result = parseTasksContent('');
    
    expect(result.tasks).toHaveLength(0);
    expect(result.progress.percentage).toBe(0);
  });
  
  it('handles content with no tasks', () => {
    const content = `# Notes

Just some text here.

## Ideas

More text.
`;
    
    const result = parseTasksContent(content);
    expect(result.tasks).toHaveLength(0);
  });
});

describe('loadTasksFile', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'speclife-tasks-test-'));
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  it('loads and parses tasks.md', async () => {
    await mkdir(join(tempDir, 'openspec', 'changes', 'my-change'), { recursive: true });
    await writeFile(
      join(tempDir, 'openspec', 'changes', 'my-change', 'tasks.md'),
      `## 1. Setup
- [x] 1.1 Done
- [ ] 1.2 Pending
`
    );
    
    const result = await loadTasksFile(tempDir, 'openspec', 'my-change');
    
    expect(result.tasks).toHaveLength(2);
    expect(result.progress.completed).toBe(1);
    expect(result.progress.percentage).toBe(50);
  });
  
  it('returns empty result for missing file', async () => {
    const result = await loadTasksFile(tempDir, 'openspec', 'nonexistent');
    
    expect(result.tasks).toHaveLength(0);
    expect(result.progress.total).toBe(0);
  });
});

describe('getSectionProgress', () => {
  it('returns progress for each section', () => {
    const content = `## 1. Setup
- [x] 1.1 Done
- [x] 1.2 Done

## 2. Build
- [x] 2.1 Done
- [ ] 2.2 Pending
- [ ] 2.3 Pending
`;
    
    const parsed = parseTasksContent(content);
    const progress = getSectionProgress(parsed);
    
    const setup = progress.get('Setup');
    expect(setup?.completed).toBe(2);
    expect(setup?.total).toBe(2);
    expect(setup?.percentage).toBe(100);
    
    const build = progress.get('Build');
    expect(build?.completed).toBe(1);
    expect(build?.total).toBe(3);
    expect(build?.percentage).toBe(33);
  });
});

describe('getNextTask', () => {
  it('returns first uncompleted task', () => {
    const content = `## 1. Tasks
- [x] 1.1 Done
- [ ] 1.2 Next
- [ ] 1.3 Later
`;
    
    const parsed = parseTasksContent(content);
    const next = getNextTask(parsed);
    
    expect(next?.id).toBe('1.2');
    expect(next?.content).toBe('Next');
  });
  
  it('returns undefined when all complete', () => {
    const content = `## 1. Tasks
- [x] 1.1 Done
- [x] 1.2 Also done
`;
    
    const parsed = parseTasksContent(content);
    expect(getNextTask(parsed)).toBeUndefined();
  });
  
  it('returns undefined for empty tasks', () => {
    const parsed = parseTasksContent('');
    expect(getNextTask(parsed)).toBeUndefined();
  });
});

describe('getTasksByStatus', () => {
  const content = `## 1. Tasks
- [x] 1.1 Done A
- [ ] 1.2 Pending B
- [x] 1.3 Done C
- [ ] 1.4 Pending D
`;
  
  it('returns completed tasks', () => {
    const parsed = parseTasksContent(content);
    const completed = getTasksByStatus(parsed, true);
    
    expect(completed).toHaveLength(2);
    expect(completed.map(t => t.id)).toEqual(['1.1', '1.3']);
  });
  
  it('returns pending tasks', () => {
    const parsed = parseTasksContent(content);
    const pending = getTasksByStatus(parsed, false);
    
    expect(pending).toHaveLength(2);
    expect(pending.map(t => t.id)).toEqual(['1.2', '1.4']);
  });
});

