# Plan: Plugin Optimization v3

**Feature ID**: plugin-optimization-v3
**Created**: 2026-02-05
**Status**: Draft
**Priority**: P0

---

## 1. Problem Statement

The current Obsidian Excel Automation plugin needs optimization in several key areas based on user feedback:

### Current Limitations

| Category | Issue | Impact |
|----------|-------|--------|
| **Parsing Speed** | Sequential regex execution for each task | Slower than necessary even for small files |
| **Task Detection** | Limited metadata extraction accuracy | Missed priorities, dates, or owners |
| **Error Handling** | Silent failures, no validation feedback | Users unaware of parsing issues |
| **Missing Features** | No executive summary dashboard | Stakeholders need quick overview |

### User Requirements (Collected)

- **Data Volume**: Small files (< 50 tasks) - focus on accuracy over extreme performance
- **Task Format**: Standard checkboxes (`- [ ] Task #tag @owner 📅 date`)
- **Priority Areas**:
  1. Parsing Speed
  2. Better Task Detection
  3. New Features
  4. Error Handling
- **New Features**: Executive Summary Dashboard sheet

---

## 2. Goals

### Primary Goals

1. **Faster Parsing**: Cache compiled regexes, optimize pattern matching
2. **Better Detection**: Improve priority, date, and owner extraction accuracy
3. **Error Feedback**: Add validation with clear error messages
4. **Executive Summary**: Add single-page dashboard sheet to reports

### Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Task parsing accuracy | ~90% | 99%+ |
| Regex compilation | Per-use | Cached |
| Error visibility | Silent | User notifications |
| Report types | 4 | 4 + Executive Summary |

---

## 3. Proposed Solution

### 3.1 Parsing Speed Optimization

```
Current Flow:
Task Line → Create Regex → Match → Create Regex → Match → ...

Optimized Flow:
Plugin Load → Pre-compile All Regexes → Cache
Task Line → Use Cached Regex → Match (fast)
```

**Implementation**:
- Add `RegexCache` class to pre-compile patterns on plugin load
- Reuse compiled RegExp objects across all parsing calls
- Expected: 20-30% faster parsing

### 3.2 Better Task Detection

**Enhanced Patterns**:

| Metadata | Current Patterns | Enhanced Patterns |
|----------|-----------------|-------------------|
| Priority | `⏫`, `🔼`, `🔽`, `#P0` | + `[!]`, `!!`, `(P0)`, inline `priority::` |
| Due Date | `📅 YYYY-MM-DD` | + `due::`, `@due()`, natural dates |
| Owner | `👤 name`, `@name` | + `assignee::`, `owner::` |
| Tags | `#tag` | + nested tags `#project/subtag` |

**New Extractions**:
- Estimated time: `⏱️ 2h` or `estimate:: 2 hours`
- Recurrence: `🔁 weekly` or `repeat:: weekly`
- Context: `@context` (home, work, etc.)

### 3.3 Error Handling & Validation

**New Error System**:

```typescript
interface ParseResult<T> {
  data: T;
  errors: ParseError[];
  warnings: ParseWarning[];
}

interface ParseError {
  type: 'invalid_regex' | 'malformed_date' | 'missing_file';
  message: string;
  line?: number;
  suggestion?: string;
}
```

**User Feedback**:
- Show Notice on parsing errors with suggestions
- Add "Validation Report" in debug mode
- Log warnings for potentially misformatted tasks

### 3.4 Executive Summary Dashboard

**New Sheet**: Added as Sheet 1 in Weekly Report

| Section | Content |
|---------|---------|
| Header | Report title, date range, generated timestamp |
| KPI Row | 4 large KPI boxes (Tasks, Completed, Blockers, Features) |
| Progress Ring | Visual completion percentage |
| Priority Breakdown | P0/P1/P2 task counts with colors |
| Top 5 Blockers | Critical blockers requiring attention |
| Upcoming Deadlines | Tasks due in next 7 days |
| Team Workload | Tasks per owner (if available) |

---

## 4. Implementation Phases

### Phase 1: Regex Caching (Priority: P0)

| Task | Description | Files |
|------|-------------|-------|
| OPT-001 | Create RegexCache utility class | `src/utils/RegexCache.ts` |
| OPT-002 | Integrate cache into MarkdownParser | `src/services/MarkdownParser.ts` |
| OPT-003 | Pre-compile patterns on plugin load | `src/main.ts` |

### Phase 2: Enhanced Task Detection (Priority: P0)

| Task | Description | Files |
|------|-------------|-------|
| DET-001 | Add new priority patterns | `src/services/MarkdownParser.ts` |
| DET-002 | Add Dataview-style field support | `src/services/MarkdownParser.ts` |
| DET-003 | Improve date parsing (natural dates) | `src/utils/dateUtils.ts` |
| DET-004 | Add estimated time extraction | `src/services/MarkdownParser.ts` |
| DET-005 | Update config types for new patterns | `src/types/config.ts` |

### Phase 3: Error Handling (Priority: P1)

| Task | Description | Files |
|------|-------------|-------|
| ERR-001 | Create ParseResult wrapper type | `src/types/parsing.ts` |
| ERR-002 | Add validation in MarkdownParser | `src/services/MarkdownParser.ts` |
| ERR-003 | Show user-friendly error notices | `src/utils/logger.ts` |
| ERR-004 | Add config validation | `src/services/ConfigManager.ts` |

