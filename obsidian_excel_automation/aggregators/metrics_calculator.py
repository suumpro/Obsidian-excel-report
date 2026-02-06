"""
Metrics calculator for calculating completion rates, trends, and statistics
"""

from typing import List, Dict, Any
from dataclasses import dataclass

from .data_aggregator import DashboardData, RoadmapData, QuarterlyData, BlockerData
from ..parsers.markdown_parser import Task, Feature, Blocker


@dataclass
class Metrics:
    """Container for calculated metrics"""
    # Task metrics
    total_tasks: int = 0
    completed_tasks: int = 0
    pending_tasks: int = 0
    completion_rate: float = 0.0

    # Priority breakdown
    p0_total: int = 0
    p0_completed: int = 0
    p0_completion_rate: float = 0.0

    p1_total: int = 0
    p1_completed: int = 0
    p1_completion_rate: float = 0.0

    p2_total: int = 0
    p2_completed: int = 0
    p2_completion_rate: float = 0.0

    # Feature metrics
    total_features: int = 0
    features_in_progress: int = 0
    features_completed: int = 0
    features_pending: int = 0

    # Blocker metrics
    total_blockers: int = 0
    high_priority_blockers: int = 0
    medium_priority_blockers: int = 0
    low_priority_blockers: int = 0
    resolved_blockers: int = 0

    # Additional metrics
    overdue_tasks: int = 0
    this_week_tasks: int = 0


