# Obsidian Task Management Workflow Guide

Comprehensive guide for managing tasks and projects in Obsidian with Excel automation integration.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Folder Structure](#folder-structure)
3. [Task Management](#task-management)
4. [Frontmatter Standards](#frontmatter-standards)
5. [Tag Taxonomy](#tag-taxonomy)
6. [Daily Workflow](#daily-workflow)
7. [Weekly Workflow](#weekly-workflow)
8. [Monthly Workflow](#monthly-workflow)
9. [Quarterly Workflow](#quarterly-workflow)
10. [Team Collaboration](#team-collaboration)
11. [Excel Integration Workflow](#excel-integration-workflow)
12. [Tips and Tricks](#tips-and-tricks)

---

## Introduction

### Philosophy

This workflow combines:
- **PARA Framework** (Projects, Areas, Resources, Archive)
- **Shape Up Methodology** (Cycles, Betting Tables)
- **GTD Principles** (Capture, Organize, Review)
- **Automated Reporting** (Obsidian → Excel)

### Goals

- Clear task ownership and priorities
- Consistent data format for automation
- Minimal manual work
- Easy weekly/quarterly reporting
- Team-wide visibility

---

## Folder Structure

### Recommended PARA Structure

```
Obsidian Vault/
├── 01. Project/
│   ├── PRJ_2026_플레이북/
│   │   ├── 01_Strategic/
│   │   │   └── KPIs/
│   │   │       └── 2026_H1_Goals.md
│   │   └── 02_Execution/
│   └── (Other active projects)
│
├── 02. Area/
│   ├── 01. Personal/
│   ├── 02. Learning/
│   └── 03. Work/
│       └── STOREAGENT/                    # Your main work area
│           ├── 00_Dashboard/              # ⭐ Central hub
│           │   ├── _PM Dashboard.md       # Current status
│           │   ├── 2026_Q1_Status.md      # Quarterly task breakdown
│           │   ├── 2026_Q2_Status.md
│           │   ├── 2026_Q3_Status.md
│           │   ├── 2026_Q4_Status.md
│           │   └── Blockers_Tracker.md    # Blocker tracking
│           │
│           ├── 02_Implementation/
│           │   ├── Features/              # Feature files (A1-B12)
│           │   │   ├── A1_Feature_Name_Unified.md
│           │   │   ├── A2_Feature_Name_Unified.md
│           │   │   └── ...
│           │   └── Betting/
│           │       └── 2026_Q1_Betting.md # Cycle planning (C1/C2/C3)
│           │
│           ├── 05_Roadmap/
│           │   ├── Lawson_2026_로드맵_관리.md
│           │   └── Excel/                 # Generated reports output
│           │       ├── Lawson_Weekly_Report_W06_*.xlsx
│           │       └── Archive/           # Old reports
│           │
│           └── Customers/
│               └── Lawson/
│                   ├── Lawson TASK.md
│                   ├── PRD_StoreAgent_Lawson_Q1.md
│                   └── Lawson RAG/
│
├── 03. Resource/
│   ├── Templates/
│   └── References/
│
└── 04. Archive/
    ├── 2025/
    └── Old_Projects/
```

### Key Principles

1. **00_Dashboard** - Single source of truth for current status
2. **02_Implementation** - Execution details and feature files
3. **05_Roadmap** - Strategic planning and Excel outputs
4. **Customers** - Customer-specific information and requirements
5. **Separation** - Clear separation between planning, execution, and output

---

## Task Management

### Task Syntax

**Basic Format**:
```markdown
- [ ] Task description
- [x] Completed task
```

**With Metadata**:
```markdown
- [ ] Task description ⏫ 📅 2026-02-15 #storeagent/q1/p0 @owner
```

**Component Breakdown**:
- `- [ ]` / `- [x]` - Checkbox (pending/completed)
- `⏫` / `🔼` / `🔽` - Priority indicator (P0/P1/P2)
- `📅 YYYY-MM-DD` - Due date
- `#category/subcategory` - Tags for organization
- `@owner` - Task owner (optional)

### Priority Levels

| Priority | Symbol | Meaning | When to Use | SLA |
|----------|--------|---------|-------------|-----|
| **P0** | ⏫ | Critical | Production down, blocking all work | Same day |
| **P1** | 🔼 | High | Blocking progress, customer waiting | 1-3 days |
| **P2** | 🔽 | Medium | Important but not urgent | 1-2 weeks |

**Examples**:
```markdown
- [ ] Fix production API failure ⏫ 📅 2026-02-03 #storeagent/q1/p0 @dev-team
- [ ] Implement Lawson authentication 🔼 📅 2026-02-10 #storeagent/q1/p1 @backend
- [ ] Refactor legacy code 🔽 📅 2026-02-28 #storeagent/q1/p2 @dev-team
```

### Task States

Tasks can be in different states:

```markdown
- [ ] 🔄 In Progress - Actively working on this
- [ ] ⏸️ Blocked - Waiting for dependency
- [ ] 📋 Planned - Scheduled for future
- [x] ✅ Completed - Done and verified
- [-] ❌ Cancelled - No longer needed
```

### Task Organization by File

**1. _PM Dashboard.md** - Current sprint/week focus
```markdown
## 이번 주 완료 (This Week Completed)
- [x] Feature A1 implementation ⏫ 📅 2026-02-01 #storeagent/c2/p0
- [x] Database schema design 🔼 📅 2026-02-02 #storeagent/c2/p1

## 다음 주 계획 (Next Week Plan)
- [ ] Feature A2 kickoff ⏫ 📅 2026-02-10 #storeagent/c2/p0
- [ ] API integration testing 🔼 📅 2026-02-11 #storeagent/c2/p1
```

**2. 2026_Q1_Status.md** - Quarterly breakdown
```markdown
## P0 Tasks (Critical)
- [ ] User authentication system ⏫ 📅 2026-02-15 #storeagent/q1/p0 @backend
- [ ] Payment gateway integration ⏫ 📅 2026-02-20 #storeagent/q1/p0 @fullstack
- [x] Database migration ⏫ 📅 2026-02-01 #storeagent/q1/p0 @backend

## P1 Tasks (High Priority)
- [ ] Admin dashboard UI 🔼 📅 2026-02-25 #storeagent/q1/p1 @frontend
- [ ] Email notification system 🔼 📅 2026-02-28 #storeagent/q1/p1 @backend
```

**3. Feature_Unified.md** - Feature-specific tasks
```markdown
---
feature_id: A1
feature_name: User Authentication
priority: P0
status: 진행중
cycle: C2
---

## Tasks
- [x] Design authentication flow ⏫ 📅 2026-01-15
- [x] Implement JWT tokens ⏫ 📅 2026-01-20
- [ ] Add OAuth2 support 🔼 📅 2026-02-10
- [ ] Write integration tests 🔼 📅 2026-02-15
```

---

## Frontmatter Standards

### Feature File Frontmatter

```yaml
---
feature_id: A1
feature_name: User Authentication System
priority: P0              # P0, P1, P2
status: 진행중           # 진행중, 대기, 완료, 보류
cycle: C2                 # C1, C2, C3
start_date: 2026-01-15
target_date: 2026-02-28
completion_date:          # Fill when completed
owner: Backend Team
stakeholders:
  - Lawson
  - Product Team
dependencies:
  - B2
  - B5
tags:
  - storeagent
  - q1
  - authentication
---
```

### Dashboard Frontmatter

```yaml
---
type: dashboard
project: STOREAGENT
current_week: W06
current_cycle: C2
current_quarter: Q1
last_updated: 2026-02-03
---
```

### Quarterly Status Frontmatter

```yaml
---
quarter: Q1
year: 2026
start_date: 2026-01-01
end_date: 2026-03-31
total_tasks: 31
p0_tasks: 12
p1_tasks: 9
p2_tasks: 10
completion_rate: 15%
---
```

### Blocker Frontmatter

```yaml
---
type: blocker_tracker
project: STOREAGENT
total_blockers: 10
high_priority: 4
medium_priority: 4
low_priority: 2
---
```

---

## Tag Taxonomy

### Hierarchical Tag System

**Format**: `#project/scope/attribute`

**Example Taxonomy**:
```
#storeagent/
├── q1/
│   ├── p0
│   ├── p1
│   └── p2
├── q2/
│   ├── p0
│   ├── p1
│   └── p2
├── c1/
├── c2/
├── c3/
├── backend/
├── frontend/
├── infrastructure/
├── lawson/
└── internal/
```

### Tag Categories

**1. Time-based Tags**:
```markdown
#storeagent/q1     # Quarter 1 tasks
#storeagent/q2     # Quarter 2 tasks
#storeagent/c1     # Cycle 1 (Shape Up)
#storeagent/c2     # Cycle 2
#storeagent/w06    # Week 6
```

**2. Priority Tags**:
```markdown
#storeagent/p0     # Critical priority
#storeagent/p1     # High priority
#storeagent/p2     # Medium priority
```

**3. Domain Tags**:
```markdown
#storeagent/backend
#storeagent/frontend
#storeagent/infrastructure
#storeagent/devops
#storeagent/qa
```

**4. Stakeholder Tags**:
```markdown
#storeagent/lawson     # Lawson customer
#storeagent/internal   # Internal team
#storeagent/product    # Product team
```

**5. Feature Tags**:
```markdown
#storeagent/auth       # Authentication
#storeagent/payment    # Payment
#storeagent/reporting  # Reporting
```

### Tag Usage Examples

```markdown
- [ ] Implement Lawson SSO integration ⏫ 📅 2026-02-15 #storeagent/q1/p0 #storeagent/backend #storeagent/lawson #storeagent/auth

- [ ] Design admin dashboard UI 🔼 📅 2026-02-20 #storeagent/q1/p1 #storeagent/frontend #storeagent/internal

- [ ] Set up CI/CD pipeline 🔽 📅 2026-02-28 #storeagent/q1/p2 #storeagent/infrastructure #storeagent/devops
```

### Query with Tags

Using Dataview plugin:
```dataview
TASK
WHERE contains(tags, "#storeagent/q1/p0") AND !completed
SORT due ASC
```

---

## Daily Workflow

### Morning Routine (15 minutes)

**1. Open _PM Dashboard.md**

**2. Review Today's Tasks**:
```markdown
## 오늘 할 일 (Today)
- [ ] Task 1 ⏫ 📅 2026-02-03
- [ ] Task 2 🔼 📅 2026-02-03
```

**3. Check Blockers**:
```markdown
## 현재 블로커 (Current Blockers)
- 🔴 Blocker 1 - Waiting for Lawson API key
- 🟡 Blocker 2 - Pending code review
```

**4. Update Status**:
```markdown
## 진행 중 (In Progress)
- [ ] 🔄 Implementing feature A2 - 60% complete
```

### During the Day

**Update task status as you work**:
```markdown
Before:
- [ ] Implement authentication ⏫ 📅 2026-02-03

During:
- [ ] 🔄 Implementing authentication ⏫ 📅 2026-02-03

After:
- [x] Implement authentication ⏫ 📅 2026-02-03
```

**Log decisions and notes**:
```markdown
## Daily Notes - 2026-02-03

### Decisions
- Decided to use JWT instead of sessions
- Postponed OAuth to next cycle

### Questions
- Need clarification on Lawson's SSO requirements
- Should we support social login?
```

### End of Day (10 minutes)

**1. Complete task checkboxes**

**2. Move incomplete tasks**:
```markdown
## 내일로 이동 (Moved to Tomorrow)
- [ ] Task that needs more time 📅 2026-02-04
```

**3. Note tomorrow's priorities**:
```markdown
## 내일 우선순위 (Tomorrow's Priorities)
1. Complete P0 tasks first
2. Unblock team members
3. Review pending PRs
```

---

## Weekly Workflow

### Monday Morning (30 minutes)

**1. Generate Last Week's Report**:
```bash
source venv/bin/activate
obsidian-excel generate weekly
```

**2. Review Generated Excel**:
- Check data accuracy
- Verify all P0/P1 tasks are captured
- Review blocker status

**3. Share Report**:
- Email to Lawson team
- Slack to internal team
- Upload to shared drive

**4. Plan This Week**:

In `_PM Dashboard.md`:
```markdown
## W06 주간 목표 (Weekly Goals)
- [ ] Complete 3 P0 tasks ⏫
- [ ] Clear 2 high-priority blockers 🔴
- [ ] Ship Feature A2 to staging 🚀

## W06 계획 (Weekly Plan)

### Monday
- [ ] Sprint planning meeting
- [ ] Lawson weekly sync
- [ ] Code review for A1

### Tuesday
- [ ] Implement A2 backend
- [ ] Database migration

### Wednesday
- [ ] A2 frontend integration
- [ ] Write API tests

### Thursday
- [ ] QA testing
- [ ] Fix bugs

### Friday
- [ ] Deploy to staging
- [ ] Documentation
- [ ] Weekly retrospective
```

### Wednesday Mid-Week Check (15 minutes)

**Review progress**:
```markdown
## W06 중간 점검 (Mid-week Check)

✅ Completed:
- [x] Sprint planning
- [x] Lawson sync
- [x] A1 code review

🔄 In Progress:
- [ ] A2 backend (70% done)
- [ ] Database migration (started)

⚠️ At Risk:
- [ ] Frontend integration (blocked by API changes)

Action Items:
- Unblock frontend team today
- Reprioritize Friday tasks if needed
```

### Friday Afternoon (30 minutes)

**1. Update Completion Status**:
```markdown
## W06 완료 현황 (Week Completion)

P0 Tasks: 2/3 completed (67%)
P1 Tasks: 4/5 completed (80%)
P2 Tasks: 3/7 completed (43%)

Overall: 9/15 tasks completed (60%)
```

**2. Document Learnings**:
```markdown
## W06 회고 (Retrospective)

### 잘한 점 (What Went Well)
- Delivered A2 on time
- Resolved 2 critical blockers
- Good collaboration with Lawson

### 개선할 점 (What to Improve)
- Need better API documentation
- Earlier blocker escalation
- More thorough testing before QA

### 다음 주 액션 (Actions for Next Week)
- Set up automated API docs
- Daily blocker standup
- Add E2E test suite
```

**3. Preview Next Week**:
```markdown
## W07 미리보기 (Next Week Preview)

Key Deliverables:
- Feature B1 completion
- Lawson demo preparation
- Q1 planning finalization

Risks:
- Team member on vacation
- External dependency on Lawson API
```

---

## Monthly Workflow

### Last Week of Month (1 hour)

**1. Review Monthly Metrics**:
```markdown
## 2월 월간 리뷰 (February Monthly Review)

### Metrics
- Tasks Completed: 45/60 (75%)
- Features Shipped: 3/5 (60%)
- Blockers Resolved: 8/10 (80%)
- Customer Satisfaction: 4.5/5

### Feature Status
| Feature | Status | Progress | Notes |
|---------|--------|----------|-------|
| A1      | ✅ 완료  | 100%     | Shipped to prod |
| A2      | 🔄 진행중 | 85%      | On track |
| A3      | 📋 대기  | 0%       | Starting next week |
| B1      | 🔄 진행중 | 60%      | Needs more time |
| B2      | ⏸️ 보류  | 30%      | Blocked |
```

**2. Archive Completed Items**:
```bash
# Move completed features to archive
mv 02_Implementation/Features/A1_*.md 04. Archive/2026/02_February/Features/
```

**3. Update Quarterly Tracking**:

In `2026_Q1_Status.md`:
```markdown
## Q1 Progress (Month 2 of 3)

Overall: 32/90 tasks (36% complete)

### February Summary
- Completed: 15 tasks
- In Progress: 8 tasks
- Remaining: 67 tasks

### On Track
- Feature development: ✅
- Testing coverage: ✅
- Documentation: ⚠️ (needs catch-up)

### At Risk
- B2 feature delayed
- Integration testing behind schedule
```

### Monthly Planning (1 hour)

**1. Review Next Month's Goals**:
```markdown
## 3월 목표 (March Goals)

### Primary Objectives
1. Complete Q1 deliverables (90% target)
2. Prepare Q2 roadmap
3. Lawson production launch preparation

### Key Results
- Ship 5 remaining features
- Achieve 90% test coverage
- Zero critical bugs in production
- Customer satisfaction >4.5/5
```

**2. Allocate to Cycles**:
```markdown
## March Cycle Allocation

### C3 (Early March)
- Features: B3, B4, B5
- Focus: Foundation work
- Risk: Low

### C4 (Mid March)
- Features: B6, B7
- Focus: Integration
- Risk: Medium

### C5 (Late March)
- Features: B8, B9, B10
- Focus: Polish & launch prep
- Risk: High (customer deadline)
```

---

## Quarterly Workflow

### End of Quarter (2-3 hours)

**1. Generate Quarterly Report**:
```bash
source venv/bin/activate
obsidian-excel generate quarterly
```

**2. Comprehensive Review**:

Create `2026_Q1_Retrospective.md`:
```markdown
# Q1 2026 Retrospective

## Executive Summary
- Delivered: 60/90 tasks (67%)
- Features Shipped: 8/12 (67%)
- Customer Satisfaction: 4.6/5
- Team Velocity: 20 points/week (target: 18)

## Wins
- Successfully launched Lawson MVP
- Zero production incidents
- Strong team collaboration
- Excellent customer feedback

## Challenges
- Integration testing took longer than expected
- Two features postponed to Q2
- Documentation debt accumulated

## Q2 Commitments
- Clear documentation debt
- Improve estimation accuracy
- Add more automated testing
- Start Q2 with 10 features planned
```

**3. Archive Q1 Files**:
```bash
# Archive structure
mkdir -p "04. Archive/2026/Q1"
mv "00_Dashboard/2026_Q1_Status.md" "04. Archive/2026/Q1/"
cp -r "02_Implementation/Betting/2026_Q1_Betting.md" "04. Archive/2026/Q1/"
cp -r "05_Roadmap/Excel/Q1/" "04. Archive/2026/Q1/Reports/"
```

### Start of Quarter (2 hours)

**1. Create Q2 Files**:

**`2026_Q2_Status.md`**:
```markdown
---
quarter: Q2
year: 2026
start_date: 2026-04-01
end_date: 2026-06-30
total_tasks: 0
p0_tasks: 0
p1_tasks: 0
p2_tasks: 0
completion_rate: 0%
---

# Q2 2026 Status

## Overview
- Start: April 1, 2026
- End: June 30, 2026
- Duration: 13 weeks

## Goals
1. Goal 1
2. Goal 2
3. Goal 3

## P0 Tasks (Critical)
- [ ] Task 1 ⏫ 📅 2026-04-15 #storeagent/q2/p0

## P1 Tasks (High Priority)
- [ ] Task 2 🔼 📅 2026-04-30 #storeagent/q2/p1
```

**`2026_Q2_Betting.md`**:
```markdown
# Q2 2026 Betting Table

## Cycle Planning

### C6 (Weeks 1-2: April 1-14)
| Feature | Size | Team | Risk |
|---------|------|------|------|
| C1      | 2w   | Backend | Low |
| C2      | 2w   | Frontend | Medium |

### C7 (Weeks 3-4: April 15-28)
| Feature | Size | Team | Risk |
|---------|------|------|------|
| C3      | 2w   | Fullstack | Medium |

### C8 (Weeks 5-6: April 29 - May 12)
| Feature | Size | Team | Risk |
|---------|------|------|------|
| C4      | 2w   | Backend | High |
```

**2. Update Configuration**:
```bash
# Update Excel automation config if needed
obsidian-excel config set sources.q2_status "00_Dashboard/2026_Q2_Status.md"
```

**3. Quarterly Planning Session**:
- Review Q1 learnings
- Set Q2 OKRs
- Allocate resources
- Identify risks
- Create roadmap

---

## Team Collaboration

### Daily Standup Integration

**Before standup, update dashboard**:
```markdown
## 스탠드업 준비 (Standup Prep)

Yesterday:
- [x] Completed A2 backend
- [x] Fixed 3 bugs

Today:
- [ ] Start A3 frontend
- [ ] Review B1 PR

Blockers:
- 🔴 Waiting for Lawson API credentials
```

### Code Review Workflow

**Link tasks in PR descriptions**:
```markdown
## PR #123: Implement User Authentication

Related Task: `_PM Dashboard.md` - Line 45
Feature: A1 - User Authentication

Checklist:
- [x] Code complete
- [x] Tests added
- [x] Documentation updated
- [ ] QA approved

Obsidian Task:
- [ ] Code review for A1 ⏫ 📅 2026-02-03 #storeagent/q1/p0
```

**After merge, update Obsidian**:
```markdown
- [x] Code review for A1 ⏫ 📅 2026-02-03 #storeagent/q1/p0 ✅ PR #123 merged
```

### Knowledge Sharing

**Document learnings in feature files**:
```markdown
## Learnings (A1 - User Authentication)

### Technical Decisions
- Chose JWT over sessions for scalability
- Used bcrypt for password hashing
- Implemented refresh token rotation

### Resources
- [[JWT Best Practices]]
- [[Security Considerations]]
- [OAuth2 Spec](https://oauth.net/2/)

### Future Improvements
- Add social login
- Implement MFA
- Add audit logging
```

---

## Excel Integration Workflow

### Automated Weekly Report Generation

**Monday Morning Routine**:

```bash
#!/bin/bash
# generate_weekly_report.sh

cd /path/to/obsidian-excel-automation
source venv/bin/activate

# Generate report
obsidian-excel generate weekly

# Copy to Dropbox/Drive
REPORT=$(ls -t /path/to/Excel/*.xlsx | head -1)
cp "$REPORT" ~/Dropbox/Lawson_Reports/

# Send email notification
echo "Weekly report generated: $REPORT" | mail -s "Lawson Weekly Report" team@company.com

echo "✅ Weekly report workflow complete"
```

**Schedule with cron** (every Monday 9 AM):
```bash
0 9 * * 1 /path/to/generate_weekly_report.sh >> /path/to/logs/weekly.log 2>&1
```

### Data Quality Assurance

**Before generating reports**:

1. **Run quality checks**:
```markdown
## Report Quality Checklist

Data Completeness:
- [ ] All P0 tasks have due dates
- [ ] All features have status
- [ ] All blockers have owners
- [ ] Frontmatter is updated

Data Accuracy:
- [ ] Completed tasks marked as [x]
- [ ] Priorities correctly assigned
- [ ] Week number is current
- [ ] Metrics are calculated

Formatting:
- [ ] No broken wikilinks
- [ ] Tables properly formatted
- [ ] Tags follow taxonomy
```

2. **Preview before generating**:
```bash
obsidian-excel generate weekly --dry-run
```

3. **Review generated Excel**:
- Check all sheets loaded
- Verify calculations
- Confirm styling
- Validate charts (when implemented)

### Continuous Improvement

**Track automation savings**:
```markdown
## Automation Impact Tracking

### Time Savings
| Month | Manual Time | Automated Time | Savings |
|-------|-------------|----------------|---------|
| Jan   | 40 hours    | 1 hour         | 97.5%   |
| Feb   | 36 hours    | 0.5 hours      | 98.6%   |

### Quality Improvements
- Data accuracy: 95% → 100%
- Report consistency: 70% → 100%
- Formatting errors: 5/week → 0/week
```

**Gather feedback**:
```markdown
## Report Feedback Log

### 2026-02-03 - Lawson Team
- 👍 Love the automated generation
- 💡 Suggestion: Add trend charts
- ⚠️ Issue: Some Korean characters display incorrectly

Actions:
- [ ] Investigate character encoding
- [ ] Add chart generation (future enhancement)
```

---

## Tips and Tricks

### 1. Template Snippets

Create reusable templates:

**Daily Note Template**:
```markdown
# {{date:YYYY-MM-DD}} - Daily Note

## 오늘 할 일
- [ ]

## 완료
- [x]

## 내일 계획
- [ ]

## 메모
-
```

**Feature Template**:
```markdown
---
feature_id:
feature_name:
priority: P1
status: 대기
cycle: C2
start_date:
target_date:
---

# {{feature_name}}

## Overview
Brief description

## Tasks
- [ ] Task 1
- [ ] Task 2

## Dependencies
-

## Risks
-

## Success Criteria
-
```

### 2. Keyboard Shortcuts

Set up quick access:
- `Ctrl+T` - Create new task
- `Ctrl+D` - Toggle task completion
- `Ctrl+Shift+D` - Add today's date
- `Ctrl+P` - Add priority emoji

### 3. Dataview Queries

**Show overdue tasks**:
```dataview
TASK
WHERE !completed AND due < date(today)
SORT due ASC
```

**Show P0 tasks this week**:
```dataview
TASK
WHERE contains(text, "⏫") AND !completed
SORT due ASC
LIMIT 10
```

**Feature completion rate**:
```dataview
TABLE
  status as "Status",
  round((completed_tasks / total_tasks) * 100, 1) + "%" as "Progress"
FROM "02. Area/03. Work/STOREAGENT/02_Implementation/Features"
WHERE feature_id
SORT progress DESC
```

### 4. Quick Entry

**Capture inbox**:
```markdown
## Inbox (To Process)
- [ ] Random idea captured
- [ ] Email task from boss
- [ ] Bug report from customer

Process daily, move to appropriate files.
```

### 5. Linking Strategy

**Link related items**:
```markdown
## A1 - User Authentication

Related:
- [[B2 - API Gateway]] - Depends on auth
- [[Lawson TASK]] - Customer requirements
- [[PRD_StoreAgent_Lawson_Q1]] - Spec details

Blockers:
- [[Blockers_Tracker#BL-005]] - Waiting for SSO config
```

---

## Summary

### Core Principles

1. **Consistent Format** - Use standard task syntax
2. **Daily Updates** - Keep data current
3. **Clear Priorities** - P0/P1/P2 always specified
4. **Meaningful Tags** - Follow taxonomy
5. **Weekly Reviews** - Generate and review reports
6. **Automation First** - Let tools do the work

### Weekly Checklist

Monday:
- [ ] Generate last week's report
- [ ] Plan this week
- [ ] Update quarterly status

Daily:
- [ ] Update task completion
- [ ] Add new tasks to inbox
- [ ] Check blockers

Friday:
- [ ] Review week completion
- [ ] Document learnings
- [ ] Preview next week

End of Month:
- [ ] Monthly review
- [ ] Archive completed items
- [ ] Plan next month

End of Quarter:
- [ ] Generate quarterly report
- [ ] Comprehensive retrospective
- [ ] Set next quarter goals

---

**Next Steps**:
- See `USER_GUIDE.md` for Excel automation usage
- See `TECHNICAL.md` for system architecture
- See `WORKFLOW_REVIEW.md` for improvement recommendations

---

**Last Updated**: 2026-02-03
**Version**: 1.0.0