### Phase 4: Executive Summary Sheet (Priority: P1)

| Task | Description | Files |
|------|-------------|-------|
| SUM-001 | Create ExecutiveSummary sheet generator | `src/reports/WeeklyReport.ts` |
| SUM-002 | Add KPI visualization components | `src/generators/ChartBuilder.ts` |
| SUM-003 | Add upcoming deadlines section | `src/reports/WeeklyReport.ts` |
| SUM-004 | Add team workload section | `src/reports/WeeklyReport.ts` |

### Phase 5: Testing & Validation (Priority: P0)

| Task | Description | Files |
|------|-------------|-------|
| TST-001 | Add unit tests for RegexCache | `tests/RegexCache.test.ts` |
| TST-002 | Add parsing accuracy tests | `tests/MarkdownParser.test.ts` |
| TST-003 | Add error handling tests | `tests/validation.test.ts` |
| TST-004 | Integration test for new features | `tests/integration.test.ts` |

---

## 5. Technical Details

### 5.1 RegexCache Implementation

```typescript
class RegexCache {
  private cache: Map<string, RegExp> = new Map();

  compile(pattern: string, flags?: string): RegExp | null {
    const key = `${pattern}:${flags || ''}`;
    if (!this.cache.has(key)) {
      try {
        this.cache.set(key, new RegExp(pattern, flags));
      } catch (e) {
        console.error(`Invalid regex: ${pattern}`);
        return null;
      }
    }
    return this.cache.get(key)!;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### 5.2 Enhanced Task Interface

```typescript
interface Task {
  // Existing
  content: string;
  status: boolean;
  priority: Priority;
  dueDate?: Date;
  owner?: string;
  tags: string[];

  // New fields
  estimatedTime?: string;      // "2h", "30m"
  recurrence?: string;         // "weekly", "daily"
  context?: string;            // "@work", "@home"
  startDate?: Date;            // For scheduled tasks
  completedDate?: Date;        // When marked done

  // Metadata
  lineNumber?: number;         // For error reporting
  rawLine: string;
}
```

### 5.3 Executive Summary Layout

```
┌─────────────────────────────────────────────────────────┐
│                  EXECUTIVE SUMMARY                       │
│                Week 6, 2026 (Feb 3 - Feb 9)             │
├─────────────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐               │
│  │  42  │  │  28  │  │   3  │  │  12  │               │
│  │Tasks │  │ Done │  │Block │  │ Feat │               │
│  └──────┘  └──────┘  └──────┘  └──────┘               │
├─────────────────────────────────────────────────────────┤
│  COMPLETION: [████████████░░░░] 67%                    │
├─────────────────────────────────────────────────────────┤
│  PRIORITY BREAKDOWN          │  TOP BLOCKERS           │
│  P0: ██░░░░ 5 (2 done)      │  1. API Rate Limit      │
│  P1: ████░░ 15 (10 done)    │  2. DB Migration        │
│  P2: ██████ 22 (16 done)    │  3. Auth Service        │
├─────────────────────────────────────────────────────────┤
│  UPCOMING DEADLINES (7 days) │  TEAM WORKLOAD          │
│  • Fix login bug (Feb 6)     │  Alice: 8 tasks         │
│  • API refactor (Feb 8)      │  Bob: 6 tasks           │
│  • Design review (Feb 9)     │  Charlie: 4 tasks       │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Dependencies

### No New Dependencies Required

All optimizations use existing libraries:
- ExcelJS (already installed)
- Obsidian API (already available)

### Internal Dependencies

| Component | Depends On |
|-----------|------------|
| RegexCache | None (standalone utility) |
| Enhanced MarkdownParser | RegexCache, ConfigManager |
| Error Handling | Logger utility |
| Executive Summary | ChartBuilder, StyleManager |

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing parsing | Medium | High | Extensive testing, backwards compatibility |
| Performance regression | Low | Medium | Benchmark before/after |
| Config migration issues | Low | Medium | Auto-migration with fallbacks |

---

## 8. Success Metrics

| Metric | Measurement Method |
|--------|-------------------|
| Parsing accuracy | Test with sample files, count correct extractions |
| Performance | Console.time() before/after comparison |
| Error detection | Count of previously silent failures now reported |
| User satisfaction | Executive summary visible in reports |

---

## 9. Timeline Estimate

| Phase | Duration |
|-------|----------|
| Phase 1: Regex Caching | 1 hour |
| Phase 2: Enhanced Detection | 2 hours |
| Phase 3: Error Handling | 1 hour |
| Phase 4: Executive Summary | 2 hours |
| Phase 5: Testing | 1 hour |
| **Total** | **~7 hours** |

---

## 10. Open Questions

1. **Natural date parsing**: Should "next Monday" be supported or stick to explicit dates?
2. **Dataview compatibility**: Full Dataview syntax support or just `field::value` pattern?
3. **Executive Summary position**: Sheet 1 (first) or Sheet 8 (last)?

---

**Next Step**: `/pdca design plugin-optimization-v3`
