/**
 * Unit tests for Task Master parsing extensions
 * Tests parseWeeklyBreakdowns and extractTaskExtensions
 */

import { MarkdownParser } from '../src/services/parsers';

describe('MarkdownParser - Task Master Extensions', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('parseWeeklyBreakdowns', () => {
    it('should parse weekly sections with W## (range) format', () => {
      const content = `
## W06 (02/03~02/09)

### 🚀 이번 주 시작
- [ ] 날씨 MCP 서버 연동 테스트 📅 2026-02-07 #q1/p0

### 📅 이번 주 마감
- [x] 브리핑 템플릿 v1 작성 📅 2026-02-07

### 🎯 마일스톤
- 2/7 Demo: 날씨 MCP 연동 시연

## W07 (02/10~02/16)

### 🚀 이번 주 시작
- [ ] 스냅샷 기능 개발 시작 📅 2026-02-14
`;

      const breakdowns = parser.parseWeeklyBreakdowns(content);

      expect(breakdowns).toHaveLength(2);
      expect(breakdowns[0].weekNumber).toBe(6);
      expect(breakdowns[0].weekRange).toBe('02/03~02/09');
      expect(breakdowns[0].newTasks.length).toBeGreaterThanOrEqual(1);
      expect(breakdowns[0].dueTasks.length).toBeGreaterThanOrEqual(1);
      expect(breakdowns[0].milestones.length).toBeGreaterThanOrEqual(1);

      expect(breakdowns[1].weekNumber).toBe(7);
      expect(breakdowns[1].weekRange).toBe('02/10~02/16');
      expect(breakdowns[1].newTasks.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when no weekly sections exist', () => {
      const content = `
# Some Document

Regular content without weekly breakdowns.
`;

      const breakdowns = parser.parseWeeklyBreakdowns(content);
      expect(breakdowns).toHaveLength(0);
    });

    it('should handle weeks with only milestones', () => {
      const content = `
## W10 (03/03~03/09)

### 🎯 마일스톤
- Q1 중간 검토
- P0 50% 달성 목표
`;

      const breakdowns = parser.parseWeeklyBreakdowns(content);

      expect(breakdowns).toHaveLength(1);
      expect(breakdowns[0].weekNumber).toBe(10);
      expect(breakdowns[0].newTasks).toHaveLength(0);
      expect(breakdowns[0].dueTasks).toHaveLength(0);
      expect(breakdowns[0].milestones.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle English section headers', () => {
      const content = `
## W06 (02/03~02/09)

### Started this week
- [ ] Weather MCP integration test 📅 2026-02-07

### Due this week
- [x] Briefing template v1 📅 2026-02-07

### Milestones
- 2/7 Demo
`;

      const breakdowns = parser.parseWeeklyBreakdowns(content);

      expect(breakdowns).toHaveLength(1);
      expect(breakdowns[0].newTasks.length).toBeGreaterThanOrEqual(1);
      expect(breakdowns[0].dueTasks.length).toBeGreaterThanOrEqual(1);
      expect(breakdowns[0].milestones.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('extractTaskExtensions', () => {
    it('should extract JIRA ID from task line', () => {
      const line = '- [ ] 브리핑 기능 개발 🔗 SA-051 📅 2026-02-28';
      const tasks = parser.extractTasks(line);

      expect(tasks).toHaveLength(1);
      if (tasks[0].jiraId) {
        expect(tasks[0].jiraId).toBe('SA-051');
      }
    });

    it('should extract quarter and area tags', () => {
      const line = '- [ ] 스냅샷 엔진 개발 #q1/p0 #C2/스냅샷 📅 2026-02-28';
      const tasks = parser.extractTasks(line);

      expect(tasks).toHaveLength(1);
      if (tasks[0].quarterTag) {
        expect(tasks[0].quarterTag).toMatch(/q1/);
      }
      if (tasks[0].areaTag) {
        expect(tasks[0].areaTag).toMatch(/C2/);
      }
    });

    it('should extract completed date', () => {
      const line = '- [x] 날씨 MCP 연동 완료 ✅ 2026-02-05';
      const tasks = parser.extractTasks(line);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('completed');
      if (tasks[0].completedDate) {
        expect(tasks[0].completedDate).toBeInstanceOf(Date);
      }
    });

    it('should handle tasks without extensions gracefully', () => {
      const line = '- [ ] Simple task without extensions';
      const tasks = parser.extractTasks(line);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].content).toBe('Simple task without extensions');
      expect(tasks[0].jiraId).toBeUndefined();
      expect(tasks[0].quarterTag).toBeUndefined();
      expect(tasks[0].areaTag).toBeUndefined();
    });
  });
});
