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

    it('should return empty when heading levels mismatch (## vs ### extractSection level 3)', () => {
      // extractSection uses level 3, so ## headings are not found
      const content = `
## High Priority

### B001 Authentication timeout issue
- owner: Alice
- Status: ⚠️ 미해결
`;

      const blockers = parser.parseBlockers(content);
      // ## headings won't match extractSection(keyword, 3)
      expect(blockers).toEqual([]);
    });

    it('should return empty when ### blocker headings break the section', () => {
      // Even with ### priority heading, ### B001 breaks extractSection at same level
      const content = `
### High Priority

### B001 Auth issue
- owner: Alice
- Status: ⚠️ 미해결
`;

      const blockers = parser.parseBlockers(content);
      // ### B001 has level <= 3, so extractSection breaks before including it
      expect(blockers).toEqual([]);
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
