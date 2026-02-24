/**
 * Unit tests for MarkdownParser
 */

import { MarkdownParser } from '../src/services/parsers';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('parseFile', () => {
    it('should parse frontmatter and content', () => {
      const markdown = `---
title: Test Document
author: John
---

# Content Here

Some text`;

      const result = parser.parseFile(markdown);

      expect(result.metadata).toHaveProperty('title', 'Test Document');
      expect(result.metadata).toHaveProperty('author', 'John');
      expect(result.content).toContain('# Content Here');
    });

    it('should return empty metadata when no frontmatter', () => {
      const markdown = `# Just Content

No frontmatter here`;

      const result = parser.parseFile(markdown);

      expect(result.metadata).toEqual({});
      expect(result.content).toBe(markdown);
    });

    it('should parse boolean values in frontmatter', () => {
      const markdown = `---
enabled: true
disabled: false
---
content`;

      const result = parser.parseFile(markdown);

      expect(result.metadata.enabled).toBe(true);
      expect(result.metadata.disabled).toBe(false);
    });

    it('should parse numeric values in frontmatter', () => {
      const markdown = `---
count: 42
version: 1.5
---
content`;

      const result = parser.parseFile(markdown);

      expect(result.metadata.count).toBe(42);
      expect(result.metadata.version).toBe(1.5);
    });
  });

  describe('extractSection', () => {
    const content = `# Heading 1

Some intro text

## Section A

Content of section A

### Subsection A1

Subsection content

## Section B

Content of section B`;

    it('should extract section by heading', () => {
      const result = parser.extractSection(content, 'Section A');

      expect(result).toContain('Content of section A');
      expect(result).toContain('### Subsection A1');
      expect(result).not.toContain('Content of section B');
    });

    it('should return null for non-existent section', () => {
      const result = parser.extractSection(content, 'Non-existent');
      expect(result).toBeNull();
    });

    it('should respect heading level', () => {
      const result = parser.extractSection(content, 'Subsection A1', 3);

      expect(result).toContain('Subsection content');
      expect(result).not.toContain('Content of section A');
    });
  });

  describe('extractTasks', () => {
    it('should extract completed tasks', () => {
      const content = `
- [x] Completed task
- [ ] Incomplete task
- [X] Also completed (uppercase)
`;

      const tasks = parser.extractTasks(content);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].status).toBe('completed');
      expect(tasks[1].status).toBe('pending');
      expect(tasks[2].status).toBe('completed');
    });

    it('should extract priority from emoji', () => {
      const content = `
- [ ] ⏫ High priority task
- [ ] 🔼 Medium priority task
- [ ] 🔽 Low priority task
`;

      const tasks = parser.extractTasks(content);

      expect(tasks[0].priority).toBe('P0');
      expect(tasks[1].priority).toBe('P1');
      expect(tasks[2].priority).toBe('P2');
    });

    it('should extract priority from tags', () => {
      const content = `
- [ ] Task #P0
- [ ] Task #P1
- [ ] Task #P2
`;

      const tasks = parser.extractTasks(content);

      expect(tasks[0].priority).toBe('P0');
      expect(tasks[1].priority).toBe('P1');
      expect(tasks[2].priority).toBe('P2');
    });

    it('should extract tags', () => {
      const content = `
- [ ] Task with #feature #urgent #backend
`;

      const tasks = parser.extractTasks(content);

      expect(tasks[0].tags).toContain('feature');
      expect(tasks[0].tags).toContain('urgent');
      expect(tasks[0].tags).toContain('backend');
    });

    it('should extract due date', () => {
      const content = `
- [ ] Task with due date 📅 2024-06-15
`;

      const tasks = parser.extractTasks(content);

      expect(tasks[0].dueDate).toBeInstanceOf(Date);
      expect(tasks[0].dueDate?.getFullYear()).toBe(2024);
      expect(tasks[0].dueDate?.getMonth()).toBe(5); // 0-indexed
      expect(tasks[0].dueDate?.getDate()).toBe(15);
    });

    it('should clean task content', () => {
      const content = `
- [ ] ⏫ Actual task content #feature 📅 2024-06-15
`;

      const tasks = parser.extractTasks(content);

      expect(tasks[0].content).toBe('Actual task content');
    });

    it('should apply filters', () => {
      const content = `
- [ ] Task A #P0
- [x] Task B #P0
- [ ] Task C #P1
`;

      // Filter by priority
      const p0Tasks = parser.extractTasks(content, { priority: 'P0' });
      expect(p0Tasks).toHaveLength(2);

      // Filter by status
      const completedTasks = parser.extractTasks(content, { status: 'completed' });
      expect(completedTasks).toHaveLength(1);

      // Combined filters
      const incompletP0 = parser.extractTasks(content, { priority: 'P0', status: 'pending' });
      expect(incompletP0).toHaveLength(1);
    });

    it('should recognize in_progress status indicators', () => {
      const content = `
- [/] Task with half-check checkbox
- [ ] 🔄 Task with spinner emoji
- [ ] WIP task in progress
- [x] Completed task
- [ ] Pending task
`;

      const tasks = parser.extractTasks(content);

      expect(tasks).toHaveLength(5);
      expect(tasks[0].status).toBe('in_progress');
      expect(tasks[1].status).toBe('in_progress');
      expect(tasks[2].status).toBe('in_progress');
      expect(tasks[3].status).toBe('completed');
      expect(tasks[4].status).toBe('pending');
    });

    it('should extract estimatedTime from task line', () => {
      const content = `
- [ ] Task with time estimate ⏱️ 2h
- [ ] Another task estimate:: 30 minutes
- [ ] Task without estimate
`;

      const tasks = parser.extractTasks(content);

      expect(tasks[0].estimatedTime).toBe('2h');
      expect(tasks[1].estimatedTime).toBe('30m');
      expect(tasks[2].estimatedTime).toBeUndefined();
    });

    it('should clean estimatedTime patterns from content', () => {
      const content = `
- [ ] Actual task ⏱️ 2h #P0
`;

      const tasks = parser.extractTasks(content);

      expect(tasks[0].content).not.toContain('⏱️');
      expect(tasks[0].content).not.toContain('2h');
      expect(tasks[0].estimatedTime).toBe('2h');
    });

    it('should parse tasks without priority as null priority', () => {
      const content = `
- [ ] Task without any priority
- [ ] ⏫ P0 task
`;

      const tasks = parser.extractTasks(content);

      expect(tasks[0].priority).toBeNull();
      expect(tasks[1].priority).toBe('P0');
    });
  });

  describe('parseTable', () => {
    it('should parse markdown table', () => {
      const content = `
| Name | Value | Status |
|------|-------|--------|
| Item1 | 100 | Active |
| Item2 | 200 | Inactive |
`;

      const rows = parser.parseTable(content);

      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ Name: 'Item1', Value: '100', Status: 'Active' });
      expect(rows[1]).toEqual({ Name: 'Item2', Value: '200', Status: 'Inactive' });
    });

    it('should return empty array for non-table content', () => {
      const content = 'Just some text without a table';
      expect(parser.parseTable(content)).toEqual([]);
    });
  });

  describe('extractCurrentWeek', () => {
    it('should extract week from W format', () => {
      expect(parser.extractCurrentWeek('Current week: W42')).toBe(42);
      expect(parser.extractCurrentWeek('W5 status')).toBe(5);
    });

    it('should extract week from Word format', () => {
      expect(parser.extractCurrentWeek('Week 42 Report')).toBe(42);
    });

    it('should extract week from Korean format', () => {
      expect(parser.extractCurrentWeek('현재 주차: W15')).toBe(15);
      expect(parser.extractCurrentWeek('주차: 15')).toBe(15);
    });

    it('should return null when no week found', () => {
      expect(parser.extractCurrentWeek('No week here')).toBeNull();
    });
  });

  describe('extractCurrentCycle', () => {
    it('should extract cycle from C format', () => {
      expect(parser.extractCurrentCycle('Current: C3')).toBe('C3');
      expect(parser.extractCurrentCycle('C1 planning')).toBe('C1');
    });

    it('should extract cycle from Word format', () => {
      expect(parser.extractCurrentCycle('Cycle 2 status')).toBe('C2');
    });

    it('should extract cycle from Korean format', () => {
      expect(parser.extractCurrentCycle('현재 Cycle: C4')).toBe('C4');
      expect(parser.extractCurrentCycle('사이클: C2')).toBe('C2');
    });

    it('should return null when no cycle found', () => {
      expect(parser.extractCurrentCycle('No cycle here')).toBeNull();
    });
  });

  describe('extractMetadataValue', () => {
    it('should extract bold format', () => {
      const content = '**Author**: John Doe';
      expect(parser.extractMetadataValue(content, 'Author')).toBe('John Doe');
    });

    it('should extract simple format', () => {
      const content = 'Status: Active';
      expect(parser.extractMetadataValue(content, 'Status')).toBe('Active');
    });

    it('should extract table format', () => {
      const content = '| **Version** | 1.2.3 |';
      expect(parser.extractMetadataValue(content, 'Version')).toBe('1.2.3');
    });

    it('should return null when not found', () => {
      expect(parser.extractMetadataValue('Some text', 'Missing')).toBeNull();
    });
  });

  describe('parseCoordination', () => {
    it('should parse coordination table', () => {
      const content = `
| 구분 | 협의 내용 | 우선순위 | 담당 | 기한 | 상태 |
|------|----------|---------|------|------|------|
| API | Endpoint discussion | High | John | 12/31 | Pending |
| DB | Schema review | Medium | Jane | 01/15 | Done |
`;

      const items = parser.parseCoordination(content);

      expect(items).toHaveLength(2);
      expect(items[0].category).toBe('API');
      expect(items[0].content).toBe('Endpoint discussion');
      expect(items[0].priority).toBe('High');
    });

    it('should return empty array for non-coordination tables', () => {
      const content = `
| Name | Value |
|------|-------|
| Test | 123 |
`;

      const items = parser.parseCoordination(content);
      expect(items).toHaveLength(0);
    });
  });

  describe('parseMilestones', () => {
    it('should parse milestone table', () => {
      const content = `
| 날짜 | 마일스톤 | 목표 | 상태 | 리스크 |
|------|---------|------|------|--------|
| 01/31 | MVP Launch | Core features | On track | Low |
| 03/31 | Beta Release | Full features | At risk | High |
`;

      const items = parser.parseMilestones(content);

      expect(items).toHaveLength(2);
      expect(items[0].name).toBe('MVP Launch');
      expect(items[0].target).toBe('Core features');
      expect(items[1].risk).toBe('High');
    });
  });

  describe('parsePlaybook', () => {
    it('should parse playbook table', () => {
      const content = `
| 항목 | 목표 | 현재 | 비율 | 상태 |
|------|------|------|------|------|
| Tests | 100 | 50 | 50% | In progress |
| Docs | 20 | 20 | 100% | Complete |
`;

      const items = parser.parsePlaybook(content);

      expect(items).toHaveLength(2);
      expect(items[0].name).toBe('Tests');
      expect(items[0].target).toBe(100);
      expect(items[0].current).toBe(50);
      expect(items[0].percentage).toBe(50);
      expect(items[1].percentage).toBe(100);
    });

    it('should calculate percentage if not provided', () => {
      const content = `
| 항목 | 목표 | 현재 | 비율 | 상태 |
|------|------|------|------|------|
| Tasks | 80 | 20 | | Active |
`;

      const items = parser.parsePlaybook(content);

      expect(items[0].percentage).toBe(25); // 20/80 = 25%
    });
  });

  describe('parseFeatures', () => {
    it('should parse features from table', () => {
      const content = `
| ID | Name | Priority | Status | Start | End | Progress |
|----|------|----------|--------|-------|-----|----------|
| A1 | Feature One | P0 | 진행중 | 01/01 | 03/31 | 50 |
| B2 | Feature Two | P1 | 완료 | 02/01 | 02/28 | 100 |
`;

      const features = parser.parseFeatures(content);

      expect(features).toHaveLength(2);
      expect(features[0].id).toBe('A1');
      expect(features[0].name).toBe('Feature One');
      expect(features[0].priority).toBe('P0');
      expect(features[0].status).toBe('진행중');
      expect(features[0].progress).toBe(50);

      expect(features[1].id).toBe('B2');
      expect(features[1].status).toBe('완료');
    });
  });
});
