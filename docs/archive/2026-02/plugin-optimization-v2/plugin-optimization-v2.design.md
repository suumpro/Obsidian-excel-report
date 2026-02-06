# Technical Design: Obsidian Excel Plugin Optimization v2

**Feature ID**: plugin-optimization-v2
**Plan Reference**: docs/01-plan/features/plugin-optimization-v2.plan.md
**Created**: 2026-02-04
**Status**: Design Phase

---

## 1. Design Overview

This document provides technical specifications for implementing the v2 optimization plan. All designs maintain backward compatibility with existing functionality.

### Scope Summary

| Component | Type | Priority | New Files | Modified Files |
|-----------|------|----------|-----------|----------------|
| CacheManager | Performance | P1 | 1 | 1 |
| Parallel Loading | Performance | P1 | 0 | 1 |
| Dynamic Sheet Data | Feature | P1 | 0 | 2 |
| Error Handling | Quality | P2 | 1 | 4 |
| Unit Tests | Quality | P2 | 5 | 0 |
| Progress Notifications | UX | P2 | 0 | 2 |

---

## 2. Architecture Changes

### 2.1 Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Plugin (main.ts)                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
   ┌───────────┐       ┌───────────┐       ┌───────────┐
   │ Weekly    │       │ Quarterly │       │ Feature   │
   │ Report    │       │ Report    │       │ Report    │
   └─────┬─────┘       └─────┬─────┘       └─────┬─────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────┴────────┐
                    │  DataAggregator │  ← No caching
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │ MarkdownParser  │
                    └─────────────────┘
```

### 2.2 Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Plugin (main.ts)                        │
│                   + ProgressReporter                         │
└─────────────────────────────┬───────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
   ┌───────────┐       ┌───────────┐       ┌───────────┐
   │ Weekly    │       │ Quarterly │       │ Feature   │
   │ Report    │       │ Report    │       │ Report    │
   └─────┬─────┘       └─────┬─────┘       └─────┬─────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │       DataAggregator        │
              │  + CacheManager injection   │
              │  + Parallel loading         │
              └──────────────┬──────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
   ┌───────────┐      ┌───────────┐      ┌───────────┐
   │  Cache    │      │ Markdown  │      │  Error    │
   │  Manager  │      │  Parser   │      │  Handler  │
   └───────────┘      └───────────┘      └───────────┘
```

---

## 3. Component Designs

### 3.1 CacheManager (OPT-001)

**File**: `src/services/CacheManager.ts`

#### Interface Definition

```typescript
/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  mtime: number;        // File modification time
  cachedAt: number;     // When cached
  hits: number;         // Access count for debugging
}

/**
 * Cache manager for parsed markdown data
 */
export class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxEntries: number = 50;
  private maxAge: number = 5 * 60 * 1000; // 5 minutes default

  constructor(options?: { maxEntries?: number; maxAge?: number });

  /**
   * Get cached data if valid
   * @returns cached data or null if stale/missing
   */
  get<T>(key: string, currentMtime: number): T | null;

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T, mtime: number): void;

  /**
   * Check if cache entry is valid
   */
  isValid(key: string, currentMtime: number): boolean;

  /**
   * Invalidate specific entry
   */
  invalidate(key: string): void;

  /**
   * Clear all cache entries
   */
  clear(): void;

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate: number; entries: string[] };
}
```

#### Implementation Details

```typescript
// Cache key format
const cacheKey = `${fileType}:${normalizedPath}`;
// Example: "dashboard:/path/to/PM Dashboard.md"

// Validation logic
isValid(key: string, currentMtime: number): boolean {
  const entry = this.cache.get(key);
  if (!entry) return false;

  // Check file modification time
  if (entry.mtime !== currentMtime) {
    this.invalidate(key);
    return false;
  }

  // Check cache age
  if (Date.now() - entry.cachedAt > this.maxAge) {
    this.invalidate(key);
    return false;
  }

  return true;
}

// LRU eviction when exceeding maxEntries
private evictOldest(): void {
  if (this.cache.size < this.maxEntries) return;

  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of this.cache.entries()) {
    if (entry.cachedAt < oldestTime) {
      oldestTime = entry.cachedAt;
      oldestKey = key;
    }
  }

  if (oldestKey) this.cache.delete(oldestKey);
}
```

