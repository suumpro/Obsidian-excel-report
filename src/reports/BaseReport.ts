/**
 * BaseReport - Abstract base class for all report generators
 * v2.0 - Reduces code duplication by providing common locale handling
 */

import { ExcelGenerator } from '../generators/ExcelGenerator';
import { ConfigManager } from '../services/ConfigManager';
import { ExcelAutomationSettings } from '../types/settings';
import { LocaleStrings } from '../types/config';
import { getDefaultLocaleStrings } from '../config/presets';

/**
 * Abstract base class for report generators
 * Provides common locale string handling and default fallbacks
 */
export abstract class BaseReport extends ExcelGenerator {
  protected localeStrings: LocaleStrings;

  constructor(
    settings: ExcelAutomationSettings,
    configManager?: ConfigManager
  ) {
    super(settings, configManager);
    this.localeStrings = configManager?.getLocaleStrings() || getDefaultLocaleStrings();
  }

  /**
   * Abstract method that each report generator must implement
   */
  abstract generate(...args: unknown[]): Promise<ArrayBuffer>;

  /**
   * Helper to check if a status matches "completed" in any supported language
   */
  protected isStatusCompleted(status: string): boolean {
    return status === this.localeStrings.status.completed ||
      status === '완료' ||
      status === 'Completed' ||
      status === 'Done';
  }

  /**
   * Helper to check if a status matches "in progress" in any supported language
   */
  protected isStatusInProgress(status: string): boolean {
    return status === this.localeStrings.status.inProgress ||
      status === '진행중' ||
      status === 'In Progress' ||
      status === 'Working';
  }

  /**
   * Helper to check if a status matches "pending" in any supported language
   */
  protected isStatusPending(status: string): boolean {
    return status === this.localeStrings.status.pending ||
      status === '대기' ||
      status === 'Pending' ||
      status === 'Waiting';
  }

  /**
   * Helper to check if a status matches "resolved" in any supported language
   */
  protected isStatusResolved(status: string): boolean {
    return status.includes(this.localeStrings.status.resolved) ||
      status.includes('해결') ||
      status.includes('Resolved') ||
      status.includes('✅');
  }

  /**
   * Helper to check if priority is "high" in any supported language
   */
  protected isHighPriority(priority: string): boolean {
    return priority === this.localeStrings.priority.high ||
      priority === '높음' ||
      priority === 'High' ||
      priority === 'P0';
  }

  /**
   * Map blocker/feature priority to P0/P1/P2 for styling
   */
  protected mapPriorityToStyle(priority: string): string {
    const p = this.localeStrings.priority;
    if (priority === p.high || priority === '높음' || priority === 'High' || priority === 'P0') return 'P0';
    if (priority === p.medium || priority === '중간' || priority === 'Medium' || priority === 'P1') return 'P1';
    return 'P2';
  }

  /**
   * Get localized status string for completed/incomplete items
   */
  protected getStatusString(isCompleted: boolean): string {
    return isCompleted ? this.localeStrings.status.completed : this.localeStrings.status.inProgress;
  }
}
