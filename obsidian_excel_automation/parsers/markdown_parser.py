"""
Markdown parser for Obsidian files
Handles frontmatter, sections, tasks, tables, and Obsidian-specific syntax
"""

import re
import frontmatter
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path


@dataclass
class Task:
    """Represents a task from markdown"""
    content: str
    status: bool  # True if completed
    tags: List[str] = field(default_factory=list)
    priority: Optional[str] = None  # P0, P1, P2
    due_date: Optional[datetime] = None
    category: Optional[str] = None
    owner: Optional[str] = None
    raw_line: str = ""

    @classmethod
    def from_markdown(cls, line: str) -> Optional['Task']:
        """Parse a task from a markdown line"""
        # Pattern: - [ ] or - [x] or - [X]
        task_pattern = r'^(\s*-\s*\[([ xX])\])\s+(.+)$'
        match = re.match(task_pattern, line)

        if not match:
            return None

        checkbox = match.group(2)
        content_part = match.group(3)

        # Extract status
        is_completed = checkbox.lower() == 'x'

        # Extract tags (#tag)
        tags = re.findall(r'#([\w/-]+)', content_part)

        # Extract priority (⏫ P0, 🔼 P1, 🔽 P2)
        priority = None
        if '⏫' in content_part or 'P0' in tags:
            priority = 'P0'
        elif '🔼' in content_part or 'P1' in tags:
            priority = 'P1'
        elif '🔽' in content_part or 'P2' in tags:
            priority = 'P2'

        # Extract due date (📅 YYYY-MM-DD)
        due_date = None
        date_match = re.search(r'📅\s*(\d{4}-\d{2}-\d{2})', content_part)
        if date_match:
            try:
                due_date = datetime.strptime(date_match.group(1), '%Y-%m-%d')
            except ValueError:
                pass

        # Clean content (remove emojis, dates, etc. for display)
        clean_content = content_part
        clean_content = re.sub(r'⏫|🔼|🔽|📅\s*\d{4}-\d{2}-\d{2}', '', clean_content)
        clean_content = re.sub(r'#[\w/-]+', '', clean_content).strip()

        return cls(
            content=clean_content,
            status=is_completed,
            tags=tags,
            priority=priority,
            due_date=due_date,
            raw_line=line
        )


@dataclass
class Feature:
    """Represents a feature from roadmap"""
    id: str  # A1, B2, etc.
    name: str
    priority: str  # P0, P1, P2
    status: str  # 진행중, 대기, 완료
    start_date: Optional[str] = None
    completion_date: Optional[str] = None
    progress: int = 0  # 0-100
    cycle: Optional[str] = None  # C1, C2, C3
    blocker: Optional[str] = None


@dataclass
class Blocker:
    """Represents a blocker"""
    id: str
    title: str
    priority: str  # 높음, 중간, 낮음
    status: str  # 🔄 진행중, ⚠️ 미해결, ✅ 해결
    owner: str  # Lawson, 내부
    target_date: str
    impact: str
    description: Optional[str] = None