#### Integration with DataAggregator

```typescript
// Modified DataAggregator constructor
constructor(
  private app: App,
  private settings: ExcelAutomationSettings,
  private cacheManager?: CacheManager  // Optional DI
) {
  this.vault = new VaultService(app);
  this.parser = new MarkdownParser();
  this.cacheManager = cacheManager || new CacheManager();
}

// Modified loadDashboardData
async loadDashboardData(): Promise<DashboardData> {
  const path = this.getFullPath(this.settings.sources.dashboard);
  const cacheKey = `dashboard:${path}`;

  // Try cache first
  const stat = await this.vault.getFileStat(path);
  if (stat && this.cacheManager) {
    const cached = this.cacheManager.get<DashboardData>(cacheKey, stat.mtime);
    if (cached) {
      logger.debug(`Cache hit for dashboard: ${path}`);
      return cached;
    }
  }

  // Parse and cache
  const data = await this.parseDashboardFile(path);
  if (stat && this.cacheManager) {
    this.cacheManager.set(cacheKey, data, stat.mtime);
  }

  return data;
}
```

---

### 3.2 Parallel Data Loading (OPT-002)

**File**: `src/services/DataAggregator.ts` (modification)

#### Current Sequential Loading

```typescript
// WeeklyReport.generate() - CURRENT
const dashboard = await this.aggregator.loadDashboardData();
const roadmap = await this.aggregator.loadRoadmapData();
const blockers = await this.aggregator.loadBlockerData();
const q1Data = await this.aggregator.loadQuarterlyData(1);
```

#### Optimized Parallel Loading

```typescript
// WeeklyReport.generate() - OPTIMIZED
const [dashboard, roadmap, blockers, q1Data] = await Promise.all([
  this.aggregator.loadDashboardData(),
  this.aggregator.loadRoadmapData(),
  this.aggregator.loadBlockerData(),
  this.aggregator.loadQuarterlyData(1)
]);
```

**Note**: `DataAggregator.loadAllData()` already uses `Promise.all()`. The optimization is to ensure all report generators use it consistently.

#### Files to Update

| File | Current | Change |
|------|---------|--------|
| `src/reports/WeeklyReport.ts` | Sequential | Use `Promise.all()` |
| `src/reports/QuarterlyReport.ts` | Sequential | Use `Promise.all()` |
| `src/reports/FeatureReport.ts` | Single load | Already optimal |
| `src/reports/BlockerReport.ts` | Dual load | Use `Promise.all()` |

---

### 3.3 Dynamic Sheet Data (FEAT-001)

**Files**:
- `src/reports/WeeklyReport.ts` (modification)
- `src/services/MarkdownParser.ts` (new methods)
- `src/types/data.ts` (new interfaces)

#### New Data Types

```typescript
// src/types/data.ts

export interface CoordinationItem {
  category: string;       // 긴급확인, 데이터, 시스템
  content: string;        // 협의 내용
  priority: string;       // 높음, 중간, 낮음
  owner: string;          // 담당자
  deadline: string;       // 기한
  status: string;         // 대기, 협의중, 완료
}

export interface MilestoneItem {
  date: string;           // 날짜
  name: string;           // 마일스톤명
  target: string;         // 목표
  status: string;         // 상태
  risk: string;           // 리스크 레벨
}

export interface PlaybookItem {
  name: string;           // 항목명
  target: number;         // 목표 수량
  current: number;        // 현재 수량
  percentage: number;     // 비율
  status: string;         // 상태
}

export interface ExtendedDashboardData extends DashboardData {
  coordination: CoordinationItem[];
  milestones: MilestoneItem[];
  playbook: PlaybookItem[];
}
```

#### New Parser Methods

