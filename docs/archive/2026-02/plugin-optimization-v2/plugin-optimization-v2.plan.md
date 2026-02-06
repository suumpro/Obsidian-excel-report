# Improvement Plan: Obsidian Excel Plugin Optimization v2

**Feature ID**: plugin-optimization-v2
**Created**: 2026-02-04
**Timeline**: 1 Week Sprint (Feb 4-11, 2026)
**Status**: Planning

---

## 1. Executive Summary

This plan outlines improvements to the Obsidian Excel Automation Plugin across four key areas: **Performance**, **Features**, **UX/UI**, and **Quality**. The plan incorporates legacy gaps (P1/P2) from the previous PDCA cycle while adding new enhancements.

### Sprint Goals
- Address all remaining P1 gaps from v1 cycle
- Improve report generation performance by 50%+
- Add user-requested features
- Establish testing foundation

---

## 2. Current State Assessment

### What's Working Well
| Component | Status | Notes |
|-----------|--------|-------|
| Weekly Report (7 sheets) | ✅ Stable | Full Lawson format |
| Quarterly Report (4 sheets) | ✅ Stable | With ChartBuilder |
| Feature Report (3 sheets) | ✅ Stable | With ChartBuilder |
| Blocker Report (2 sheets) | ✅ Stable | Basic implementation |
| ChartBuilder | ✅ Stable | 7 visualization methods |
| Settings UI | ✅ Stable | Comprehensive options |

### Legacy Gaps (From v1 Analysis)

| Gap ID | Title | Priority | Effort | Status |
|--------|-------|----------|--------|--------|
| GAP-004 | No Caching Layer | P1 | 4h | Open |
| GAP-005 | No Parallel Processing | P1 | 3h | Open |
| GAP-006 | Hardcoded Sample Data (Sheets 5-7) | P1 | 2h | Open |
| GAP-007 | No Unit Tests | P2 | 10h | Open (partial) |
| GAP-008 | Limited Error Handling | P2 | 4h | Open |

---

## 3. Improvement Areas

### 3.1 Performance (P1 Priority)

#### OPT-001: Implement Caching Layer
**Problem**: Every report generation parses all markdown files from scratch.
**Solution**: File-based cache with mtime tracking.

```typescript
// Target Architecture
class CacheManager {
  private cache: Map<string, CachedData>;

  get(filePath: string): CachedData | null;
  set(filePath: string, data: CachedData): void;
  invalidate(filePath: string): void;
  isStale(filePath: string): boolean;
}
```

**Expected Impact**: 60-70% faster on repeated generations
**Effort**: 4 hours

#### OPT-002: Parallel Data Loading
**Problem**: Sequential file loading creates bottleneck.
**Solution**: Use `Promise.all()` for independent data sources.

```typescript
// Current (Sequential)
const dashboard = await loadDashboardData();
const roadmap = await loadRoadmapData();
const blockers = await loadBlockerData();

// Optimized (Parallel)
const [dashboard, roadmap, blockers] = await Promise.all([
  loadDashboardData(),
  loadRoadmapData(),
  loadBlockerData()
]);
```

**Expected Impact**: 40-50% faster data loading
**Effort**: 3 hours

### 3.2 Features (P1-P2 Priority)

#### FEAT-001: Replace Hardcoded Data in Sheets 5-7
**Problem**: WeeklyReport sheets 5-7 use sample data instead of parsed data.
**Solution**: Parse actual coordination, milestone, and playbook data from markdown.

**Files Affected**:
- `src/reports/WeeklyReport.ts` (lines 285-350)
- `src/services/MarkdownParser.ts` (add new parsers)

**Effort**: 2 hours

#### FEAT-002: Custom Report Templates
**Problem**: Users can't customize report layouts.
**Solution**: Template system for report customization.

```typescript
interface ReportTemplate {
  name: string;
  sheets: SheetConfig[];
  styling: StylingConfig;
}
```

**Effort**: 6 hours (stretch goal)

#### FEAT-003: Export Format Options
**Problem**: Only XLSX export supported.
**Solution**: Add CSV and PDF export options.

**Effort**: 4 hours (stretch goal)

### 3.3 UX/UI (P2 Priority)

#### UX-001: Progress Notification Improvements
**Problem**: Generic "Generating report..." message during long operations.
**Solution**: Detailed progress with step indicators.

```typescript
// Current
showProgress('Generating weekly report...');

// Improved
showProgress('Loading data (1/4)...');
showProgress('Generating Sheet 1: Weekly Summary (2/4)...');
showProgress('Generating Sheet 2: Roadmap (3/4)...');
showProgress('Saving file (4/4)...');
```

**Effort**: 2 hours

#### UX-002: Report Preview Modal
**Problem**: Users can't preview before generating.
**Solution**: Modal showing report outline before generation.

**Effort**: 4 hours (stretch goal)

### 3.4 Quality (P2 Priority)

