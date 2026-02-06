/**
 * BaseReport - Abstract base class for all report generators
 * v2.0 - Reduces code duplication by providing common locale handling
 */

import { ExcelGenerator } from '../generators/ExcelGenerator';
import { ConfigManager } from '../services/ConfigManager';
import { ExcelAutomationSettings } from '../types/settings';
import { LocaleStrings } from '../types/config';

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
    this.localeStrings = configManager?.getLocaleStrings() || this.getDefaultLocaleStrings();
  }

  /**
   * Default locale strings for backward compatibility
   * Returns Korean defaults when no ConfigManager is provided
   */
  protected getDefaultLocaleStrings(): LocaleStrings {
    return {
      reports: {
        weekly: '주간 리포트',
        quarterly: '분기 리포트',
        feature: '피처 리포트',
        blocker: '블로커 리포트',
      },
      sheets: {
        weeklySummary: '주간현황',
        roadmapProgress: '로드맵진척',
        taskDetails: '작업상세',
        blockerTracking: '블로커추적',
        coordination: '협의사항',
        milestones: '마일스톤',
        playbookProgress: '플레이북진척',
        quarterlyOverview: '분기 개요',
        p0Tasks: 'P0 작업',
        p1Tasks: 'P1 작업',
        progressAnalytics: '진척 분석',
        allFeatures: '전체 피처',
        byPriority: '우선순위별',
        byCycle: '사이클별',
        activeBlockers: '활성 블로커',
        blockerHistory: '블로커 이력',
      },
      columns: {
        id: 'ID',
        name: '작업명',
        owner: '담당자',
        status: '상태',
        deadline: '마감일',
        priority: '우선순위',
        description: '설명',
        category: '구분',
        content: '협의내용',
        target: '목표',
        current: '현재',
        percentage: '진척률',
        risk: '위험',
        date: '날짜',
        cycle: '사이클',
        impact: '영향',
        resolution: '해결책',
        quarter: '분기',
        week: '주차',
      },
      kpi: {
        totalTasks: '전체 작업',
        completed: '완료',
        p0CompletionRate: 'P0 완료율',
        blockers: '블로커',
        activeBlockers: '활성 블로커',
        resolvedBlockers: '해결된 블로커',
        totalFeatures: '전체 피처',
        inProgress: '진행중',
        pending: '대기',
      },
      status: {
        completed: '완료',
        inProgress: '진행중',
        pending: '대기',
        resolved: '해결',
        unresolved: '미해결',
      },
      priority: {
        p0: 'P0',
        p1: 'P1',
        p2: 'P2',
        high: '높음',
        medium: '중간',
        low: '낮음',
      },
      ui: {
        generateReport: '리포트 생성',
        settings: '설정',
        language: '언어',
        parsingRules: '파싱 규칙',
        reportSchema: '리포트 스키마',
        presets: '프리셋',
        importExport: '가져오기/내보내기',
        reset: '초기화',
        save: '저장',
        cancel: '취소',
        apply: '적용',
      },
      messages: {
        reportGenerated: '리포트가 생성되었습니다',
        reportFailed: '리포트 생성 실패',
        settingsSaved: '설정이 저장되었습니다',
        presetApplied: '프리셋이 적용되었습니다',
        validationError: '유효성 검사 오류',
        loading: '로딩중...',
        noData: '데이터가 없습니다',
      },
    };
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