```typescript
// src/services/MarkdownParser.ts

/**
 * Parse coordination table from markdown
 * Looks for table with headers: 구분, 협의 내용, 우선순위, 담당, 기한, 상태
 */
parseCoordination(content: string): CoordinationItem[] {
  const tableRegex = /\|[^|]*구분[^|]*\|[^|]*협의[^|]*\|/i;
  // ... parse table rows
  return items;
}

/**
 * Parse milestones table from markdown
 * Looks for table with headers: 날짜, 마일스톤, 목표, 상태, 리스크
 */
parseMilestones(content: string): MilestoneItem[] {
  const tableRegex = /\|[^|]*날짜[^|]*\|[^|]*마일스톤[^|]*\|/i;
  // ... parse table rows
  return items;
}

/**
 * Parse playbook progress from markdown
 * Looks for table with headers: 항목, 목표, 현재, 비율, 상태
 */
parsePlaybook(content: string): PlaybookItem[] {
  const tableRegex = /\|[^|]*항목[^|]*\|[^|]*목표[^|]*\|/i;
  // ... parse table rows
  return items;
}
```

#### Modified WeeklyReport Methods

```typescript
// src/reports/WeeklyReport.ts

// Sheet 5: Modified to use parsed data
private createSheet5LawsonCoordination(data: ExtendedDashboardData): void {
  const ws = this.addSheet('Lawson협의');
  const headers = ['구분', '협의 내용', '우선순위', '담당', '기한', '상태'];

  // Use parsed data instead of hardcoded
  const tableData = data.coordination.length > 0
    ? data.coordination.map(c => [c.category, c.content, c.priority, c.owner, c.deadline, c.status])
    : this.getDefaultCoordinationData(); // Fallback

  this.addTable(ws, headers, tableData, 1, 1, { alternateColors: true });
  this.setSheetProperties(ws);
}

// Sheet 6: Modified to use parsed data
private createSheet6Milestones(data: ExtendedDashboardData): void {
  const ws = this.addSheet('마일스톤');
  const headers = ['날짜', '마일스톤', '목표', '상태', '리스크'];

  const tableData = data.milestones.length > 0
    ? data.milestones.map(m => [m.date, m.name, m.target, m.status, m.risk])
    : this.getDefaultMilestoneData(); // Fallback

  this.addTable(ws, headers, tableData, 1, 1, { alternateColors: true });
  this.setSheetProperties(ws);
}

// Sheet 7: Modified to use parsed data
private createSheet7PlaybookProgress(data: ExtendedDashboardData): void {
  const ws = this.addSheet('플레이북진척');
  // ... use data.playbook instead of hardcoded progressItems
}
```

---

### 3.4 Error Handling System (QUAL-002)

**File**: `src/errors/PluginErrors.ts` (new)

#### Error Class Hierarchy

```typescript
/**
 * Base error for all plugin errors
 */
export abstract class PluginError extends Error {
  abstract readonly code: string;
  abstract readonly userMessage: string;
  abstract readonly recoverable: boolean;
  readonly timestamp: Date = new Date();

  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Error loading data from vault
 */
export class DataLoadError extends PluginError {
  readonly code = 'DATA_LOAD_ERROR';
  readonly recoverable = true;

  constructor(
    public readonly filePath: string,
    public readonly reason: 'not_found' | 'parse_error' | 'permission',
    cause?: Error
  ) {
    super(`Failed to load data from ${filePath}: ${reason}`, cause);
  }

  get userMessage(): string {
    switch (this.reason) {
      case 'not_found':
        return `파일을 찾을 수 없습니다: ${this.filePath}`;
      case 'parse_error':
        return `파일 파싱 오류: ${this.filePath}`;
      case 'permission':
        return `파일 접근 권한이 없습니다: ${this.filePath}`;
    }
  }
}

/**
 * Error generating report
 */
export class ReportGenerationError extends PluginError {
  readonly code = 'REPORT_GEN_ERROR';
  readonly recoverable = false;

  constructor(
    public readonly reportType: string,
    public readonly phase: 'init' | 'sheet' | 'style' | 'buffer',
    public readonly sheetName?: string,
    cause?: Error
  ) {
    super(`Report generation failed at ${phase}${sheetName ? `: ${sheetName}` : ''}`, cause);
  }

  get userMessage(): string {
    return `리포트 생성 중 오류가 발생했습니다 (${this.phase})`;
  }
}

/**
 * Error writing file to vault
 */
export class FileWriteError extends PluginError {
  readonly code = 'FILE_WRITE_ERROR';
  readonly recoverable = false;

  constructor(
    public readonly filePath: string,
    public readonly reason: 'permission' | 'disk_full' | 'invalid_path',
    cause?: Error
  ) {
    super(`Failed to write file ${filePath}: ${reason}`, cause);
  }

  get userMessage(): string {
    switch (this.reason) {
      case 'permission':
        return `파일 저장 권한이 없습니다`;
      case 'disk_full':
        return `디스크 공간이 부족합니다`;
      case 'invalid_path':
        return `잘못된 저장 경로입니다`;
    }
  }
}

/**
 * Error in settings/configuration
 */
export class ValidationError extends PluginError {
  readonly code = 'VALIDATION_ERROR';
  readonly recoverable = true;

  constructor(
    public readonly field: string,
    public readonly reason: string
  ) {
    super(`Validation failed for ${field}: ${reason}`);
  }

  get userMessage(): string {
    return `설정 오류: ${this.field} - ${this.reason}`;
  }
}
```

