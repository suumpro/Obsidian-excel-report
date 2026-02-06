# Plan: User Customization & Universality

**Feature ID**: user-customization
**Created**: 2026-02-04
**Status**: Draft
**Priority**: P0

---

## 1. Problem Statement

The current Obsidian Excel Automation plugin has many hardcoded values that limit its usefulness to a narrow use case:

### Current Limitations

| Category | Issue | Impact |
|----------|-------|--------|
| **Language** | Korean labels hardcoded in sheets, parsers, and UI | Non-Korean users cannot use effectively |
| **Sheet Structure** | Fixed 7 sheets with specific names | Users can't customize report structure |
| **Parsing Rules** | Hardcoded emojis, tags, status keywords | Users with different markdown conventions blocked |
| **Report Types** | Fixed Weekly/Quarterly/Feature/Blocker | Can't add custom report types |
| **Styling** | Many style properties hardcoded | Limited visual customization |

### Affected Components

```
src/
├── services/
│   └── MarkdownParser.ts    ← Hardcoded patterns & keywords
├── reports/
│   ├── WeeklyReport.ts      ← Hardcoded sheet names & content
│   ├── QuarterlyReport.ts   ← Hardcoded labels & structure
│   ├── FeatureReport.ts     ← Hardcoded status values
│   └── BlockerReport.ts     ← Hardcoded priority mapping
├── generators/
│   └── StyleManager.ts      ← Hardcoded font sizes, borders
└── main.ts                  ← Hardcoded metadata (author)
```

---

## 2. Goals

### Primary Goals

1. **Multi-language Support**: Allow users to configure labels, headers, and keywords in any language
2. **Configurable Parsing**: Let users define their own markdown patterns for tasks, features, blockers
3. **Customizable Reports**: Allow users to define sheet structure, columns, and content
4. **Template System**: Provide preset configurations for common use cases

### Success Criteria

| Metric | Target |
|--------|--------|
| Configurable Settings | 90%+ of currently hardcoded values |
| Default Behavior | Zero breaking changes for existing users |
| Template Presets | At least 3 language presets (EN, KO, Custom) |
| Configuration UI | All settings accessible via Obsidian settings tab |

---

## 3. Proposed Solution

### 3.1 Configuration Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Configuration                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Language   │  │   Parsing   │  │   Reports   │     │
│  │   Config    │  │    Rules    │  │   Schema    │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          ▼                              │
│              ┌───────────────────────┐                  │
│              │   ConfigManager.ts    │                  │
│              │   (Central Registry)  │                  │
│              └───────────┬───────────┘                  │
│                          │                              │
│         ┌────────────────┼────────────────┐             │
│         ▼                ▼                ▼             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Markdown   │  │   Report    │  │    Style    │     │
│  │   Parser    │  │ Generators  │  │   Manager   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Configuration Categories

#### A. Language Configuration (i18n)

```typescript
interface LanguageConfig {
  locale: 'en' | 'ko' | 'ja' | 'custom';

  // UI Labels
  labels: {
    weeklyReport: string;      // "Weekly Report" or "주간 리포트"
    quarterlyReport: string;
    featureReport: string;
    blockerReport: string;
  };

  // Sheet Names
  sheets: {
    weeklySummary: string;     // "Weekly Summary" or "주간현황"
    roadmapProgress: string;
    taskDetails: string;
    blockerTracking: string;
    coordination: string;
    milestones: string;
    playbookProgress: string;
  };

  // Status Labels
  status: {
    completed: string[];       // ["완료", "Complete", "Done"]
    inProgress: string[];      // ["진행중", "In Progress", "WIP"]
    pending: string[];         // ["대기", "Pending", "TODO"]
  };

  // Priority Labels
  priority: {
    high: string[];            // ["높음", "High", "P0"]
    medium: string[];          // ["중간", "Medium", "P1"]
    low: string[];             // ["낮음", "Low", "P2"]
  };
}
```

#### B. Parsing Rules Configuration

