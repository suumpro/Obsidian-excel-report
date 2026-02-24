/**
 * Unit tests for FeatureBlockerParser
 */

import { FeatureBlockerParser } from '../src/services/parsers/FeatureBlockerParser';
import { MetadataParser } from '../src/services/parsers/MetadataParser';
import { DEFAULT_PARSING_RULES } from '../src/services/parsers/types';

describe('FeatureBlockerParser', () => {
  let parser: FeatureBlockerParser;

  beforeEach(() => {
    const metadataParser = new MetadataParser();
    parser = new FeatureBlockerParser(DEFAULT_PARSING_RULES, metadataParser);
  });

  describe('parseFeatures', () => {
    it('should parse feature table with ID, name, priority, status, progress', () => {
      const content = `
| ID | Feature | Priority | Status | Start | End | Progress |
|----|---------|----------|--------|-------|-----|----------|
| A1 | Auth Module | P0 | In Progress | Q1 | Q2 | 60% |
| B2 | Dashboard | P1 | Completed | Q1 | Q1 | 100% |
`;

      const features = parser.parseFeatures(content);

      expect(features).toHaveLength(2);
      expect(features[0].id).toBe('A1');
      expect(features[0].name).toBe('Auth Module');
      expect(features[0].priority).toBe('P0');
      expect(features[0].status).toBe('진행중');
      expect(features[0].progress).toBe(60);

      expect(features[1].id).toBe('B2');
      expect(features[1].status).toBe('완료');
      expect(features[1].progress).toBe(100);
    });

    it('should return empty array for empty content', () => {
      expect(parser.parseFeatures('')).toEqual([]);
      expect(parser.parseFeatures('Just text without tables')).toEqual([]);
    });

    it('should skip rows with insufficient columns', () => {
      const content = `
| ID | Feature |
|----|---------|
| A1 | Only Two |
| B1 | Also Two |
`;

      const features = parser.parseFeatures(content);
      expect(features).toEqual([]);
    });

    it('should skip header/separator rows', () => {
      const content = `
| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| A1 | Feature One | P0 | Done |
`;

      const features = parser.parseFeatures(content);
      expect(features).toHaveLength(1);
      expect(features[0].id).toBe('A1');
    });

    it('should parse feature status mapping correctly', () => {
      const content = `
| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| A1 | F1 | P0 | Completed |
| A2 | F2 | P0 | In Progress |
| A3 | F3 | P0 | Pending |
| A4 | F4 | P0 | WIP |
| A5 | F5 | P0 | Unknown |
`;

      const features = parser.parseFeatures(content);
      expect(features[0].status).toBe('완료');
      expect(features[1].status).toBe('진행중');
      expect(features[2].status).toBe('대기');
      expect(features[3].status).toBe('진행중');
      expect(features[4].status).toBe('대기'); // default
    });

    it('should parse priority strings', () => {
      const content = `
| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| A1 | F1 | P0 | Done |
| A2 | F2 | HIGH | Done |
| A3 | F3 | CRITICAL | Done |
| A4 | F4 | P1 | Done |
| A5 | F5 | MEDIUM | Done |
| A6 | F6 | other | Done |
`;

      const features = parser.parseFeatures(content);
      expect(features[0].priority).toBe('P0');
      expect(features[1].priority).toBe('P0');
      expect(features[2].priority).toBe('P0');
      expect(features[3].priority).toBe('P1');
      expect(features[4].priority).toBe('P1');
      expect(features[5].priority).toBe('P2'); // default
    });

    it('should parse progress percentage', () => {
      const content = `
| ID | Feature | Priority | Status | Start | End | Progress |
|----|---------|----------|--------|-------|-----|----------|
| A1 | F1 | P0 | Done | Q1 | Q1 | 75% |
| A2 | F2 | P0 | Done | Q1 | Q1 | abc |
| A3 | F3 | P0 | Done | Q1 | Q1 | 150% |
`;

      const features = parser.parseFeatures(content);
      expect(features[0].progress).toBe(75);
      expect(features[1].progress).toBe(0);
      expect(features[2].progress).toBe(100); // clamped
    });
  });

  describe('parseBlockers', () => {
    it('should return empty array for empty content', () => {
      expect(parser.parseBlockers('')).toEqual([]);
    });

    it('should parse blockers from ## priority sections with ### blocker entries', () => {
      const content = `
## High Priority

### B001 Authentication timeout issue
- owner: Alice
- 목표일: 2026-03-01
- 영향: Login flow breaks
- Status: ⚠️ 미해결

## Medium Priority

### B002 Slow dashboard load
- owner: Bob
- target: 2026-03-15
- Impact: User experience degraded
- Status: 🔄 진행중
`;

      const blockers = parser.parseBlockers(content);
      expect(blockers).toHaveLength(2);
      expect(blockers[0].id).toBe('B001');
      expect(blockers[0].title).toBe('Authentication timeout issue');
      expect(blockers[0].priority).toBe('높음');
      expect(blockers[0].status).toBe('⚠️ 미해결');
      expect(blockers[0].impact).toBe('Login flow breaks');

      expect(blockers[1].id).toBe('B002');
      expect(blockers[1].priority).toBe('중간');
      expect(blockers[1].status).toBe('🔄 진행중');
    });

    it('should parse resolved blocker status', () => {
      const content = `
## Low Priority

### B003 Minor UI glitch
- owner: Charlie
- Status: ✅ Resolved
`;

      const blockers = parser.parseBlockers(content);
      expect(blockers).toHaveLength(1);
      expect(blockers[0].priority).toBe('낮음');
      expect(blockers[0].status).toBe('✅ 해결');
    });

    it('should return empty for content without priority sections', () => {
      const content = `
## Random Section

### B001 Not under a priority heading
- owner: Alice
`;

      const blockers = parser.parseBlockers(content);
      expect(blockers).toEqual([]);
    });
  });
});