#### Error Handler Utility

```typescript
// src/errors/errorHandler.ts

import { Notice } from 'obsidian';
import { PluginError, DataLoadError } from './PluginErrors';
import { logger } from '../utils/logger';

/**
 * Handle plugin errors with appropriate user feedback
 */
export function handleError(error: unknown, context?: string): void {
  if (error instanceof PluginError) {
    logger.error(`[${error.code}] ${error.message}`, error.cause);

    new Notice(error.userMessage, 5000);

    if (error.recoverable) {
      logger.info(`Error is recoverable, attempting fallback...`);
    }
  } else if (error instanceof Error) {
    logger.error(`Unexpected error${context ? ` in ${context}` : ''}: ${error.message}`);
    new Notice(`오류가 발생했습니다: ${error.message}`, 5000);
  } else {
    logger.error(`Unknown error: ${String(error)}`);
    new Notice('알 수 없는 오류가 발생했습니다', 5000);
  }
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T> {
  return fn().catch(error => {
    handleError(error, context);
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  });
}
```

---

### 3.5 Progress Notifications (UX-001)

**File**: `src/utils/progress.ts` (new)

```typescript
import { Notice } from 'obsidian';

export interface ProgressStep {
  label: string;
  weight?: number;  // For weighted progress
}

export class ProgressReporter {
  private notice: Notice | null = null;
  private steps: ProgressStep[];
  private currentStep: number = 0;
  private startTime: number = 0;

  constructor(steps: ProgressStep[]) {
    this.steps = steps;
  }

  start(): void {
    this.startTime = Date.now();
    this.currentStep = 0;
    this.updateNotice();
  }

  nextStep(): void {
    this.currentStep++;
    if (this.currentStep < this.steps.length) {
      this.updateNotice();
    }
  }

  complete(message?: string): void {
    const elapsed = Date.now() - this.startTime;
    this.notice?.hide();
    new Notice(message || `완료! (${elapsed}ms)`, 3000);
  }

  error(message: string): void {
    this.notice?.hide();
    new Notice(`오류: ${message}`, 5000);
  }

  private updateNotice(): void {
    const step = this.steps[this.currentStep];
    const progress = `(${this.currentStep + 1}/${this.steps.length})`;
    const message = `${step.label} ${progress}`;

    if (this.notice) {
      this.notice.setMessage(message);
    } else {
      this.notice = new Notice(message, 0);
    }
  }
}

// Pre-defined step sets for common operations
export const WEEKLY_REPORT_STEPS: ProgressStep[] = [
  { label: '데이터 로딩 중...' },
  { label: 'Sheet 1: 주간현황 생성 중...' },
  { label: 'Sheet 2: 로드맵진척 생성 중...' },
  { label: 'Sheet 3: Q1작업상세 생성 중...' },
  { label: 'Sheet 4: 블로커추적 생성 중...' },
  { label: 'Sheet 5-7: 추가 시트 생성 중...' },
  { label: '파일 저장 중...' },
];

export const QUARTERLY_REPORT_STEPS: ProgressStep[] = [
  { label: '데이터 로딩 중...' },
  { label: 'Sheet 1: Overview 생성 중...' },
  { label: 'Sheet 2: P0 Tasks 생성 중...' },
  { label: 'Sheet 3: P1 Tasks 생성 중...' },
  { label: 'Sheet 4: Analytics 생성 중...' },
  { label: '파일 저장 중...' },
];
```

