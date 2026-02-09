/**
 * Weekly breakdown parsing from Q-Task-Master format
 */

import { Task } from '../../types/models';
import { WeeklyBreakdown } from '../../types/data';
import { TaskParser } from './TaskParser';

export class WeeklyBreakdownParser {
  constructor(private taskParser: TaskParser) {}

  /**
   * Parse Q-Task-Master weekly breakdown sections
   */
  parseWeeklyBreakdowns(content: string): WeeklyBreakdown[] {
    const breakdowns: WeeklyBreakdown[] = [];

    const newTasksHeaders = ['🚀 이번 주 시작', 'Started this week', 'New this week', '🚀'];
    const dueTasksHeaders = ['📅 이번 주 마감', 'Due this week', 'Deadlines', '📅'];
    const milestonesHeaders = ['🎯 마일스톤', 'Milestones', '🎯'];

    const sectionPattern = /^## W(\d+)(?:~W(\d+))?\s*\(([^)]+)\)/gm;
    const sectionStarts: { weekNum: number; endWeekNum: number | null; weekRange: string; startIndex: number }[] = [];
    let sectionMatch;

    while ((sectionMatch = sectionPattern.exec(content)) !== null) {
      sectionStarts.push({
        weekNum: parseInt(sectionMatch[1]),
        endWeekNum: sectionMatch[2] ? parseInt(sectionMatch[2]) : null,
        weekRange: sectionMatch[3],
        startIndex: sectionMatch.index,
      });
    }

    for (let i = 0; i < sectionStarts.length; i++) {
      const sectionStart = sectionStarts[i];
      const sectionEnd = i + 1 < sectionStarts.length ? sectionStarts[i + 1].startIndex : content.length;
      const sectionContent = content.substring(sectionStart.startIndex, sectionEnd);

      const nestedPattern = /^### W(\d+)\s*\(([^)]+)\)/gm;
      const nestedSections: { weekNum: number; weekRange: string; startIndex: number }[] = [];
      let nestedMatch;

      while ((nestedMatch = nestedPattern.exec(sectionContent)) !== null) {
        nestedSections.push({
          weekNum: parseInt(nestedMatch[1]),
          weekRange: nestedMatch[2],
          startIndex: nestedMatch.index,
        });
      }

      if (nestedSections.length > 0) {
        for (let j = 0; j < nestedSections.length; j++) {
          const nestedStart = nestedSections[j];
          const nestedEnd = j + 1 < nestedSections.length ? nestedSections[j + 1].startIndex : sectionContent.length;
          const nestedContent = sectionContent.substring(nestedStart.startIndex, nestedEnd);

          const breakdown = this.parseWeekSection(
            nestedStart.weekNum,
            nestedStart.weekRange,
            nestedContent,
            newTasksHeaders,
            dueTasksHeaders,
            milestonesHeaders
          );
          breakdowns.push(breakdown);
        }
      } else {
        const breakdown = this.parseWeekSection(
          sectionStart.weekNum,
          sectionStart.weekRange,
          sectionContent,
          newTasksHeaders,
          dueTasksHeaders,
          milestonesHeaders
        );
        breakdowns.push(breakdown);
      }
    }

    breakdowns.sort((a, b) => a.weekNumber - b.weekNumber);
    return breakdowns;
  }

  /**
   * Parse a single week section into a WeeklyBreakdown
   */
  private parseWeekSection(
    weekNumber: number,
    weekRange: string,
    sectionContent: string,
    newTasksHeaders: string[],
    dueTasksHeaders: string[],
    milestonesHeaders: string[]
  ): WeeklyBreakdown {
    const newTasks = this.extractSubsectionTasks(sectionContent, newTasksHeaders);
    const dueTasks = this.extractSubsectionTasks(sectionContent, dueTasksHeaders);
    const milestones = this.extractSubsectionMilestones(sectionContent, milestonesHeaders);

    for (const task of newTasks) {
      task.weekNumber = weekNumber;
    }
    for (const task of dueTasks) {
      task.weekNumber = weekNumber;
    }

    return {
      weekNumber,
      weekRange,
      newTasks,
      dueTasks,
      milestones,
    };
  }

  /**
   * Extract tasks from a subsection identified by header patterns
   */
  private extractSubsectionTasks(sectionContent: string, headerPatterns: string[]): Task[] {
    const lines = sectionContent.split('\n');
    let inSubsection = false;
    const subsectionLines: string[] = [];

    for (const line of lines) {
      if (/^#{2,4}\s+/.test(line)) {
        const headerText = line.replace(/^#{2,4}\s+/, '');
        if (headerPatterns.some(pattern => headerText.includes(pattern))) {
          inSubsection = true;
          continue;
        } else if (inSubsection) {
          break;
        }
      }

      if (inSubsection) {
        const trimmed = line.trim();
        if (trimmed === '- (없음)' || trimmed === '- (none)') continue;
        subsectionLines.push(line);
      }
    }

    if (subsectionLines.length === 0) return [];

    return this.taskParser.extractTasks(subsectionLines.join('\n'));
  }

  /**
   * Extract milestone text items from a subsection
   */
  private extractSubsectionMilestones(sectionContent: string, headerPatterns: string[]): string[] {
    const lines = sectionContent.split('\n');
    let inSubsection = false;
    const milestones: string[] = [];

    for (const line of lines) {
      if (/^#{2,4}\s+/.test(line)) {
        const headerText = line.replace(/^#{2,4}\s+/, '');
        if (headerPatterns.some(pattern => headerText.includes(pattern))) {
          inSubsection = true;
          continue;
        } else if (inSubsection) {
          break;
        }
      }

      if (inSubsection) {
        const trimmed = line.trim();
        if (trimmed === '- (없음)' || trimmed === '- (none)') continue;
        if (trimmed.startsWith('-')) {
          const text = trimmed.replace(/^-\s*/, '').trim();
          if (text) milestones.push(text);
        }
      }
    }

    return milestones;
  }
}
