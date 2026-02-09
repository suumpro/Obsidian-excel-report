/**
 * Table parsing from markdown (generic, coordination, milestones, playbook)
 */

import { CoordinationItem, MilestoneItem, PlaybookItem } from '../../types/data';
import { ParsingConfig } from '../../types/config';
import { MetadataParser } from './MetadataParser';

export class TableParser {
  constructor(
    private parsingRules: ParsingConfig,
    private metadataParser: MetadataParser
  ) {}

  setParsingRules(rules: ParsingConfig): void {
    this.parsingRules = rules;
  }

  /**
   * Parse markdown table into array of objects
   */
  parseTable(content: string, sectionHeading?: string): Record<string, string>[] {
    let tableContent = content;
    if (sectionHeading) {
      const section = this.metadataParser.extractSection(content, sectionHeading);
      if (section) {
        tableContent = section;
      }
    }

    const lines = tableContent.split('\n').filter(line => line.includes('|'));
    if (lines.length < 2) return [];

    const headers = lines[0]
      .split('|')
      .filter(cell => cell.trim())
      .map(cell => cell.trim());

    const rows: Record<string, string>[] = [];
    for (let i = 2; i < lines.length; i++) {
      const cells = lines[i]
        .split('|')
        .map(cell => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      if (cells.length === headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = cells[idx];
        });
        rows.push(row);
      }
    }