#### Integration Example

```typescript
// src/main.ts

async generateWeeklyReport() {
  const progress = new ProgressReporter(WEEKLY_REPORT_STEPS);
  progress.start();

  try {
    // Step 1: Load data
    const aggregator = new DataAggregator(this.app, this.settings);
    const generator = new WeeklyReportGenerator(this.app, this.settings, aggregator);

    progress.nextStep();

    // Steps 2-6: Generate sheets (handled internally with callbacks)
    const buffer = await generator.generate(weekInfo, (step) => progress.nextStep());

    progress.nextStep();

    // Step 7: Save file
    await this.vaultService.createBinaryFile(outputPath, buffer);

    progress.complete(`주간 리포트 생성 완료: ${filename}`);
  } catch (error) {
    progress.error((error as Error).message);
    throw error;
  }
}
```

---

### 3.6 Unit Test Structure (QUAL-001)

**Directory**: `tests/`

#### Test Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/utils/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/tests/mocks/obsidian.ts',
  },
};
```

#### Obsidian Mock

```typescript
// tests/mocks/obsidian.ts
export class App {
  vault = {
    adapter: {
      read: jest.fn(),
      write: jest.fn(),
      exists: jest.fn(),
      stat: jest.fn(),
    },
  };
}

export class Notice {
  constructor(message: string, timeout?: number) {}
  setMessage(message: string) {}
  hide() {}
}

export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
```

#### Test Files

```typescript
// tests/unit/MetricsCalculator.test.ts
import { MetricsCalculator } from '../../src/services/MetricsCalculator';

describe('MetricsCalculator', () => {
  describe('calculateQuarterlyMetrics', () => {
    it('should calculate completion rate correctly', () => {
      const data = {
        p0Tasks: [{ status: true }, { status: false }],
        p1Tasks: [{ status: true }],
        p2Tasks: [],
      };
      const metrics = MetricsCalculator.calculateQuarterlyMetrics(data);
      expect(metrics.completionRate).toBe(66.67);
    });

    it('should handle empty data', () => {
      const data = { p0Tasks: [], p1Tasks: [], p2Tasks: [] };
      const metrics = MetricsCalculator.calculateQuarterlyMetrics(data);
      expect(metrics.totalTasks).toBe(0);
      expect(metrics.completionRate).toBe(0);
    });
  });

  describe('getProgressBar', () => {
    it('should generate correct progress bar', () => {
      const bar = MetricsCalculator.getProgressBar(5, 10, 10);
      expect(bar).toBe('█████░░░░░');
    });
  });
});
```

```typescript
// tests/unit/DateUtils.test.ts
import { getCurrentWeekInfo, formatDate, isOverdue } from '../../src/utils/dateUtils';

