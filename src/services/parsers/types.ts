/**
 * Shared types and constants for parsers
 */

import { Priority, TaskStatus } from '../../types/models';
import { ParsingConfig } from '../../types/config';

/**
 * Task filter options
 */
export interface TaskFilters {
  priority?: Priority;
  status?: TaskStatus;
  tags?: string[];
}

/**
 * Default parsing rules (used when no config provided)
 */
export const DEFAULT_PARSING_RULES: ParsingConfig = {
  task: {
    checkboxPattern: '- \\[([ xX])\\]',
    priorityIndicators: {
      p0: ['⏫', '#P0', '[P0]'],
      p1: ['🔼', '#P1', '[P1]'],
      p2: ['🔽', '#P2', '[P2]'],
    },
    statusIndicators: {
      completed: ['[x]', '✅', '완료', 'DONE'],
      pending: ['[ ]', '⬜', '대기', 'TODO'],
      inProgress: ['[/]', '🔄', '진행중', 'WIP'],
    },
    dueDatePatterns: ['📅\\s*(\\d{4}-\\d{2}-\\d{2})'],
    ownerPatterns: ['👤\\s*(\\w+)', '@(\\w+)'],
  },
  feature: {
    idPattern: '[AB]\\d+',
    fields: {
      status: ['status', '상태'],
      priority: ['priority', '우선순위'],
      cycle: ['cycle', '사이클'],
      owner: ['owner', '담당자'],
    },
    statusMapping: {
      completed: ['완료', 'Complete', 'Completed', 'Done'],
      inProgress: ['진행중', '진행', 'In Progress', 'WIP'],
      pending: ['대기', '계획', 'Pending', 'TODO'],
    },
  },
  blocker: {
    resolvedIndicators: ['✅', '해결', 'Resolved', 'Fixed'],
    unresolvedIndicators: ['⚠️', '미해결', 'Open', 'Unresolved'],
    inProgressIndicators: ['🔄', '진행중', 'In Progress'],
    prioritySections: {
      high: ['높음 우선순위', 'High Priority', 'P0'],
      medium: ['중간 우선순위', 'Medium Priority', 'P1'],
      low: ['낮음 우선순위', 'Low Priority', 'P2'],
    },
    impactPatterns: ['영향[:\\s]*(.*)', 'Impact[:\\s]*(.*)'],
  },
  table: {
    coordinationHeaders: ['구분', '협의', 'Category', 'Content'],
    milestoneHeaders: ['마일스톤', 'Milestone', '날짜', 'Date'],
    playbookHeaders: ['항목', 'Item', '목표', 'Target'],
    columnAliases: {
      category: ['구분', 'Category', '분류'],
      content: ['협의내용', 'Content', '내용'],
      priority: ['우선순위', 'Priority'],
      owner: ['담당자', 'Owner', '담당'],
      deadline: ['마감일', 'Deadline', '기한'],
      status: ['상태', 'Status'],
      date: ['날짜', 'Date', '일자'],
      name: ['이름', 'Name', '작업명'],
      target: ['목표', 'Target'],
      current: ['현재', 'Current'],
      percentage: ['진척률', 'Progress', '%'],
      risk: ['위험', 'Risk', '리스크'],
    },
  },
};

/**
 * Escape special regex characters
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
