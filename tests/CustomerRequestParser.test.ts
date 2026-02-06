/**
 * Unit tests for Customer Request parsing
 * Tests parseCustomerRequests method
 */

import { MarkdownParser } from '../src/services/MarkdownParser';

describe('MarkdownParser - Customer Request Parsing', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('parseCustomerRequests', () => {
    it('should parse priority-based request tables', () => {
      const content = `
## 우선순위 1 (필수)

| No. | 요청 내용 | 상세 | 반영 기능 | 분기 | 상태 | 연결 작업 |
|-----|----------|------|-----------|------|------|-----------|
| 3 | 데이터 연동 | POS/재고 연동 | 인프라 | Q1 | 🔄 | Task Master |
| 6 | 내점객 수 | 연령별 지표 | B2 브리핑 | Q1 | 🔄 | Task Master |

## 우선순위 2 (중요)

| No. | 요청 내용 | 반영 기능 | 분기 | 상태 | 연결 작업 |
|-----|----------|-----------|------|------|-----------|
| 5 | 요약 기능 | B2 브리핑 | Q1-Q2 | 🔄 | Task Master |
`;

      const requests = parser.parseCustomerRequests(content);

      expect(requests.length).toBeGreaterThanOrEqual(3);

      // Check priority 1 requests
      const p1Requests = requests.filter(r => r.priority === 1);
      expect(p1Requests.length).toBeGreaterThanOrEqual(2);

      // Check priority 2 requests
      const p2Requests = requests.filter(r => r.priority === 2);
      expect(p2Requests.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when no request sections found', () => {
      const content = `
# Some Other Document

No customer requests here.
`;

      const requests = parser.parseCustomerRequests(content);
      expect(requests).toHaveLength(0);
    });

    it('should extract request IDs and titles', () => {
      const content = `
## 우선순위 3 (일반)

| No. | 요청 내용 | 반영 기능 | 분기 | 상태 | 연결 작업 |
|-----|----------|-----------|------|------|-----------|
| 8 | 날씨 예보 데이터 | B5 날씨 | Q1 | 🔄 | 날씨 MCP |
| 12 | 업무 시간 취득 | B4 체크리스트 | Q4 | ⚠️ | Task Master |
`;

      const requests = parser.parseCustomerRequests(content);

      expect(requests.length).toBeGreaterThanOrEqual(2);
      const first = requests[0];
      expect(first.id).toBeTruthy();
      expect(first.title).toBeTruthy();
      expect(first.priority).toBe(3);
    });

    it('should handle all 4 priority levels', () => {
      const content = `
## 우선순위 1 (필수)

| No. | 요청 내용 | 분기 | 상태 |
|-----|----------|------|------|
| 1 | Item A | Q1 | 🔄 |

## 우선순위 2 (중요)

| No. | 요청 내용 | 분기 | 상태 |
|-----|----------|------|------|
| 2 | Item B | Q2 | 📅 |

## 우선순위 3 (일반)

| No. | 요청 내용 | 분기 | 상태 |
|-----|----------|------|------|
| 3 | Item C | Q3 | ⚠️ |

## 우선순위 4 (보류/검토)

| No. | 요청 내용 | 분기 | 상태 |
|-----|----------|------|------|
| 4 | Item D | Q4 | 📋 |
`;

      const requests = parser.parseCustomerRequests(content);

      expect(requests.length).toBeGreaterThanOrEqual(4);
      const priorities = requests.map(r => r.priority);
      expect(priorities).toContain(1);
      expect(priorities).toContain(2);
      expect(priorities).toContain(3);
      expect(priorities).toContain(4);
    });
  });

  describe('parseMermaidGantt', () => {
    it('should parse Gantt items from mermaid block', () => {
      const content = `
\`\`\`mermaid
gantt
    title STOREAGENT 2026 로드맵
    dateFormat YYYY-MM-DD
    axisFormat %m월

    section A. Reports
    A1 리포트 시스템       :done, a1, 2026-01-06, 2026-03-31
    A2 브리핑 기능         :active, a2, 2026-02-01, 2026-06-30

    section B. Features
    B1 매장 선택 UI        :done, b1, 2026-01-06, 2026-02-28
    B2 브리핑 기능         :active, b2, 2026-01-20, 2026-06-30
\`\`\`
`;

      const items = parser.parseMermaidGantt(content);

      expect(items.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no mermaid gantt block', () => {
      const content = `
# Regular Document

No gantt chart here.
`;

      const items = parser.parseMermaidGantt(content);
      expect(items).toHaveLength(0);
    });

    it('should handle mermaid block without gantt keyword', () => {
      const content = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
`;

      const items = parser.parseMermaidGantt(content);
      expect(items).toHaveLength(0);
    });
  });
});