describe('DateUtils', () => {
  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2026-02-04');
      expect(formatDate(date)).toBe('2026-02-04');
    });

    it('should format date with custom format', () => {
      const date = new Date('2026-02-04');
      expect(formatDate(date, 'MM/DD')).toBe('02/04');
    });
  });

  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(isOverdue(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(isOverdue(futureDate)).toBe(false);
    });
  });
});
```

```typescript
// tests/unit/MarkdownParser.test.ts
import { MarkdownParser } from '../../src/services/MarkdownParser';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('extractTasks', () => {
    it('should extract checkbox tasks', () => {
      const content = `
- [x] Completed task #P0
- [ ] Pending task #P1
      `;
      const tasks = parser.extractTasks(content);
      expect(tasks).toHaveLength(2);
      expect(tasks[0].status).toBe(true);
      expect(tasks[1].status).toBe(false);
    });

    it('should extract priority from tags', () => {
      const content = '- [ ] Task with priority #P0';
      const tasks = parser.extractTasks(content);
      expect(tasks[0].priority).toBe('P0');
    });
  });

  describe('parseCoordination', () => {
    it('should parse coordination table', () => {
      const content = `
| 구분 | 협의 내용 | 우선순위 | 담당 | 기한 | 상태 |
|------|----------|---------|------|------|------|
| 데이터 | API 연동 | 높음 | Dev | Q1 | 대기 |
      `;
      const items = parser.parseCoordination(content);
      expect(items).toHaveLength(1);
      expect(items[0].category).toBe('데이터');
    });
  });
});
```

---

## 4. Implementation Order

### Phase 1: Core Infrastructure (Day 1-2)

```
1. CacheManager
   └── Create src/services/CacheManager.ts
   └── Add tests: tests/unit/CacheManager.test.ts
   └── Integrate with DataAggregator

2. Error Handling
   └── Create src/errors/PluginErrors.ts
   └── Create src/errors/errorHandler.ts
   └── Update error handling in main.ts
```

### Phase 2: Performance (Day 2-3)

```
3. Parallel Loading
   └── Update WeeklyReport.ts
   └── Update QuarterlyReport.ts
   └── Update BlockerReport.ts

4. Cache Integration Testing
   └── Verify cache hits with logging
   └── Measure performance improvement
```

### Phase 3: Features (Day 3-4)

```
5. Dynamic Sheet Data
   └── Add types to data.ts
   └── Add parser methods to MarkdownParser.ts
   └── Update WeeklyReport sheets 5-7
   └── Add fallback for missing data
```

### Phase 4: Quality & UX (Day 4-5)

```
6. Unit Tests
   └── MetricsCalculator.test.ts
   └── DateUtils.test.ts
   └── MarkdownParser.test.ts
   └── CacheManager.test.ts

7. Progress Notifications
   └── Create src/utils/progress.ts
   └── Integrate with main.ts report methods
```

---

## 5. File Change Summary

### New Files (6)

| File | Purpose | Lines (est.) |
|------|---------|--------------|
| `src/services/CacheManager.ts` | Caching service | ~120 |
| `src/errors/PluginErrors.ts` | Error classes | ~150 |
| `src/errors/errorHandler.ts` | Error utilities | ~50 |
| `src/utils/progress.ts` | Progress reporter | ~80 |
| `tests/unit/MetricsCalculator.test.ts` | Unit tests | ~100 |
| `tests/unit/MarkdownParser.test.ts` | Unit tests | ~150 |

### Modified Files (6)

| File | Changes |
|------|---------|
| `src/services/DataAggregator.ts` | Add cache integration |
| `src/services/MarkdownParser.ts` | Add coordination/milestone/playbook parsers |
| `src/types/data.ts` | Add new interfaces |
| `src/reports/WeeklyReport.ts` | Dynamic sheets 5-7, parallel loading |
| `src/main.ts` | Progress reporter integration |
| `package.json` | Add jest dependencies |

---

## 6. Testing Strategy

### Unit Tests (40% coverage target)

| Module | Priority | Test Count |
|--------|----------|------------|
| MetricsCalculator | High | 10+ |
| DateUtils | High | 8+ |
| MarkdownParser | High | 15+ |
| CacheManager | High | 8+ |

### Manual Tests

| Scenario | Expected Result |
|----------|-----------------|
| Generate with empty vault | Graceful fallback with message |
| Generate with cache hit | <100ms second generation |
| File permission error | Specific error message shown |
| Missing source file | Report generates with empty section |

---

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cache hit rate | >80% | Logging in CacheManager |
| Generation time (cached) | <300ms | Performance test |
| Test coverage | 40% | Jest coverage report |
| Error specificity | 100% PluginError | Code review |
| Hardcoded data | 0 sheets | Code review |

---

**Document Version**: 1.0
**Author**: Claude (PDCA Designer)
**Next Step**: `/pdca do plugin-optimization-v2`
