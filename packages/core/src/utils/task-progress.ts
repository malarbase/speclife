/**
 * Task progress parsing utilities
 * Parses tasks.md files to extract completion status
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { ChangeProgress, ChangeTask } from '../types.js';

/** Regular expressions for parsing task files */
const TASK_REGEX = {
  /** Matches task line: "- [x] 1.1 Task description" or "- [ ] 1.2 Task description" */
  taskLine: /^[-*]\s*\[([ xX])\]\s*(\d+(?:\.\d+)?)\s+(.+)$/,
  /** Matches section header: "## 1. Section Name" */
  sectionHeader: /^##\s*(\d+)\.\s*(.+)$/,
  /** Matches simple checkbox: "- [x] Task" or "- [ ] Task" */
  simpleCheckbox: /^[-*]\s*\[([ xX])\]\s*(.+)$/,
};

/** Parsed task with additional metadata */
export interface ParsedTask extends ChangeTask {
  /** Section number (e.g., "1" from "## 1. Setup") */
  section?: string;
  /** Section name */
  sectionName?: string;
}

/** Result of parsing a tasks.md file */
export interface ParsedTaskFile {
  /** All parsed tasks */
  tasks: ParsedTask[];
  /** Progress summary */
  progress: ChangeProgress;
  /** Tasks grouped by section */
  sections: Map<string, ParsedTask[]>;
}

/**
 * Parse a single task line
 * @param line Line from tasks.md
 * @param currentSection Current section number
 * @param currentSectionName Current section name
 * @returns Parsed task or null if not a task line
 */
export function parseTaskLine(
  line: string,
  currentSection?: string,
  currentSectionName?: string
): ParsedTask | null {
  // Try to match numbered task format: "- [x] 1.1 Task description"
  const numberedMatch = line.match(TASK_REGEX.taskLine);
  if (numberedMatch) {
    const [, checkmark, id, content] = numberedMatch;
    return {
      id,
      content: content.trim(),
      completed: checkmark.toLowerCase() === 'x',
      section: currentSection,
      sectionName: currentSectionName,
    };
  }
  
  // Fall back to simple checkbox format: "- [x] Task description"
  const simpleMatch = line.match(TASK_REGEX.simpleCheckbox);
  if (simpleMatch) {
    const [, checkmark, content] = simpleMatch;
    // Generate an ID if in a section, otherwise use content hash
    const id = currentSection 
      ? `${currentSection}.${Math.random().toString(36).substring(2, 6)}`
      : content.substring(0, 20).toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    return {
      id,
      content: content.trim(),
      completed: checkmark.toLowerCase() === 'x',
      section: currentSection,
      sectionName: currentSectionName,
    };
  }
  
  return null;
}

/**
 * Parse a section header line
 * @param line Line from tasks.md
 * @returns Section info or null if not a header
 */
export function parseSectionHeader(line: string): { number: string; name: string } | null {
  const match = line.match(TASK_REGEX.sectionHeader);
  if (match) {
    return {
      number: match[1],
      name: match[2].trim(),
    };
  }
  return null;
}

/**
 * Parse tasks.md content into structured data
 * @param content Raw tasks.md content
 * @returns Parsed task file data
 */
export function parseTasksContent(content: string): ParsedTaskFile {
  const lines = content.split('\n');
  const tasks: ParsedTask[] = [];
  const sections = new Map<string, ParsedTask[]>();
  
  let currentSection: string | undefined;
  let currentSectionName: string | undefined;
  
  for (const line of lines) {
    // Check for section header
    const header = parseSectionHeader(line);
    if (header) {
      currentSection = header.number;
      currentSectionName = header.name;
      if (!sections.has(currentSection)) {
        sections.set(currentSection, []);
      }
      continue;
    }
    
    // Check for task line
    const task = parseTaskLine(line, currentSection, currentSectionName);
    if (task) {
      tasks.push(task);
      if (currentSection && sections.has(currentSection)) {
        sections.get(currentSection)!.push(task);
      }
    }
  }
  
  // Calculate progress
  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return {
    tasks,
    progress: { completed, total, percentage },
    sections,
  };
}

/**
 * Load and parse tasks.md from a change directory
 * @param projectRoot Project root path
 * @param specDir Spec directory name (e.g., "openspec")
 * @param changeId Change identifier
 * @returns Parsed task file data
 */
export async function loadTasksFile(
  projectRoot: string,
  specDir: string,
  changeId: string
): Promise<ParsedTaskFile> {
  const tasksPath = join(projectRoot, specDir, 'changes', changeId, 'tasks.md');
  
  try {
    const content = await readFile(tasksPath, 'utf-8');
    return parseTasksContent(content);
  } catch {
    // Return empty result if file doesn't exist
    return {
      tasks: [],
      progress: { completed: 0, total: 0, percentage: 0 },
      sections: new Map(),
    };
  }
}

/**
 * Get a summary of tasks by section
 * @param parsed Parsed task file
 * @returns Map of section name to progress
 */
export function getSectionProgress(parsed: ParsedTaskFile): Map<string, ChangeProgress> {
  const result = new Map<string, ChangeProgress>();
  
  for (const [sectionNum, tasks] of parsed.sections) {
    const sectionName = tasks[0]?.sectionName ?? `Section ${sectionNum}`;
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    result.set(sectionName, { completed, total, percentage });
  }
  
  return result;
}

/**
 * Find the next uncompleted task
 * @param parsed Parsed task file
 * @returns Next uncompleted task or undefined
 */
export function getNextTask(parsed: ParsedTaskFile): ParsedTask | undefined {
  return parsed.tasks.find(t => !t.completed);
}

/**
 * Get tasks by completion status
 * @param parsed Parsed task file
 * @param completed Whether to get completed or pending tasks
 * @returns Filtered tasks
 */
export function getTasksByStatus(
  parsed: ParsedTaskFile,
  completed: boolean
): ParsedTask[] {
  return parsed.tasks.filter(t => t.completed === completed);
}

