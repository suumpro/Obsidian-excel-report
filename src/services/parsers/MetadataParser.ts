/**
 * Metadata and section extraction from markdown
 */

import { escapeRegex } from './types';

export class MetadataParser {
  /**
   * Parse frontmatter and content from markdown
   */
  parseFile(content: string): { metadata: Record<string, unknown>; content: string } {
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

    if (frontmatterMatch) {
      const yamlContent = frontmatterMatch[1];
      const metadata = this.parseYaml(yamlContent);
      return { metadata, content: frontmatterMatch[2] };
    }

    return { metadata: {}, content };
  }

  /**
   * Simple YAML parser for frontmatter
   */
  private parseYaml(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, '');
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const value = match[2].trim();
        if (value === 'true') {
          result[match[1]] = true;
        } else if (value === 'false') {
          result[match[1]] = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          result[match[1]] = Number(value);
        } else {
          result[match[1]] = value;
        }
      }
    }

    return result;
  }

  /**
   * Extract section content under a heading
   */
  extractSection(content: string, heading: string, level: number = 2): string | null {
    const escapedHeading = escapeRegex(heading);
    const headingPattern = new RegExp(
      `^${'#'.repeat(level)}\\s+${escapedHeading}\\s*$`,
      'm'
    );

    const lines = content.split('\n');
    const sectionLines: string[] = [];
    let inSection = false;

    for (const line of lines) {
      if (headingPattern.test(line)) {
        inSection = true;
        continue;
      }

      if (inSection) {
        const headingMatch = line.match(/^(#{1,6})\s+/);
        if (headingMatch && headingMatch[1].length <= level) {
          break;
        }
        sectionLines.push(line);
      }
    }

    return sectionLines.length > 0 ? sectionLines.join('\n').trim() : null;
  }

  /**
   * Extract current week number from content
   */
  extractCurrentWeek(content: string): number | null {
    const patterns = [
      /W(\d+)/i,
      /Week\s+(\d+)/i,
      /현재\s*주차.*?W?(\d+)/,
      /주차:\s*(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return parseInt(match[1]);
    }

    return null;
  }

  /**
   * Extract current cycle from content
   */
  extractCurrentCycle(content: string): string | null {
    const patterns = [
      /C(\d+)/i,
      /Cycle\s+(\d+)/i,
      /현재\s*Cycle.*?C?(\d+)/,
      /사이클:\s*C?(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return `C${match[1]}`;
    }

    return null;
  }

  /**
   * Extract metadata value from content
   */
  extractMetadataValue(content: string, key: string): string | null {
    const patterns = [
      new RegExp(`\\*\\*${key}\\*\\*:\\s*(.+)`, 'i'),
      new RegExp(`${key}:\\s*(.+)`, 'i'),
      new RegExp(`\\|\\s*\\*\\*${key}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }

    return null;
  }
}