```typescript
interface ParsingConfig {
  // Task Detection
  task: {
    checkboxPattern: RegExp;   // /- \[([ x])\]/
    priorityIndicators: {
      p0: string[];            // ["⏫", "#P0", "[P0]"]
      p1: string[];            // ["🔼", "#P1", "[P1]"]
      p2: string[];            // ["🔽", "#P2", "[P2]"]
    };
    statusIndicators: {
      completed: string[];     // ["[x]", "✅", "DONE"]
      pending: string[];       // ["[ ]", "⬜", "TODO"]
    };
  };

  // Feature Detection
  feature: {
    idPattern: RegExp;         // /[AB]\d+/ or custom
    statusField: string;       // "status" or "상태"
    priorityField: string;     // "priority" or "우선순위"
  };

  // Blocker Detection
  blocker: {
    resolvedIndicators: string[];   // ["✅", "해결", "Resolved"]
    unresolvedIndicators: string[]; // ["⚠️", "미해결", "Open"]
  };

  // Table Detection
  table: {
    coordinationHeaders: string[];  // ["Category", "Content", "구분", "협의"]
    milestoneHeaders: string[];     // ["Milestone", "Date", "마일스톤"]
    playbookHeaders: string[];      // ["Item", "Target", "항목", "목표"]
  };
}
```

#### C. Report Schema Configuration

```typescript
interface ReportSchemaConfig {
  weekly: {
    enabled: boolean;
    sheets: SheetDefinition[];
    filename: string;
  };
  quarterly: {
    enabled: boolean;
    sheets: SheetDefinition[];
    filename: string;
  };
  feature: {
    enabled: boolean;
    sheets: SheetDefinition[];
    filename: string;
  };
  blocker: {
    enabled: boolean;
    sheets: SheetDefinition[];
    filename: string;
  };
  custom: CustomReportDefinition[];  // User-defined reports
}

interface SheetDefinition {
  name: string;
  columns: ColumnDefinition[];
  dataSource: 'tasks' | 'features' | 'blockers' | 'kpi' | 'custom';
  filters?: FilterRule[];
}

interface ColumnDefinition {
  header: string;
  field: string;
  width?: number;
  format?: 'text' | 'date' | 'number' | 'percentage';
}
```

#### D. Style Configuration (Extended)

```typescript
interface ExtendedStyleConfig {
  // Existing (colors)
  colors: {
    headerBackground: string;
    subheaderBackground: string;
    priority: { p0: string; p1: string; p2: string };
    status: { completed: string; inProgress: string; pending: string };
  };

  // New (typography)
  typography: {
    headerFont: { size: number; bold: boolean };
    subheaderFont: { size: number; bold: boolean };
    bodyFont: { size: number };
    titleFont: { size: number; bold: boolean };
  };

  // New (layout)
  layout: {
    defaultRowHeight: number;
    defaultColumnWidth: number;
    alternateRowColor: string;
    borderStyle: 'thin' | 'medium' | 'thick' | 'none';
    tabColor: string;
  };
}
```

### 3.3 Template Presets

| Preset | Description | Use Case |
|--------|-------------|----------|
| `korean-default` | Current behavior (Korean labels) | Existing users |
| `english-default` | English labels, same structure | English-speaking teams |
| `minimal` | Simplified reports, fewer sheets | Quick reports |
| `custom` | User-defined from scratch | Power users |

---

## 4. Implementation Phases

### Phase 1: Core Configuration System (Priority: P0)

| Task | Description | Files |
|------|-------------|-------|
| CFG-001 | Create ConfigManager service | `src/services/ConfigManager.ts` |
| CFG-002 | Define configuration types | `src/types/config.ts` |
| CFG-003 | Implement config loading/saving | `src/services/ConfigStorage.ts` |
| CFG-004 | Create default presets | `src/config/presets/*.json` |

### Phase 2: Language & Parsing (Priority: P0)

| Task | Description | Files |
|------|-------------|-------|
| I18N-001 | Refactor MarkdownParser to use config | `src/services/MarkdownParser.ts` |
| I18N-002 | Refactor report generators | `src/reports/*.ts` |
| I18N-003 | Create language preset files | `src/config/locales/*.json` |
| I18N-004 | Add language selector to settings | `src/SettingsTab.ts` |

### Phase 3: Report Customization (Priority: P1)

| Task | Description | Files |
|------|-------------|-------|
| RPT-001 | Create SheetBuilder abstraction | `src/generators/SheetBuilder.ts` |
| RPT-002 | Implement report schema system | `src/reports/SchemaBasedReport.ts` |
| RPT-003 | Add sheet configuration UI | `src/ui/SheetConfigModal.ts` |
| RPT-004 | Migrate existing reports to schema | `src/reports/*.ts` |

### Phase 4: Settings UI Enhancement (Priority: P1)

