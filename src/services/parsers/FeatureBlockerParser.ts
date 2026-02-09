/**
 * Feature and blocker parsing from markdown
 */

import { Feature, Blocker, Priority, FeatureStatus, BlockerPriority, BlockerStatus } from '../../types/models';
import { ParsingConfig } from '../../types/config';
import { matchesAny, createSafeRegex } from '../../utils/configUtils';
import { MetadataParser } from './MetadataParser';

export class FeatureBlockerParser {
  constructor(
    private parsingRules: ParsingConfig,
    private metadataParser: MetadataParser
  ) {}

  setParsingRules(rules: ParsingConfig): void {
    this.parsingRules = rules;
  }

  /**
   * Parse features from roadmap content
   */
  parseFeatures(content: string): Feature[] {
    const features: Feature[] = [];
    const lines = content.split('\n');

    const idPatternStr = this.parsingRules.feature.idPattern;
    const featurePattern = createSafeRegex(`(${idPatternStr})`) || /([AB]\d+)/;

    for (const line of lines) {
      if (!line.includes('|')) continue;

      const match = line.match(featurePattern);
      if (!match) continue;

      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length < 4) continue;

      const idCell = cells.find(c => featurePattern.test(c));
      if (!idCell) continue;

      const id = idCell.match(featurePattern)?.[0] || '';
      const cellIndex = cells.indexOf(idCell);

      const feature: Feature = {
        id,
        name: cells[cellIndex + 1] || cells[1] || '',
        priority: this.parsePriority(cells[cellIndex + 2] || cells[2] || ''),
        status: this.parseFeatureStatus(cells[cellIndex + 3] || cells[3] || ''),
        startDate: cells[cellIndex + 4] || cells[4] || null,
        completionDate: cells[cellIndex + 5] || cells[5] || null,
        progress: this.parseProgress(cells[cellIndex + 6] || cells[6] || '0'),
        cycle: null,
        blocker: null,
      };

      if (feature.id && feature.name) {
        features.push(feature);
      }
    }

    return features;
  }

  /**
   * Parse blockers from content
   */
  parseBlockers(content: string): Blocker[] {
    const blockers: Blocker[] = [];
    const blockerRules = this.parsingRules.blocker;

    const prioritySections = blockerRules.prioritySections;
    const priorityKeys: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    const priorityMap: Record<string, BlockerPriority> = {
      'high': '높음',
      'medium': '중간',
      'low': '낮음',
    };

    for (const priorityKey of priorityKeys) {
      const sectionKeywords = prioritySections[priorityKey];
      let sectionContent = '';

      for (const keyword of sectionKeywords) {
        sectionContent = this.metadataParser.extractSection(content, keyword, 3) || '';
        if (sectionContent) break;
      }

      if (!sectionContent) continue;

      const blockerPattern = /###\s+(B\d+)\s+(.+?)(?:\n|$)/g;
      let match;

      while ((match = blockerPattern.exec(sectionContent)) !== null) {
        const blockerId = match[1];
        const blockerTitle = match[2].trim();

        const blockerSection = this.extractBlockerSection(sectionContent, blockerId);

        const ownerFields = this.parsingRules.feature.fields.owner || ['owner', '담당자'];
        let owner = '';
        for (const field of ownerFields) {
          owner = this.metadataParser.extractMetadataValue(blockerSection, field) || '';
          if (owner) break;
        }

        blockers.push({
          id: blockerId,
          title: blockerTitle,
          priority: priorityMap[priorityKey],
          status: this.parseBlockerStatus(blockerSection),
          owner,
          targetDate: this.metadataParser.extractMetadataValue(blockerSection, '목표일') ||
                      this.metadataParser.extractMetadataValue(blockerSection, 'target') ||
                      this.metadataParser.extractMetadataValue(blockerSection, 'Target Date') || '',
          impact: this.extractImpact(blockerSection),
          description: null,
        });
      }
    }

    return blockers;
  }

  /**
   * Extract impact using configurable patterns
   */
  private extractImpact(content: string): string {
    const impactPatterns = this.parsingRules.blocker.impactPatterns;
    for (const pattern of impactPatterns) {
      const regex = createSafeRegex(pattern);
      if (regex) {
        const match = content.match(regex);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    return '';
  }

  /**
   * Extract blocker section by ID
   */
  private extractBlockerSection(content: string, blockerId: string): string {
    const pattern = new RegExp(`###\\s+${blockerId}[\\s\\S]*?(?=###|$)`, 'i');
    const match = content.match(pattern);
    return match ? match[0] : '';
  }

  /**
   * Parse blocker status from content using configurable indicators
   */
  private parseBlockerStatus(content: string): BlockerStatus {
    const rules = this.parsingRules.blocker;

    if (matchesAny(content, rules.resolvedIndicators)) {
      return '✅ 해결';
    }
    if (matchesAny(content, rules.unresolvedIndicators)) {
      return '⚠️ 미해결';
    }
    if (matchesAny(content, rules.inProgressIndicators)) {
      return '🔄 진행중';
    }
    return '🔄 진행중';
  }

  /**
   * Parse priority string to Priority type
   */
  private parsePriority(str: string): Priority {
    const rules = this.parsingRules.task;

    if (matchesAny(str, rules.priorityIndicators.p0)) return 'P0';
    if (matchesAny(str, rules.priorityIndicators.p1)) return 'P1';
    if (matchesAny(str, rules.priorityIndicators.p2)) return 'P2';

    const upper = str.toUpperCase();
    if (upper.includes('P0') || upper.includes('HIGH') || upper.includes('CRITICAL')) return 'P0';
    if (upper.includes('P1') || upper.includes('MEDIUM') || upper.includes('NORMAL')) return 'P1';
    return 'P2';
  }

  /**
   * Parse feature status string
   */
  private parseFeatureStatus(str: string): FeatureStatus {
    const statusMapping = this.parsingRules.feature.statusMapping;

    if (matchesAny(str, statusMapping.completed)) return '완료';
    if (matchesAny(str, statusMapping.inProgress)) return '진행중';
    if (matchesAny(str, statusMapping.pending)) return '대기';

    const lower = str.toLowerCase();
    if (lower.includes('complete') || lower.includes('done')) return '완료';
    if (lower.includes('progress') || lower.includes('wip')) return '진행중';
    return '대기';
  }

  /**
   * Parse progress percentage from string
   */
  private parseProgress(str: string): number {
    const match = str.match(/(\d+)/);
    if (match) return Math.min(100, Math.max(0, parseInt(match[1])));
    return 0;
  }
}