class MarkdownParser:
    """Parses Obsidian markdown files"""

    @staticmethod
    def parse_file(file_path: Path) -> Tuple[Dict[str, Any], str]:
        """
        Parse a markdown file with frontmatter

        Returns:
            (frontmatter_dict, content_string)
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            post = frontmatter.load(f)

        return post.metadata, post.content

    @staticmethod
    def extract_section(content: str, heading: str, level: int = 2) -> Optional[str]:
        """
        Extract content under a specific heading

        Args:
            content: Markdown content
            heading: Heading text to find
            level: Heading level (1-6, default 2 for ##)

        Returns:
            Section content or None if not found
        """
        # Pattern: ##+ Heading
        heading_pattern = f"^{'#' * level}\\s+{re.escape(heading)}\\s*$"

        lines = content.split('\n')
        section_lines = []
        in_section = False
        section_level = level

        for line in lines:
            if re.match(heading_pattern, line, re.MULTILINE):
                in_section = True
                continue

            if in_section:
                # Check if we hit another heading of same or higher level
                heading_match = re.match(r'^(#{1,6})\s+', line)
                if heading_match:
                    found_level = len(heading_match.group(1))
                    if found_level <= section_level:
                        break  # End of this section

                section_lines.append(line)

        return '\n'.join(section_lines).strip() if section_lines else None

    @staticmethod
    def extract_tasks(content: str, filters: Optional[Dict[str, Any]] = None) -> List[Task]:
        """
        Extract tasks from markdown content

        Args:
            content: Markdown content
            filters: Optional filters (priority, status, tags)

        Returns:
            List of Task objects
        """
        lines = content.split('\n')
        tasks = []

        for line in lines:
            task = Task.from_markdown(line)
            if task:
                # Apply filters
                if filters:
                    if 'priority' in filters and task.priority != filters['priority']:
                        continue
                    if 'status' in filters and task.status != filters['status']:
                        continue
                    if 'tags' in filters:
                        required_tags = set(filters['tags'])
                        task_tags = set(task.tags)
                        if not required_tags.issubset(task_tags):
                            continue

                tasks.append(task)

        return tasks

    @staticmethod
    def parse_table(content: str, section_heading: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Parse markdown table into list of dicts

        Args:
            content: Markdown content (or section content)
            section_heading: If provided, first extract section

        Returns:
            List of dictionaries (one per row)
        """
        if section_heading:
            content = MarkdownParser.extract_section(content, section_heading) or ""

        # Find table
        lines = content.split('\n')
        table_lines = []
        in_table = False

        for line in lines:
            if '|' in line:
                in_table = True
                table_lines.append(line)
            elif in_table and line.strip() == '':
                break  # End of table

        if not table_lines or len(table_lines) < 2:
            return []

        # Parse header
        header_line = table_lines[0]
        headers = [cell.strip() for cell in header_line.split('|') if cell.strip()]

        # Skip separator line (|---|---|)
        # Parse data rows
        rows = []
        for line in table_lines[2:]:  # Skip header and separator
            if not line.strip() or line.strip().startswith('|---'):
                continue

            cells = [cell.strip() for cell in line.split('|') if cell.strip() or cell]
            if len(cells) == len(headers):
                row_dict = {headers[i]: cells[i] for i in range(len(headers))}
                rows.append(row_dict)

        return rows

    @staticmethod
    def extract_metadata_value(content: str, key: str) -> Optional[str]:
        """
        Extract a metadata value from content

        Patterns supported:
        - **Key**: Value
        - Key: Value
        - | **Key** | Value |

        Args:
            content: Markdown content
            key: Metadata key to find

        Returns:
            Value string or None
        """
        # Pattern 1: **Key**: Value
        pattern1 = fr'\\*\\*{re.escape(key)}\\*\\*:\s*(.+?)(?:\n|$)'
        match = re.search(pattern1, content, re.MULTILINE)
        if match:
            return match.group(1).strip()

        # Pattern 2: Key: Value
        pattern2 = fr'^{re.escape(key)}:\s*(.+?)(?:\n|$)'
        match = re.search(pattern2, content, re.MULTILINE)
        if match:
            return match.group(1).strip()

        # Pattern 3: | **Key** | Value |
        pattern3 = fr'\\|\\s*\\*\\*{re.escape(key)}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|'
        match = re.search(pattern3, content, re.MULTILINE)
        if match:
            return match.group(1).strip()

        return None

    @staticmethod
    def extract_current_week(content: str) -> Optional[int]:
        """Extract current week number from dashboard content"""
        # Look for patterns like: W5, Week 5, 현재 주차: W5
        patterns = [
            r'W(\d+)',
            r'Week\s+(\d+)',
            r'현재\s*주차.*?W?(\d+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return int(match.group(1))

        return None

    @staticmethod
    def extract_current_cycle(content: str) -> Optional[str]:
        """Extract current cycle from dashboard content"""
        # Look for patterns like: C2, Cycle 2, 현재 Cycle: C2
        patterns = [
            r'C(\d+)',
            r'Cycle\s+(\d+)',
            r'현재\s*Cycle.*?C?(\d+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return f"C{match.group(1)}"

        return None
