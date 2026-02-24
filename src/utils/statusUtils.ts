/**
 * Status matching utilities for multi-language support
 * Replaces hardcoded Korean status comparisons throughout the codebase
 */

const COMPLETED_PATTERNS = ['완료', 'Completed', 'Complete', 'Done', 'Shipped', 'Released', 'Closed', '完了', '✅'];
const IN_PROGRESS_PATTERNS = ['진행중', '진행', 'In Progress', 'WIP', 'Active', 'Working', 'Started', '進行中', '🔄'];
const PENDING_PATTERNS = ['대기', 'Pending', 'TODO', 'Planned', 'Backlog', 'Not Started', 'Open', '未着手', '⬜'];
const RESOLVED_PATTERNS = ['해결', 'Resolved', 'Fixed', 'Closed', '解決済み', '✅'];
const SCHEDULED_PATTERNS = ['예정', 'Scheduled', 'Planned', '予定', '📅'];
const BLOCKER_PATTERNS = ['블로커', 'Blocker', 'Blocking', 'ブロッカー', '⚠️'];

function matchesAny(value: string, patterns: string[]): boolean {
  const lower = value.toLowerCase();
  return patterns.some(p => lower.includes(p.toLowerCase()));
}

export function isCompleted(status: string): boolean {
  return matchesAny(status, COMPLETED_PATTERNS);
}

export function isInProgress(status: string): boolean {
  return matchesAny(status, IN_PROGRESS_PATTERNS);
}

export function isPending(status: string): boolean {
  return matchesAny(status, PENDING_PATTERNS);
}

export function isResolved(status: string): boolean {
  return matchesAny(status, RESOLVED_PATTERNS);
}

export function isScheduled(status: string): boolean {
  return matchesAny(status, SCHEDULED_PATTERNS);
}

export function isBlocker(status: string): boolean {
  return matchesAny(status, BLOCKER_PATTERNS);
}

// Priority matching utilities
const HIGH_PRIORITY_PATTERNS = ['P0', '높음', 'High', '高', 'Critical'];
const MEDIUM_PRIORITY_PATTERNS = ['P1', '중간', 'Medium', '中', 'Normal'];
const LOW_PRIORITY_PATTERNS = ['P2', '낮음', 'Low', '低', 'Minor'];

export function isHighPriority(priority: string): boolean {
  return matchesAny(priority, HIGH_PRIORITY_PATTERNS);
}

export function isMediumPriority(priority: string): boolean {
  return matchesAny(priority, MEDIUM_PRIORITY_PATTERNS);
}

export function isLowPriority(priority: string): boolean {
  return matchesAny(priority, LOW_PRIORITY_PATTERNS);
}