class MetricsCalculator:
    """Calculate various metrics from aggregated data"""

    @staticmethod
    def calculate_task_metrics(tasks: List[Task]) -> Dict[str, Any]:
        """Calculate metrics for a list of tasks"""
        if not tasks:
            return {
                'total': 0,
                'completed': 0,
                'pending': 0,
                'completion_rate': 0.0
            }

        completed = [t for t in tasks if t.status]
        pending = [t for t in tasks if not t.status]

        completion_rate = (len(completed) / len(tasks) * 100) if tasks else 0.0

        return {
            'total': len(tasks),
            'completed': len(completed),
            'pending': len(pending),
            'completion_rate': completion_rate
        }

    @staticmethod
    def calculate_dashboard_metrics(dashboard: DashboardData) -> Metrics:
        """Calculate metrics from dashboard data"""
        metrics = Metrics()

        # Overall task metrics
        all_tasks = dashboard.all_tasks
        metrics.total_tasks = len(all_tasks)
        metrics.completed_tasks = len([t for t in all_tasks if t.status])
        metrics.pending_tasks = len([t for t in all_tasks if not t.status])
        metrics.completion_rate = (
            (metrics.completed_tasks / metrics.total_tasks * 100)
            if metrics.total_tasks > 0 else 0.0
        )

        # P0 metrics
        p0_metrics = MetricsCalculator.calculate_task_metrics(dashboard.p0_tasks)
        metrics.p0_total = p0_metrics['total']
        metrics.p0_completed = p0_metrics['completed']
        metrics.p0_completion_rate = p0_metrics['completion_rate']

        # P1 metrics
        p1_metrics = MetricsCalculator.calculate_task_metrics(dashboard.p1_tasks)
        metrics.p1_total = p1_metrics['total']
        metrics.p1_completed = p1_metrics['completed']
        metrics.p1_completion_rate = p1_metrics['completion_rate']

        # P2 metrics
        p2_metrics = MetricsCalculator.calculate_task_metrics(dashboard.p2_tasks)
        metrics.p2_total = p2_metrics['total']
        metrics.p2_completed = p2_metrics['completed']
        metrics.p2_completion_rate = p2_metrics['completion_rate']

        return metrics

    @staticmethod
    def calculate_roadmap_metrics(roadmap: RoadmapData) -> Metrics:
        """Calculate metrics from roadmap data"""
        metrics = Metrics()

        features = roadmap.features
        metrics.total_features = len(features)

        # Count by status
        metrics.features_in_progress = len([f for f in features if '진행' in f.status or 'progress' in f.status.lower()])
        metrics.features_completed = len([f for f in features if '완료' in f.status or 'completed' in f.status.lower()])
        metrics.features_pending = len([f for f in features if '대기' in f.status or 'pending' in f.status.lower()])

        return metrics

    @staticmethod
    def calculate_blocker_metrics(blocker_data: BlockerData) -> Metrics:
        """Calculate metrics from blocker data"""
        metrics = Metrics()

        metrics.total_blockers = len(blocker_data.all_blockers)
        metrics.high_priority_blockers = len(blocker_data.high_priority)
        metrics.medium_priority_blockers = len(blocker_data.medium_priority)
        metrics.low_priority_blockers = len(blocker_data.low_priority)

        # Count resolved blockers
        metrics.resolved_blockers = len([
            b for b in blocker_data.all_blockers
            if '✅' in b.status or '해결' in b.status or 'resolved' in b.status.lower()
        ])

        return metrics

    @staticmethod
    def calculate_quarterly_metrics(quarterly: QuarterlyData) -> Metrics:
        """Calculate metrics from quarterly data"""
        metrics = Metrics()

        metrics.total_tasks = quarterly.total_tasks
        metrics.completed_tasks = len(quarterly.completed_tasks)
        metrics.pending_tasks = len(quarterly.pending_tasks)
        metrics.completion_rate = quarterly.completion_rate

        # P0/P1 breakdown
        p0_metrics = MetricsCalculator.calculate_task_metrics(quarterly.p0_tasks)
        metrics.p0_total = p0_metrics['total']
        metrics.p0_completed = p0_metrics['completed']
        metrics.p0_completion_rate = p0_metrics['completion_rate']

        p1_metrics = MetricsCalculator.calculate_task_metrics(quarterly.p1_tasks)
        metrics.p1_total = p1_metrics['total']
        metrics.p1_completed = p1_metrics['completed']
        metrics.p1_completion_rate = p1_metrics['completion_rate']

        return metrics

    @staticmethod
    def calculate_combined_metrics(
        dashboard: DashboardData,
        roadmap: RoadmapData,
        blocker_data: BlockerData,
        quarterly: QuarterlyData = None
    ) -> Metrics:
        """Calculate combined metrics from all data sources"""
        metrics = Metrics()

        # Dashboard metrics
        dashboard_metrics = MetricsCalculator.calculate_dashboard_metrics(dashboard)
        metrics.total_tasks = dashboard_metrics.total_tasks
        metrics.completed_tasks = dashboard_metrics.completed_tasks
        metrics.pending_tasks = dashboard_metrics.pending_tasks
        metrics.completion_rate = dashboard_metrics.completion_rate
        metrics.p0_total = dashboard_metrics.p0_total
        metrics.p0_completed = dashboard_metrics.p0_completed
        metrics.p0_completion_rate = dashboard_metrics.p0_completion_rate
        metrics.p1_total = dashboard_metrics.p1_total
        metrics.p1_completed = dashboard_metrics.p1_completed
        metrics.p1_completion_rate = dashboard_metrics.p1_completion_rate
        metrics.p2_total = dashboard_metrics.p2_total
        metrics.p2_completed = dashboard_metrics.p2_completed
        metrics.p2_completion_rate = dashboard_metrics.p2_completion_rate

        # Roadmap metrics
        roadmap_metrics = MetricsCalculator.calculate_roadmap_metrics(roadmap)
        metrics.total_features = roadmap_metrics.total_features
        metrics.features_in_progress = roadmap_metrics.features_in_progress
        metrics.features_completed = roadmap_metrics.features_completed
        metrics.features_pending = roadmap_metrics.features_pending

        # Blocker metrics
        blocker_metrics = MetricsCalculator.calculate_blocker_metrics(blocker_data)
        metrics.total_blockers = blocker_metrics.total_blockers
        metrics.high_priority_blockers = blocker_metrics.high_priority_blockers
        metrics.medium_priority_blockers = blocker_metrics.medium_priority_blockers
        metrics.low_priority_blockers = blocker_metrics.low_priority_blockers
        metrics.resolved_blockers = blocker_metrics.resolved_blockers

        return metrics

    @staticmethod
    def format_percentage(value: float, decimals: int = 1) -> str:
        """Format percentage value"""
        return f"{value:.{decimals}f}%"

    @staticmethod
    def get_progress_bar(current: int, total: int, width: int = 10) -> str:
        """Generate a text-based progress bar"""
        if total == 0:
            return "░" * width

        filled = int((current / total) * width)
        return "█" * filled + "░" * (width - filled)
