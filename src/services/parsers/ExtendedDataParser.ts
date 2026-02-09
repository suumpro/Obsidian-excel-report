/**
 * Extended data parsing (customer requests, Mermaid Gantt)
 */

import { CustomerRequest, GanttItem } from '../../types/data';

export class ExtendedDataParser {
  /**
   * Parse customer requests from markdown content
   */
  parseCustomerRequests(content: string): CustomerRequest[] {
    const requests: CustomerRequest[] = [];

    const sectionPattern = /^## (?:우선순위|Priority)\s+(\d+)/gm;
    const sectionStarts: { priority: number; startIndex: number }[] = [];
    let sectionMatch;

    while ((sectionMatch = sectionPattern.exec(content)) !== null) {
      sectionStarts.push({
        priority: parseInt(sectionMatch[1]),
        startIndex: sectionMatch.index,
      });
    }

    for (let i = 0; i < sectionStarts.length; i++) {
      const sectionStart = sectionStarts[i];
      const sectionEnd = i + 1 < sectionStarts.length ? sectionStarts[i + 1].startIndex : content.length;
      const sectionContent = content.substring(sectionStart.startIndex, sectionEnd);

      const tableRows = this.parseTableFlexible(sectionContent);

      for (const row of tableRows) {
        const request: CustomerRequest = {
          id: row['No.'] || row['no.'] || row['ID'] || row['id'] || '',
          title: row['요청 내용'] || row['요청내용'] || row['Title'] || row['title'] || row['Request'] || '',
          priority: sectionStart.priority,
          status: row['상태'] || row['Status'] || row['status'] || '',
          linkedFeature: row['반영 기능'] || row['반영기능'] || row['Feature'] || row['feature'] || undefined,
          dueDate: row['분기'] || row['Quarter'] || row['Due'] || row['기한'] || undefined,
          description: row['상세'] || row['Description'] || row['description'] || undefined,
        };

        if (request.id || request.title) {
          requests.push(request);
        }
      }
    }

    return requests;
  }

  /**
   * Parse Mermaid Gantt chart blocks from markdown content
   */
  parseMermaidGantt(content: string): GanttItem[] {
    const items: GanttItem[] = [];

    const mermaidPattern = /```mermaid\s*\n([\s\S]*?)```/g;
    let blockMatch;

    while ((blockMatch = mermaidPattern.exec(content)) !== null) {
      const blockContent = blockMatch[1];

      if (!blockContent.trim().startsWith('gantt')) continue;

      const lines = blockContent.split('\n');
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (
          trimmed.startsWith('gantt') ||
          trimmed.startsWith('title ') ||
          trimmed.startsWith('dateFormat ') ||
          trimmed.startsWith('axisFormat ') ||
          trimmed.startsWith('tickInterval ') ||
          trimmed === '' ||
          trimmed.startsWith('%%')
        ) {
          continue;
        }

        const sectionMatch = trimmed.match(/^section\s+(.+)$/);
        if (sectionMatch) {
          currentSection = sectionMatch[1].trim();
          continue;
        }

        const taskMatch = trimmed.match(/^(.+?)\s*:(.+)$/);
        if (taskMatch) {
          const name = taskMatch[1].trim();
          const specPart = taskMatch[2].trim();
          const parts = specPart.split(',').map(p => p.trim());

          let status: 'done' | 'active' | 'planned' | 'milestone' = 'planned';
          let startDate = '';
          let endDate = '';

          if (parts.length >= 2) {
            const firstPart = parts[0].toLowerCase();

            if (['done', 'active', 'milestone'].includes(firstPart)) {
              status = firstPart as 'done' | 'active' | 'milestone';
              startDate = parts[1] || '';
              endDate = parts[2] || '';
            } else if (firstPart.match(/^\d{4}-\d{2}-\d{2}$/)) {
              startDate = parts[0];
              endDate = parts[1] || '';
            } else {
              startDate = parts[1] || parts[0] || '';
              endDate = parts[2] || parts[1] || '';
            }
          }

          items.push({
            name,
            section: currentSection,
            status,
            startDate,
            endDate,
          });
        }
      }
    }

    return items;
  }

  /**
   * Parse a markdown table with flexible column detection
   */
  private parseTableFlexible(content: string): Record<string, string>[] {
    const lines = content.split('\n').filter(line => line.includes('|'));
    if (lines.length < 2) return [];

    let headerLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].match(/^\s*\|[\s-:|]+\|\s*$/)) {
        headerLine = i;
        break;
      }
    }
    if (headerLine === -1) return [];

    const headers = lines[headerLine]
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);

    const rows: Record<string, string>[] = [];

    for (let i = headerLine + 1; i < lines.length; i++) {
      if (lines[i].match(/^\s*\|[\s-:|]+\|\s*$/)) continue;

      const cells = lines[i]
        .split('|')
        .map(cell => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      if (cells.length > 0) {
        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length && j < cells.length; j++) {
          row[headers[j]] = cells[j];
        }
        rows.push(row);
      }
    }

    return rows;
  }
}
