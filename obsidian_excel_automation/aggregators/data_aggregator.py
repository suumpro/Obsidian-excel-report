"""
Main data aggregator - coordinates loading data from multiple sources
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

from ..config import Config
from ..parsers.markdown_parser import MarkdownParser, Task, Feature, Blocker
from ..utils.logger import logger


@dataclass
class DashboardData:
    """Dashboard data container"""
    current_week: int
    current_cycle: str
    current_date: str
    p0_tasks: List[Task] = field(default_factory=list)
    p1_tasks: List[Task] = field(default_factory=list)
    p2_tasks: List[Task] = field(default_factory=list)
    all_tasks: List[Task] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RoadmapData:
    """Roadmap data container"""
    features: List[Feature] = field(default_factory=list)
    features_by_priority: Dict[str, List[Feature]] = field(default_factory=dict)
    features_by_status: Dict[str, List[Feature]] = field(default_factory=dict)
    q1_features: List[Feature] = field(default_factory=list)
    q2_features: List[Feature] = field(default_factory=list)
    q3_features: List[Feature] = field(default_factory=list)
    q4_features: List[Feature] = field(default_factory=list)


@dataclass
class BlockerData:
    """Blocker data container"""
    all_blockers: List[Blocker] = field(default_factory=list)
    high_priority: List[Blocker] = field(default_factory=list)
    medium_priority: List[Blocker] = field(default_factory=list)
    low_priority: List[Blocker] = field(default_factory=list)
    by_owner: Dict[str, List[Blocker]] = field(default_factory=dict)


@dataclass
class QuarterlyData:
    """Quarterly status data container"""
    quarter: int
    p0_tasks: List[Task] = field(default_factory=list)
    p1_tasks: List[Task] = field(default_factory=list)
    p2_tasks: List[Task] = field(default_factory=list)
    completed_tasks: List[Task] = field(default_factory=list)
    pending_tasks: List[Task] = field(default_factory=list)
    total_tasks: int = 0
    completion_rate: float = 0.0
    # P0 breakdown
    p0_total: int = 0
    p0_completed: int = 0
    p0_in_progress: int = 0
    p0_pending: int = 0
    # P1 breakdown
    p1_total: int = 0
    p1_completed: int = 0
    p1_in_progress: int = 0
    p1_pending: int = 0
    # P2 breakdown
    p2_total: int = 0
    p2_completed: int = 0
    p2_in_progress: int = 0
    p2_pending: int = 0


class DataAggregator:
    """Main aggregator for loading and organizing Obsidian data"""

    def __init__(self, config: Config):
        self.config = config
        self.parser = MarkdownParser()

    def load_dashboard_data(self) -> DashboardData:
        """Load PM Dashboard data"""
        logger.info("Loading dashboard data...")

        dashboard_path = self.config.get_full_path("dashboard")
        if not dashboard_path.exists():
            logger.warning(f"Dashboard file not found: {dashboard_path}")
            return DashboardData(current_week=0, current_cycle="C1", current_date="")

        metadata, content = self.parser.parse_file(dashboard_path)

        # Extract current week/cycle
        current_week = self.parser.extract_current_week(content) or 0
        current_cycle = self.parser.extract_current_cycle(content) or "C1"

        # Extract all tasks
        all_tasks = self.parser.extract_tasks(content)

        # Categorize by priority
        p0_tasks = [t for t in all_tasks if t.priority == 'P0']
        p1_tasks = [t for t in all_tasks if t.priority == 'P1']
        p2_tasks = [t for t in all_tasks if t.priority == 'P2']

        logger.info(f"Found {len(all_tasks)} tasks (P0: {len(p0_tasks)}, P1: {len(p1_tasks)}, P2: {len(p2_tasks)})")

        return DashboardData(
            current_week=current_week,
            current_cycle=current_cycle,
            current_date=metadata.get('last_updated', ''),
            p0_tasks=p0_tasks,
            p1_tasks=p1_tasks,
            p2_tasks=p2_tasks,
            all_tasks=all_tasks,
            metadata=metadata
        )

    def load_quarterly_data(self, quarter: int) -> QuarterlyData:
        """Load quarterly status data"""
        logger.info(f"Loading Q{quarter} data...")

        q_key = f"q{quarter}_status"
        q_path = self.config.get_full_path(q_key)

        if not q_path.exists():
            logger.warning(f"Q{quarter} file not found: {q_path}")
            return QuarterlyData(quarter=quarter)

        metadata, content = self.parser.parse_file(q_path)

        # Extract tasks
        all_tasks = self.parser.extract_tasks(content)
        p0_tasks = [t for t in all_tasks if t.priority == 'P0']
        p1_tasks = [t for t in all_tasks if t.priority == 'P1']
        p2_tasks = [t for t in all_tasks if t.priority == 'P2']

        # Categorize by status
        completed = [t for t in all_tasks if t.status]
        pending = [t for t in all_tasks if not t.status]

        # Calculate completion rate
        total = len(all_tasks)
        completion_rate = (len(completed) / total * 100) if total > 0 else 0.0

        # P0 breakdown
        p0_completed = len([t for t in p0_tasks if t.status])
        p0_pending = len([t for t in p0_tasks if not t.status])
        p0_in_progress = p0_pending  # Simplified: pending = in progress

        # P1 breakdown
        p1_completed = len([t for t in p1_tasks if t.status])
        p1_pending = len([t for t in p1_tasks if not t.status])
        p1_in_progress = p1_pending

        # P2 breakdown
        p2_completed = len([t for t in p2_tasks if t.status])
        p2_pending = len([t for t in p2_tasks if not t.status])
        p2_in_progress = p2_pending

        logger.info(f"Q{quarter}: {len(completed)}/{total} tasks completed ({completion_rate:.1f}%)")
        logger.info(f"  P0: {p0_completed}/{len(p0_tasks)}, P1: {p1_completed}/{len(p1_tasks)}, P2: {p2_completed}/{len(p2_tasks)}")

        return QuarterlyData(
            quarter=quarter,
            p0_tasks=p0_tasks,
            p1_tasks=p1_tasks,
            p2_tasks=p2_tasks,
            completed_tasks=completed,
            pending_tasks=pending,
            total_tasks=total,
            completion_rate=completion_rate,
            # P0 breakdown
            p0_total=len(p0_tasks),
            p0_completed=p0_completed,
            p0_in_progress=p0_in_progress,
            p0_pending=p0_pending,
            # P1 breakdown
            p1_total=len(p1_tasks),
            p1_completed=p1_completed,
            p1_in_progress=p1_in_progress,
            p1_pending=p1_pending,
            # P2 breakdown
            p2_total=len(p2_tasks),
            p2_completed=p2_completed,
            p2_in_progress=p2_in_progress,
            p2_pending=p2_pending
        )

    def load_roadmap_data(self) -> RoadmapData:
        """Load roadmap feature data"""
        logger.info("Loading roadmap data...")

        roadmap_path = self.config.get_full_path("roadmap")
        if not roadmap_path.exists():
            logger.warning(f"Roadmap file not found: {roadmap_path}")
            return RoadmapData()

        metadata, content = self.parser.parse_file(roadmap_path)

        # Parse feature table from roadmap
        features = self._parse_features_from_roadmap(content)

        # Organize by priority
        by_priority = {
            'P0': [f for f in features if f.priority == 'P0'],
            'P1': [f for f in features if f.priority == 'P1'],
            'P2': [f for f in features if f.priority == 'P2'],
        }

        # Organize by status
        by_status = {}
        for f in features:
            if f.status not in by_status:
                by_status[f.status] = []
            by_status[f.status].append(f)

        # Organize by quarter (based on completion date)
        q1_features = [f for f in features if f.completion_date and 'Q1' in f.completion_date or '3월' in (f.completion_date or '')]
        q2_features = [f for f in features if f.completion_date and 'Q2' in f.completion_date or '6월' in (f.completion_date or '')]
        q3_features = [f for f in features if f.completion_date and 'Q3' in f.completion_date or '9월' in (f.completion_date or '')]
        q4_features = [f for f in features if f.completion_date and 'Q4' in f.completion_date or '12월' in (f.completion_date or '')]

        logger.info(f"Found {len(features)} features")

        return RoadmapData(
            features=features,
            features_by_priority=by_priority,
            features_by_status=by_status,
            q1_features=q1_features,
            q2_features=q2_features,
            q3_features=q3_features,
            q4_features=q4_features
        )

    def load_blocker_data(self) -> BlockerData:
        """Load blocker tracking data"""
        logger.info("Loading blocker data...")

        blocker_path = self.config.get_full_path("blockers")
        if not blocker_path.exists():
            logger.warning(f"Blocker file not found: {blocker_path}")
            return BlockerData()

        metadata, content = self.parser.parse_file(blocker_path)

        # Parse blockers from sections
        blockers = self._parse_blockers(content)

        # Categorize by priority
        high_priority = [b for b in blockers if b.priority == '높음' or b.priority == 'High']
        medium_priority = [b for b in blockers if b.priority == '중간' or b.priority == 'Medium']
        low_priority = [b for b in blockers if b.priority == '낮음' or b.priority == 'Low']

        # Categorize by owner
        by_owner = {}
        for b in blockers:
            if b.owner not in by_owner:
                by_owner[b.owner] = []
            by_owner[b.owner].append(b)

        logger.info(f"Found {len(blockers)} blockers (High: {len(high_priority)}, Medium: {len(medium_priority)}, Low: {len(low_priority)})")

        return BlockerData(
            all_blockers=blockers,
            high_priority=high_priority,
            medium_priority=medium_priority,
            low_priority=low_priority,
            by_owner=by_owner
        )

    def _parse_features_from_roadmap(self, content: str) -> List[Feature]:
        """Parse features from roadmap markdown content"""
        features = []

        # Look for feature tables or lists
        # Pattern: A1, A2, B1, B2, etc.
        feature_pattern = r'([AB]\d+)'

        lines = content.split('\n')
        for line in lines:
            match = re.search(feature_pattern, line)
            if match and '|' in line:  # Table row
                # Parse table row
                cells = [c.strip() for c in line.split('|') if c.strip()]
                if len(cells) >= 4:
                    feature = Feature(
                        id=cells[0] if re.match(r'[AB]\d+', cells[0]) else '',
                        name=cells[1] if len(cells) > 1 else '',
                        priority=cells[2] if len(cells) > 2 else '',
                        status=cells[3] if len(cells) > 3 else '',
                        start_date=cells[4] if len(cells) > 4 else None,
                        completion_date=cells[5] if len(cells) > 5 else None,
                        progress=0
                    )
                    if feature.id:  # Only add if we have a valid ID
                        features.append(feature)

        return features

    def _parse_blockers(self, content: str) -> List[Blocker]:
        """Parse blockers from markdown content"""
        blockers = []

        # Extract high/medium/low priority sections
        sections = {
            '높음': self.parser.extract_section(content, '높음 우선순위', 3) or '',
            '중간': self.parser.extract_section(content, '중간 우선순위', 3) or '',
            '낮음': self.parser.extract_section(content, '낮음 우선순위', 3) or '',
        }

        for priority, section_content in sections.items():
            if not section_content:
                continue

            # Look for blocker headings (### B6, ### B4, etc.)
            blocker_pattern = r'###\s+(B\d+)\s+(.+?)(?:\n|$)'
            matches = re.finditer(blocker_pattern, section_content)

            for match in matches:
                blocker_id = match.group(1)
                blocker_title = match.group(2)

                # Extract blocker details from following table
                blocker_section = section_content[match.end():]
                next_heading = re.search(r'\n###', blocker_section)
                if next_heading:
                    blocker_section = blocker_section[:next_heading.start()]

                # Parse table
                status = self.parser.extract_metadata_value(blocker_section, '상태') or ''
                owner = self.parser.extract_metadata_value(blocker_section, '담당') or ''
                target = self.parser.extract_metadata_value(blocker_section, '목표 해결일') or ''
                impact = self.parser.extract_metadata_value(blocker_section, '영향 범위') or ''

                blocker = Blocker(
                    id=blocker_id,
                    title=blocker_title,
                    priority=priority,
                    status=status,
                    owner=owner,
                    target_date=target,
                    impact=impact,
                    description=blocker_section[:200]  # First 200 chars as description
                )
                blockers.append(blocker)

        return blockers


# Import re for regex operations
import re