| Task | Description | Files |
|------|-------------|-------|
| UI-001 | Expand SettingsTab with new sections | `src/SettingsTab.ts` |
| UI-002 | Add parsing rules editor | `src/ui/ParsingRulesModal.ts` |
| UI-003 | Add report schema editor | `src/ui/ReportSchemaEditor.ts` |
| UI-004 | Add preset import/export | `src/ui/PresetManager.ts` |

### Phase 5: Validation & Testing (Priority: P0)

| Task | Description | Files |
|------|-------------|-------|
| TST-001 | Add config validation tests | `tests/ConfigManager.test.ts` |
| TST-002 | Test preset loading | `tests/presets.test.ts` |
| TST-003 | Test i18n in reports | `tests/i18n.test.ts` |
| TST-004 | Migration test for existing users | `tests/migration.test.ts` |

---

## 5. Migration Strategy

### Backward Compatibility

```typescript
// On first load after update:
if (!settings.configVersion) {
  // Migrate v1 settings to v2 format
  const migratedConfig = migrateV1ToV2(settings);

  // Apply 'korean-default' preset as base
  const config = mergeWithPreset('korean-default', migratedConfig);

  // Save with version marker
  config.configVersion = '2.0';
  await saveConfig(config);
}
```

### User Communication

1. Show one-time modal explaining new customization options
2. Offer guided preset selection on first load
3. Provide "Reset to defaults" option

---

## 6. Dependencies

### New Dependencies (None Required)

The implementation uses only Obsidian API and built-in TypeScript features.

### Internal Dependencies

| Component | Depends On |
|-----------|------------|
| MarkdownParser | ConfigManager |
| Report Generators | ConfigManager, SheetBuilder |
| SettingsTab | ConfigManager, UI Components |
| StyleManager | ConfigManager (extended styles) |

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing user configs | Medium | High | Version detection + auto-migration |
| Config complexity overwhelming users | Medium | Medium | Presets + progressive disclosure UI |
| Performance impact from config loading | Low | Medium | Lazy loading + caching |
| Parsing regex errors from user input | Medium | High | Validation + safe fallbacks |

---

## 8. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Hardcoded strings | ~200+ | <10 |
| Configurable properties | ~15 | 100+ |
| Language presets | 1 (Korean) | 3+ (EN, KO, JA) |
| Custom report capability | 0 | Full schema support |
| Settings UI sections | 4 | 8+ |

---

## 9. Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Core Config | 1 day | 1 day |
| Phase 2: i18n & Parsing | 1 day | 2 days |
| Phase 3: Report Schema | 1-2 days | 3-4 days |
| Phase 4: Settings UI | 1 day | 4-5 days |
| Phase 5: Testing | 1 day | 5-6 days |

**Total Estimate**: 5-6 days

---

## 10. Open Questions

1. **Preset Distribution**: Should presets be bundled or downloadable from a repository?
2. **Schema Complexity**: How much flexibility should custom reports have? (columns only vs. full layout)
3. **Validation UX**: How to show parsing rule errors without being intrusive?
4. **Versioning**: How to handle preset version updates?

---

## Appendix: Current Hardcoded Values Inventory

### MarkdownParser.ts
- Task priority emojis: `⏫`, `🔼`, `🔽`
- Task priority tags: `#P0`, `#P1`, `#P2`
- Status keywords: `완료`, `진행중`, `대기`, `Complete`, `Progress`, `Pending`
- Section headers: `높음 우선순위`, `중간 우선순위`, `낮음 우선순위`
- Blocker indicators: `✅`, `해결`, `⚠️`, `미해결`, `🔄 진행중`
- Table headers: `구분`, `협의`, `마일스톤`, `항목`, `목표`

### WeeklyReport.ts
- Sheet names: `주간현황`, `로드맵진척`, `Q1작업상세`, `블로커추적`, `Lawson협의`, `마일스톤`, `플레이북진척`
- KPI labels: `전체 작업`, `완료`, `P0 완료율`, `블로커`
- Column headers: `ID`, `작업명`, `담당자`, `상태`, `마감일`, `우선순위`
- Author: `박재민`

### QuarterlyReport.ts
- Sheet names: `Q{n} Overview`, `P0 Tasks`, `P1 Tasks`, `Progress Analytics`
- KPI labels: English hardcoded

### FeatureReport.ts / BlockerReport.ts
- Similar hardcoded sheet names and status/priority values

---

**Next Step**: `/pdca design user-customization`