#### QUAL-001: Core Unit Tests
**Problem**: 0% test coverage, regression risk.
**Solution**: Test suite for critical paths.

**Test Targets** (Priority Order):
1. `MetricsCalculator` - Pure functions, easy to test
2. `MarkdownParser` - Input/output mapping
3. `DateUtils` - Time-sensitive logic
4. `DataAggregator` - Integration tests

**Minimum Coverage Target**: 40% for core services
**Effort**: 6 hours (scoped down from 10h)

#### QUAL-002: Improved Error Handling
**Problem**: Generic error messages, no graceful degradation.
**Solution**: Specific error types with recovery options.

```typescript
class ReportGenerationError extends Error {
  constructor(
    message: string,
    public readonly phase: 'loading' | 'generating' | 'saving',
    public readonly recoverable: boolean
  ) {
    super(message);
  }
}
```

**Effort**: 4 hours

---

## 4. Sprint Backlog

### Week 1 (Feb 4-11) - Prioritized Tasks

| Day | Task ID | Task | Priority | Effort | Owner |
|-----|---------|------|----------|--------|-------|
| 1-2 | OPT-001 | Implement CacheManager | P1 | 4h | Dev |
| 2 | OPT-002 | Parallel Data Loading | P1 | 3h | Dev |
| 3 | FEAT-001 | Replace Hardcoded Data | P1 | 2h | Dev |
| 3-4 | QUAL-002 | Error Handling | P2 | 4h | Dev |
| 4-5 | QUAL-001 | Core Unit Tests | P2 | 6h | Dev |
| 5 | UX-001 | Progress Notifications | P2 | 2h | Dev |

**Total Committed Hours**: 21 hours
**Buffer**: 3 hours (for debugging/integration)

### Stretch Goals (If Time Permits)
- FEAT-002: Custom Report Templates
- FEAT-003: Export Format Options
- UX-002: Report Preview Modal

---

## 5. Technical Design Notes

### 5.1 CacheManager Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CacheManager                       │
├─────────────────────────────────────────────────────┤
│  cache: Map<filePath, {data, mtime, parsedAt}>     │
├─────────────────────────────────────────────────────┤
│  + get(path): CachedData | null                     │
│  + set(path, data): void                            │
│  + isValid(path): boolean                           │
│  + invalidate(path): void                           │
│  + clear(): void                                    │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              DataAggregator (Modified)               │
├─────────────────────────────────────────────────────┤
│  - cacheManager: CacheManager                       │
│  + loadDashboardData(): check cache first           │
│  + loadRoadmapData(): check cache first             │
│  + loadBlockerData(): check cache first             │
└─────────────────────────────────────────────────────┘
```

### 5.2 Error Handling Strategy

```typescript
// Error hierarchy
BasePluginError
├── DataLoadError (file not found, parse error)
├── ReportGenerationError (sheet creation, styling)
├── FileWriteError (permission, disk space)
└── ValidationError (invalid settings, missing config)

// Recovery strategy
try {
  await generateReport();
} catch (error) {
  if (error instanceof DataLoadError && error.recoverable) {
    // Use fallback data
    await generateReportWithFallback();
  } else {
    // Show specific error with guidance
    showError(error.userMessage, error.guidance);
  }
}
```

### 5.3 Test Structure

```
tests/
├── unit/
│   ├── MetricsCalculator.test.ts
│   ├── MarkdownParser.test.ts
│   └── DateUtils.test.ts
├── integration/
│   └── DataAggregator.test.ts
└── fixtures/
    ├── sample-dashboard.md
    └── sample-roadmap.md
```

---

## 6. Success Criteria

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Report Gen Time | ~600ms | <300ms | Performance test |
| Test Coverage | 0% | 40% | Jest coverage |
| Error Specificity | Generic | Specific | Manual review |
| Hardcoded Data | 3 sheets | 0 sheets | Code review |
| Cache Hit Rate | N/A | >80% | Logging |

---

## 7. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Cache invalidation bugs | Medium | Medium | Thorough testing, conservative invalidation |
| Test setup complexity | Low | High | Use simple fixtures, mock Obsidian API |
| Time overrun | Medium | Medium | Focus on P1 first, defer stretch goals |

---

## 8. PDCA Cycle Plan

```
Week 1:
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│  PLAN  │ → │ DESIGN │ → │   DO   │ → │ CHECK  │
│  Day 1 │   │ Day 1  │   │Day 2-5 │   │ Day 5  │
└────────┘   └────────┘   └────────┘   └────────┘
                                            │
                                     If <90%│
                                            ▼
                                      ┌────────┐
                                      │  ACT   │
                                      │Day 5-6 │
                                      └────────┘
```

---

## 9. Next Steps

1. **Approve this plan** → `/pdca design plugin-optimization-v2`
2. **Create design document** with technical specifications
3. **Begin implementation** following sprint backlog
4. **Daily check-ins** on progress

---

**Document Version**: 1.0
**Author**: Claude (PDCA Planner)
**Approved By**: (Pending)