    return rows;
  }

  /**
   * Parse coordination table from markdown content
   */
  parseCoordination(content: string): CoordinationItem[] {
    const items: CoordinationItem[] = [];
    const lines = content.split('\n');
    let inTable = false;
    let headerIndices: Record<string, number> = {};

    for (const line of lines) {
      if (!line.includes('|')) {
        inTable = false;
        continue;
      }

      const cells = line.split('|').map(c => c.trim()).filter(c => c);

      if (this.isCoordinationHeader(cells)) {
        inTable = true;
        const aliases = this.parsingRules.table.columnAliases;
        headerIndices = this.mapHeaderIndices(cells, [
          ['category', aliases.category || ['구분', 'Category', '분류']],
          ['content', aliases.content || ['협의 내용', '협의내용', '내용', 'Content']],
          ['priority', aliases.priority || ['우선순위', 'Priority', '중요도']],
          ['owner', aliases.owner || ['담당', 'Owner', '담당자']],
          ['deadline', aliases.deadline || ['기한', 'Deadline', '마감']],
          ['status', aliases.status || ['상태', 'Status']],
        ]);
        continue;
      }

      if (inTable && line.includes('---')) continue;

      if (inTable && cells.length >= 4) {
        const item: CoordinationItem = {
          category: cells[headerIndices['category'] ?? 0] || '',
          content: cells[headerIndices['content'] ?? 1] || '',
          priority: cells[headerIndices['priority'] ?? 2] || '',
          owner: cells[headerIndices['owner'] ?? 3] || '',
          deadline: cells[headerIndices['deadline'] ?? 4] || '',
          status: cells[headerIndices['status'] ?? 5] || '',
        };

        if (item.content) items.push(item);
      }
    }

    return items;
  }

  /**
   * Parse milestones table from markdown content
   */
  parseMilestones(content: string): MilestoneItem[] {
    const items: MilestoneItem[] = [];
    const lines = content.split('\n');
    let inTable = false;
    let headerIndices: Record<string, number> = {};

    for (const line of lines) {
      if (!line.includes('|')) {
        inTable = false;
        continue;
      }

      const cells = line.split('|').map(c => c.trim()).filter(c => c);

      if (this.isMilestoneHeader(cells)) {
        inTable = true;
        const aliases = this.parsingRules.table.columnAliases;
        headerIndices = this.mapHeaderIndices(cells, [
          ['date', aliases.date || ['날짜', 'Date', '일자']],
          ['name', aliases.name || ['마일스톤', 'Milestone', '이름', 'Name']],
          ['target', aliases.target || ['목표', 'Target', 'Goal']],
          ['status', aliases.status || ['상태', 'Status']],
          ['risk', aliases.risk || ['리스크', 'Risk', '위험']],
        ]);
        continue;
      }

      if (inTable && line.includes('---')) continue;

      if (inTable && cells.length >= 3) {
        const item: MilestoneItem = {
          date: cells[headerIndices['date'] ?? 0] || '',
          name: cells[headerIndices['name'] ?? 1] || '',
          target: cells[headerIndices['target'] ?? 2] || '',
          status: cells[headerIndices['status'] ?? 3] || '',
          risk: cells[headerIndices['risk'] ?? 4] || '',
        };

        if (item.name) items.push(item);
      }
    }

    return items;
  }

  /**
   * Parse playbook progress table from markdown content
   */
  parsePlaybook(content: string): PlaybookItem[] {
    const items: PlaybookItem[] = [];
    const lines = content.split('\n');
    let inTable = false;
    let headerIndices: Record<string, number> = {};

    for (const line of lines) {
      if (!line.includes('|')) {
        inTable = false;
        continue;
      }

      const cells = line.split('|').map(c => c.trim()).filter(c => c);

      if (this.isPlaybookHeader(cells)) {
        inTable = true;
        const aliases = this.parsingRules.table.columnAliases;
        headerIndices = this.mapHeaderIndices(cells, [
          ['name', aliases.name || ['항목', 'Item', 'Name', '이름']],
          ['target', aliases.target || ['목표', 'Target', 'Goal']],
          ['current', aliases.current || ['현재', 'Current', '진행']],
          ['percentage', aliases.percentage || ['비율', 'Percentage', '%', '진행률']],
          ['status', aliases.status || ['상태', 'Status']],
        ]);
        continue;
      }

      if (inTable && line.includes('---')) continue;

      if (inTable && cells.length >= 3) {
        const targetStr = cells[headerIndices['target'] ?? 1] || '0';
        const currentStr = cells[headerIndices['current'] ?? 2] || '0';
        const percentageStr = cells[headerIndices['percentage'] ?? 3] || '0';

        const item: PlaybookItem = {
          name: cells[headerIndices['name'] ?? 0] || '',
          target: this.parseNumber(targetStr),
          current: this.parseNumber(currentStr),
          percentage: this.parseNumber(percentageStr),
          status: cells[headerIndices['status'] ?? 4] || '',
        };

        if (item.percentage === 0 && item.target > 0) {
          item.percentage = Math.round((item.current / item.target) * 100);
        }

        if (item.name) items.push(item);
      }
    }

    return items;
  }

  private isCoordinationHeader(cells: string[]): boolean {
    const headerKeywords = this.parsingRules.table.coordinationHeaders;
    return cells.some(cell =>
      headerKeywords.some(kw => cell.toLowerCase().includes(kw.toLowerCase()))
    );
  }

  private isMilestoneHeader(cells: string[]): boolean {
    const headerKeywords = this.parsingRules.table.milestoneHeaders;
    return cells.some(cell =>
      headerKeywords.some(kw => cell.toLowerCase().includes(kw.toLowerCase()))
    );
  }

  private isPlaybookHeader(cells: string[]): boolean {
    const headerKeywords = this.parsingRules.table.playbookHeaders;
    return cells.some(cell =>
      headerKeywords.some(kw => cell.toLowerCase().includes(kw.toLowerCase()))
    );
  }

  private mapHeaderIndices(
    headers: string[],
    mappings: [string, string[]][]
  ): Record<string, number> {
    const indices: Record<string, number> = {};

    for (const [key, aliases] of mappings) {
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase();
        if (aliases.some(alias => header.includes(alias.toLowerCase()))) {
          indices[key] = i;
          break;
        }
      }
    }

    return indices;
  }

  private parseNumber(str: string): number {
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}
