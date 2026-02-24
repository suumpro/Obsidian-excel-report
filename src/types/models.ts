/**
 * Core data models for Excel Automation Plugin
 * Equivalent to Python dataclasses in parsers/markdown_parser.py
 * Enhanced in plugin-optimization-v3 with additional metadata fields
 */

import { Recurrence } from './parsing';

/**
 * Task status values
 */
export type TaskStatus = 'completed' | 'in_progress' | 'pending';

/**
 * Priority levels matching Obsidian task patterns
 */
export type Priority = 'P0' | 'P1' | 'P2';

/**
 * Feature status values (Korean and English)
 */
export type FeatureStatus = '진행중' | '대기' | '완료' | 'In Progress' | 'Pending' | 'Completed';

/**
 * Blocker priority levels
 */
export type BlockerPriority = '높음' | '중간' | '낮음' | 'High' | 'Medium' | 'Low';

/**
 * Blocker status with emoji indicators
 */
export type BlockerStatus = '🔄 진행중' | '⚠️ 미해결' | '✅ 해결' | 'In Progress' | 'Unresolved' | 'Resolved';

/**
 * Represents a task extracted from markdown
 * Pattern: - [ ] or - [x] task content
 *
 * Enhanced in v3 with:
 * - estimatedTime: Time estimates (⏱️ 2h or estimate:: 2 hours)
 * - recurrence: Repeating tasks (🔁 weekly or repeat:: weekly)
 * - context: Context tags (@work, @home)
 * - startDate: Scheduled start date
 * - completedDate: When task was marked done
 * - lineNumber: Source line for error reporting
 * - project: Project association from nested tags
 * - inlineFields: Dataview-style fields (field:: value)
 */
export interface Task {
  /** Task description (cleaned of emojis and metadata) */
  content: string;
  /** Task status: completed, in_progress, or pending */
  status: TaskStatus;
  /** Tags extracted from content (#tag-name) */
  tags: string[];
  /** Priority level (P0, P1, P2) extracted from emoji or tag */
  priority: Priority | null;
  /** Due date extracted from 📅 YYYY-MM-DD pattern */
  dueDate: Date | null;
  /** Task category */
  category: string | null;
  /** Task owner/assignee */
  owner: string | null;
  /** Original markdown line */
  rawLine: string;

  // ===== New fields added in v3 =====

  /** Estimated time to complete (e.g., "2h", "30m", "1d") */
  estimatedTime?: string;
  /** Recurrence configuration for repeating tasks */
  recurrence?: Recurrence;
  /** Context tag (e.g., "@work", "@home", "@phone") */
  context?: string;
  /** Scheduled start date */
  startDate?: Date;
  /** Date when task was completed */
  completedDate?: Date;
  /** Line number in source file (1-indexed) for error reporting */
  lineNumber?: number;
  /** Project name from nested tags (e.g., #project/subtask → "project") */
  project?: string;
  /** Dataview-style inline fields (field:: value) */
  inlineFields?: Record<string, string>;
  /** JIRA issue ID (e.g., SA-051) */
  jiraId?: string;
  /** Week number (e.g., 6 for W06) */
  weekNumber?: number;
  /** Quarter/priority tag (e.g., q1/p0) */
  quarterTag?: string;
  /** Area/feature tag (e.g., C2/스냅샷) */
  areaTag?: string;
}

/**
 * Represents a roadmap feature
 * Pattern: A1, A2, B1, B2, etc.
 */
export interface Feature {
  /** Feature ID (A1, B2, etc.) */
  id: string;
  /** Feature name */
  name: string;
  /** Priority level */
  priority: Priority;
  /** Current status */
  status: FeatureStatus;
  /** Start date string */
  startDate: string | null;
  /** Completion/target date string */
  completionDate: string | null;
  /** Progress percentage (0-100) */
  progress: number;
  /** Product cycle (C1, C2, C3) */
  cycle: string | null;
  /** Blocking issue reference */
  blocker: string | null;
}

/**
 * Represents a blocker item
 */
export interface Blocker {
  /** Blocker ID (B1, B2, etc.) */
  id: string;
  /** Blocker title */
  title: string;
  /** Priority level */
  priority: BlockerPriority;
  /** Current status */
  status: BlockerStatus;
  /** Owner/responsible party */
  owner: string;
  /** Target resolution date */
  targetDate: string;
  /** Impact scope description */
  impact: string;
  /** Additional details */
  description: string | null;
}

/**
 * Week information for reports
 */
export interface WeekInfo {
  weekNumber: number;
  year: number;
  formattedWeek: string;
  formattedDate: string;
}

/**
 * Quarter information for reports
 */
export interface QuarterInfo {
  quarter: number;
  year: number;
  formattedQuarter: string;
  formattedDate: string;
}
