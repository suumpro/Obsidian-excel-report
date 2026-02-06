# Design Document: Obsidian-Excel System Optimization

**Feature**: obsidian-excel-optimization
**Phase**: Design
**Created**: 2026-02-03
**Status**: Design Complete
**Plan Reference**: `docs/OPTIMIZATION_PLAN.md`

---

## 1. Design Overview

### 1.1 Purpose

Enhance the existing Obsidian-Excel automation system from MVP (80% complete) to production-grade (100% complete) with:
- Complete feature set (all 4 report types)
- Visual enhancements (charts and graphs)
- Performance optimizations (50%+ faster)
- Production-grade quality (85%+ test coverage)

### 1.2 Scope

**In Scope**:
- Implement 3 missing report types (quarterly, feature, blocker)
- Add 6+ chart types to reports
- Implement caching and parallel processing
- Add comprehensive unit and integration tests
- Performance benchmarking

**Out of Scope** (Future):
- Bidirectional Excel → Obsidian sync
- AI-powered insights
- Real-time collaboration features
- Jira/Linear integration

### 1.3 Success Criteria

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Report types | 1/4 (25%) | 4/4 (100%) | P0 |
| Generation time | 0.6s | <0.3s | P1 |
| Test coverage | 0% | 85% | P1 |
| Charts | 0 | 6+ | P1 |

---

## 2. Architecture Design

### 2.1 System Architecture (Enhanced)

```
┌─────────────────────────────────────────────────────┐
│                  CLI Interface                       │
│              (cli.py - Enhanced)                     │
│  + quarterly, + features, + blockers commands        │
└──────────────────┬──────────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
         v                    v
┌─────────────────┐   ┌──────────────────┐
│  Config Manager │   │  Cache Manager   │  ← NEW
│   (existing)    │   │  (cache_manager) │
└─────────────────┘   └──────────────────┘
         │                    │
         v                    v
┌─────────────────────────────────────────────────────┐
│           Data Acquisition Layer                     │
│  ┌────────────────────┐   ┌────────────────────┐   │
│  │ Markdown Parser    │←──│ Cache Manager      │   │
│  │ (with caching)     │   │ (mtime tracking)   │   │
│  └────────────────────┘   └────────────────────┘   │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │ Parallel Data Aggregator (NEW)             │    │
│  │ - load_all_features() (NEW)                │    │
│  │ - load_quarterly_data() (enhanced)         │    │
│  │ - Concurrent file loading                  │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────┐
│              Generation Layer                        │
│  ┌────────────────┐   ┌─────────────────────────┐  │
│  │ Excel Generator│   │ Enhanced Chart Builder  │  │
│  │ (base class)   │   │ + Progress bars         │  │
│  └────────────────┘   │ + Pie charts            │  │
│                       │ + Trend lines           │  │
│  ┌────────────────┐   └─────────────────────────┘  │
│  │ Style Manager  │                                 │
│  │ (existing)     │                                 │
│  └────────────────┘                                 │
└─────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────┐
│            Report Generators                         │
│  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ Weekly Report   │  │ Quarterly Report (NEW)  │  │
│  │ (existing, +    │  │ - 4 sheets              │  │
│  │  charts)        │  │ - Quarter metrics       │  │
│  └─────────────────┘  └─────────────────────────┘  │
│                                                      │
│  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ Feature Report  │  │ Blocker Report (NEW)    │  │
│  │ (NEW)           │  │ - 2 sheets              │  │
│  │ - 3 sheets      │  │ - Trend analysis        │  │
│  └─────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │
         v
    Excel Output Files (.xlsx)
```

### 2.2 Module Dependencies

```
cli.py
  ├── config.py
  ├── reports/quarterly_report.py (NEW)
  ├── reports/feature_report.py (NEW)
  ├── reports/blocker_report.py (NEW)
  └── reports/weekly_report.py (ENHANCED)

reports/*.py
  ├── generators/excel_generator.py
  ├── generators/chart_builder.py (ENHANCED)
  ├── generators/style_manager.py
  └── aggregators/parallel_aggregator.py (NEW)

aggregators/parallel_aggregator.py
  ├── aggregators/data_aggregator.py (BASE)
  ├── parsers/markdown_parser.py (ENHANCED)
  └── utils/cache_manager.py (NEW)

utils/cache_manager.py
  └── utils/date_utils.py
```

---

## 3. Component Design

### 3.1 Quarterly Report Generator

**File**: `obsidian_excel_automation/reports/quarterly_report.py`

#### Class Structure

```python
class QuarterlyReportGenerator(ExcelGenerator):
    """
    Generates quarterly status report with 4 sheets

    Attributes:
        aggregator: DataAggregator instance
        quarter: Quarter number (1-4)
        year: Year (2026)
    """

    def __init__(self, config: Config):
        super().__init__(config)
        self.aggregator = DataAggregator(config)

    def generate(
        self,
        quarter: Optional[int] = None,
        year: Optional[int] = None,
        output_filename: Optional[str] = None
    ) -> Path:
        """
        Generate quarterly report

        Args:
            quarter: Quarter number (1-4), auto-detected if None
            year: Year, defaults to current year
            output_filename: Custom filename

        Returns:
            Path to generated Excel file

        Process:
            1. Auto-detect quarter/year if not provided
            2. Load quarterly data from 2026_Q{n}_Status.md
            3. Create 4 sheets with quarterly metrics
            4. Apply styling and formatting
            5. Save to output directory
        """

    def _create_sheet1_overview(
        self,
        quarterly_data: QuarterlyData,
        quarter_info: dict
    ):
        """
        Sheet 1: Q{n} Overview

        Layout:
            - Title: "Q{n} 2026 Status Overview"
            - Metadata: Start date, End date, Duration
            - KPI boxes (4x1 grid):
              * Total Tasks
              * P0 Completion %
              * P1 Completion %
              * Overall Progress %
            - Quarter timeline (visual)
            - Key achievements (bullet list)
            - Risks and issues (table)
        """

    def _create_sheet2_p0_tasks(self, quarterly_data: QuarterlyData):
        """
        Sheet 2: P0 Tasks (Critical)

        Table columns:
            - Task ID (auto-numbered)
            - Description
            - Owner
            - Start Date
            - Due Date
            - Status (진행중/완료/대기)
            - Progress %
            - Notes

        Features:
            - Red highlighting for overdue
            - Green highlighting for completed
            - Auto-width columns
            - Freeze header row
        """

    def _create_sheet3_p1_tasks(self, quarterly_data: QuarterlyData):
        """
        Sheet 3: P1 Tasks (High Priority)

        Same structure as Sheet 2 but for P1 tasks
        Yellow highlighting for in-progress items
        """

    def _create_sheet4_progress_charts(
        self,
        quarterly_data: QuarterlyData,
        dashboard_data: DashboardData
    ):
        """
        Sheet 4: Progress Charts (Visual Analytics)

        Charts:
            1. Task Completion Pie Chart
               - P0 completed vs pending
               - P1 completed vs pending

            2. Weekly Progress Line Chart
               - X-axis: Weeks (W1-W13)
               - Y-axis: Cumulative tasks completed
               - Lines: P0, P1, P2

            3. Burndown Chart
               - Ideal line vs actual progress
               - Projection to quarter end
        """
```

#### Data Requirements

**Input Files**:
- `00_Dashboard/2026_Q{n}_Status.md` - Primary data source
- `00_Dashboard/_PM Dashboard.md` - Weekly trend data

**Frontmatter Expected**:
```yaml
---
quarter: 1
year: 2026
start_date: 2026-01-01
end_date: 2026-03-31
total_tasks: 31
p0_tasks: 12
p1_tasks: 9
p2_tasks: 10
completion_rate: 35%
---
```

**Output**:
- Filename: `STOREAGENT_Q{n}_Status_{YYYYMMDD}.xlsx`
- Location: `05_Roadmap/Excel/`
- Size: ~15-20KB

---

### 3.2 Feature Progress Report Generator

**File**: `obsidian_excel_automation/reports/feature_report.py`

#### Class Structure

```python
class FeatureReportGenerator(ExcelGenerator):
    """
    Generates feature progress report with 3 sheets
    Analyzes all 25 feature files (_Unified.md)
    """

    def __init__(self, config: Config):
        super().__init__(config)
        self.aggregator = DataAggregator(config)

    def generate(self, output_filename: Optional[str] = None) -> Path:
        """
        Generate feature progress report

        Process:
            1. Scan 02_Implementation/Features/ directory
            2. Load all _Unified.md files (A1-B12)
            3. Parse frontmatter and task lists
            4. Calculate feature-level metrics
            5. Create 3 sheets
            6. Save
        """

    def _create_sheet1_all_features(self, features: List[Feature]):
        """
        Sheet 1: All Features (Master List)

        Table columns:
            - Feature ID (A1, A2, B1, etc.)
            - Feature Name
            - Priority (P0/P1/P2) with color coding
            - Status (진행중/완료/대기/보류)
            - Cycle (C1/C2/C3)
            - Start Date
            - Target Date
            - Completion Date
            - Progress % (with progress bar)
            - Blocker (if any)
            - Owner

        Sorting: Priority → Status → Progress
        Filtering: Status dropdown
        Conditional formatting: Progress bars
        """

    def _create_sheet2_by_priority(self, features: List[Feature]):
        """
        Sheet 2: By Priority (P0/P1/P2 Analysis)

        Layout:
            Section 1: P0 Features
              - Table of all P0 features
              - Completion metrics
              - Critical path items

            Section 2: P1 Features
              - Table of all P1 features
              - Completion metrics

            Section 3: P2 Features
              - Table of all P2 features
              - Completion metrics

            Summary Section:
              - Pie chart: Distribution by priority
              - Completion rates by priority
        """

    def _create_sheet3_by_cycle(self, features: List[Feature]):
        """
        Sheet 3: By Cycle (C1/C2/C3 Timeline)

        Layout:
            Timeline view:
            C1 (Weeks 1-2) | C2 (Weeks 3-4) | C3 (Weeks 5-6)
            ─────────────────────────────────────────────────
            Feature A1     | Feature B1     | Feature B5
            Feature A2     | Feature B2     | Feature B6

            Metrics per cycle:
              - Features planned
              - Features completed
              - Completion rate
              - Velocity (features/week)

            Gantt-style chart:
              - Visual timeline
              - Dependencies shown
              - Current week marker
        """
```

#### New Aggregator Methods

**File**: `obsidian_excel_automation/aggregators/data_aggregator.py`

```python
class DataAggregator:
    # ... existing methods ...

    def load_all_features(self) -> List[Feature]:
        """
        Load all feature files from Features/ directory

        Returns:
            List of Feature objects with complete metadata

        Process:
            1. Scan Features/ directory for *_Unified.md
            2. Parse each file's frontmatter
            3. Extract task lists and calculate progress
            4. Parse dependencies and blockers
            5. Return sorted list (by feature_id)
        """
        features_dir = self.config.vault_path / self.config.base_path / "02_Implementation/Features"
        feature_files = list(features_dir.glob("*_Unified.md"))

        features = []
        for file in feature_files:
            metadata, content = self.parser.parse_file(file)

            # Extract feature data from frontmatter
            feature = Feature(
                id=metadata.get('feature_id', ''),
                name=metadata.get('feature_name', ''),
                priority=metadata.get('priority', 'P2'),
                status=metadata.get('status', '대기'),
                start_date=metadata.get('start_date'),
                completion_date=metadata.get('completion_date'),
                progress=self._calculate_feature_progress(content),
                cycle=metadata.get('cycle'),
                blocker=self._extract_blocker(content)
            )
            features.append(feature)

        return sorted(features, key=lambda f: f.id)

    def _calculate_feature_progress(self, content: str) -> int:
        """
        Calculate feature progress from task completion

        Args:
            content: Markdown content with task lists

        Returns:
            Progress percentage (0-100)

        Algorithm:
            1. Extract all tasks from content
            2. Count total tasks
            3. Count completed tasks (status=True)
            4. Return (completed / total) * 100
        """
```

---

### 3.3 Blocker Tracking Report Generator

**File**: `obsidian_excel_automation/reports/blocker_report.py`

#### Class Structure

```python
class BlockerReportGenerator(ExcelGenerator):
    """
    Generates blocker tracking report with 2 sheets
    Analyzes blockers and their impact on features
    """

    def __init__(self, config: Config):
        super().__init__(config)
        self.aggregator = DataAggregator(config)

    def generate(self, output_filename: Optional[str] = None) -> Path:
        """
        Generate blocker tracking report

        Process:
            1. Load blocker data from Blockers_Tracker.md
            2. Load feature data for impact analysis
            3. Calculate blocker metrics
            4. Create 2 sheets
            5. Save
        """

    def _create_sheet1_active_blockers(
        self,
        blocker_data: BlockerData,
        features: List[Feature]
    ):
        """
        Sheet 1: Active Blockers (Current Issues)

        Table columns:
            - Blocker ID (BL-001, BL-002, etc.)
            - Title
            - Priority (높음/중간/낮음) with color coding
            - Status (🔄 진행중, ⚠️ 미해결, ✅ 해결)
            - Owner (Lawson/내부)
            - Raised Date
            - Target Resolution Date
            - Days Open (auto-calculated)
            - Affected Features (comma-separated)
            - Impact (brief description)
            - Action Items (bullet list)

        Sorting: Priority → Days Open
        Highlighting:
            - Red: High priority, >7 days open
            - Yellow: Medium priority
            - Green: Resolved
        """

    def _create_sheet2_blocker_history(
        self,
        blocker_data: BlockerData
    ):
        """
        Sheet 2: Blocker History (Resolved & Trends)

        Section 1: Resolved Blockers
          - Table of all resolved blockers
          - Columns: ID, Title, Resolved Date, Days to Resolve, Owner
          - Metrics: Avg resolution time, Total resolved

        Section 2: Blocker Trends
          - Chart: Blockers opened vs resolved by week
          - Chart: Average resolution time trend
          - Chart: Blocker count by owner (Lawson vs Internal)

        Section 3: Impact Analysis
          - Features most affected by blockers
          - Delay impact (days lost)
          - Root cause analysis
        """
```

---

### 3.4 Enhanced Chart Builder

**File**: `obsidian_excel_automation/generators/chart_builder.py`

#### New Chart Methods

```python
class ChartBuilder:
    """Enhanced chart generation for Excel reports"""

    @staticmethod
    def add_progress_bar_chart(
        ws: Worksheet,
        title: str,
        categories: List[str],
        values: List[int],
        position: str = "A1",
        max_value: int = 100
    ):
        """
        Add horizontal bar chart showing progress

        Args:
            ws: Worksheet object
            title: Chart title
            categories: Y-axis labels (feature names)
            values: Progress values (0-100)
            position: Chart top-left position
            max_value: Maximum value for X-axis

        Chart appearance:
            - Horizontal bars
            - Color gradient: Red (0%) → Yellow (50%) → Green (100%)
            - Data labels showing percentage
            - Gridlines for easy reading
        """
        chart = BarChart()
        chart.type = "bar"  # Horizontal
        chart.title = title
        chart.style = 10

        # Add data
        data = Reference(ws, min_col=2, min_row=1, max_row=len(values)+1)
        categories_ref = Reference(ws, min_col=1, min_row=2, max_row=len(values)+1)
        chart.add_data(data, titles_from_data=True)
        chart.set_categories(categories_ref)

        # Styling
        chart.x_axis.scaling.max = max_value
        chart.dataLabels = DataLabelList()
        chart.dataLabels.showVal = True

        # Color by value
        for idx, val in enumerate(values):
            color = self._get_progress_color(val)
            chart.series[0].graphicalProperties.solidFill = color

        ws.add_chart(chart, position)

    @staticmethod
    def add_completion_pie_chart(
        ws: Worksheet,
        title: str,
        completed: int,
        pending: int,
        position: str = "A1"
    ):
        """
        Add pie chart for completion status

        Args:
            ws: Worksheet object
            title: Chart title
            completed: Number of completed items
            pending: Number of pending items
            position: Chart top-left position

        Chart appearance:
            - 2 slices: Completed (green), Pending (red)
            - Percentage labels
            - Legend
        """
        chart = PieChart()
        chart.title = title
        chart.style = 10

        # Add data
        data = Reference(ws, min_col=2, min_row=1, max_row=3)
        chart.add_data(data, titles_from_data=True)

        # Labels
        chart.dataLabels = DataLabelList()
        chart.dataLabels.showPercent = True

        # Colors
        colors = [
            ColorChoice(prstClr='green'),  # Completed
            ColorChoice(prstClr='red')      # Pending
        ]
        chart.series[0].graphicalProperties.solidFill = colors

        ws.add_chart(chart, position)

    @staticmethod
    def add_trend_line_chart(
        ws: Worksheet,
        title: str,
        weeks: List[str],
        p0_values: List[int],
        p1_values: List[int],
        p2_values: List[int],
        position: str = "A1"
    ):
        """
        Add line chart for velocity trends

        Args:
            ws: Worksheet object
            title: Chart title
            weeks: X-axis labels (W1, W2, W3, etc.)
            p0_values: P0 task completion counts
            p1_values: P1 task completion counts
            p2_values: P2 task completion counts
            position: Chart top-left position

        Chart appearance:
            - 3 lines: P0 (red), P1 (yellow), P2 (green)
            - Markers on data points
            - Smooth lines
            - Legend
            - Gridlines
        """
        chart = LineChart()
        chart.title = title
        chart.style = 10
        chart.smooth = True

        # Add data for each priority
        for idx, (label, values, color) in enumerate([
            ("P0", p0_values, "FF0000"),
            ("P1", p1_values, "FFD700"),
            ("P2", p2_values, "00FF00")
        ]):
            data = Reference(ws, min_col=idx+2, min_row=1, max_row=len(values)+1)
            chart.add_data(data, titles_from_data=True)

            # Style line
            series = chart.series[idx]
            series.graphicalProperties.line.solidFill = color
            series.marker.symbol = "circle"

        # Categories (weeks)
        categories = Reference(ws, min_col=1, min_row=2, max_row=len(weeks)+1)
        chart.set_categories(categories)

        ws.add_chart(chart, position)

    @staticmethod
    def _get_progress_color(value: int) -> str:
        """
        Get color based on progress value

        Returns:
            Hex color code (without #)

        Scale:
            0-33%: Red (FFC7CE)
            34-66%: Yellow (FFEB9C)
            67-100%: Green (C6EFCE)
        """
        if value < 34:
            return "FFC7CE"  # Red
        elif value < 67:
            return "FFEB9C"  # Yellow
        else:
            return "C6EFCE"  # Green
```

---

### 3.5 Cache Manager

**File**: `obsidian_excel_automation/utils/cache_manager.py`

#### Class Structure

```python
from pathlib import Path
from typing import Dict, Optional, Tuple, Any
import json
import hashlib
from datetime import datetime

class CacheManager:
    """
    File-based cache with modification time tracking

    Attributes:
        cache_dir: Directory for cache files
        cache_index: In-memory index of cached files
        max_age: Maximum cache age in seconds (default: 3600)
    """

    def __init__(
        self,
        cache_dir: Path,
        max_age: int = 3600
    ):
        """
        Initialize cache manager

        Args:
            cache_dir: Directory to store cache files
            max_age: Max cache age in seconds (1 hour default)
        """
        self.cache_dir = cache_dir
        self.max_age = max_age
        self.cache_index_file = cache_dir / ".cache_index.json"

        # Create cache directory
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Load cache index
        self.cache_index = self._load_cache_index()

    def get(
        self,
        file_path: Path
    ) -> Optional[Tuple[Dict[str, Any], str]]:
        """
        Get cached data for a file

        Args:
            file_path: Path to source file

        Returns:
            (metadata, content) tuple if cache valid, None otherwise

        Validation:
            1. Check if file exists in cache
            2. Compare modification times
            3. Check cache age
            4. Return cached data if all checks pass
        """
        # Get cache key
        cache_key = self._get_cache_key(file_path)

        # Check if in index
        if cache_key not in self.cache_index:
            return None

        cache_entry = self.cache_index[cache_key]

        # Check file modification time
        current_mtime = file_path.stat().st_mtime
        if current_mtime != cache_entry['mtime']:
            # File modified, invalidate cache
            self.invalidate(file_path)
            return None

        # Check cache age
        cache_age = datetime.now().timestamp() - cache_entry['cached_at']
        if cache_age > self.max_age:
            # Cache too old
            self.invalidate(file_path)
            return None

        # Load cached data
        cache_file = self.cache_dir / cache_entry['cache_file']
        if not cache_file.exists():
            # Cache file missing
            self.invalidate(file_path)
            return None

        with open(cache_file, 'r', encoding='utf-8') as f:
            cached_data = json.load(f)

        return (cached_data['metadata'], cached_data['content'])

    def set(
        self,
        file_path: Path,
        data: Tuple[Dict[str, Any], str]
    ):
        """
        Cache parsed data for a file

        Args:
            file_path: Path to source file
            data: (metadata, content) tuple to cache

        Process:
            1. Generate cache key
            2. Get file modification time
            3. Save data to cache file
            4. Update cache index
        """
        cache_key = self._get_cache_key(file_path)

        # Get file mtime
        mtime = file_path.stat().st_mtime

        # Save cache file
        cache_filename = f"{cache_key}.json"
        cache_file = self.cache_dir / cache_filename

        metadata, content = data
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump({
                'metadata': metadata,
                'content': content
            }, f, ensure_ascii=False, indent=2)

        # Update index
        self.cache_index[cache_key] = {
            'source_file': str(file_path),
            'cache_file': cache_filename,
            'mtime': mtime,
            'cached_at': datetime.now().timestamp()
        }

        self._save_cache_index()

    def invalidate(self, file_path: Path):
        """Remove cached data for a file"""
        cache_key = self._get_cache_key(file_path)

        if cache_key in self.cache_index:
            # Delete cache file
            cache_file = self.cache_dir / self.cache_index[cache_key]['cache_file']
            if cache_file.exists():
                cache_file.unlink()

            # Remove from index
            del self.cache_index[cache_key]
            self._save_cache_index()

    def clear(self):
        """Clear all cached data"""
        for cache_entry in self.cache_index.values():
            cache_file = self.cache_dir / cache_entry['cache_file']
            if cache_file.exists():
                cache_file.unlink()

        self.cache_index = {}
        self._save_cache_index()

    def _get_cache_key(self, file_path: Path) -> str:
        """Generate cache key from file path"""
        return hashlib.md5(str(file_path).encode()).hexdigest()

    def _load_cache_index(self) -> Dict:
        """Load cache index from disk"""
        if self.cache_index_file.exists():
            with open(self.cache_index_file, 'r') as f:
                return json.load(f)
        return {}

    def _save_cache_index(self):
        """Save cache index to disk"""
        with open(self.cache_index_file, 'w') as f:
            json.dump(self.cache_index, f, indent=2)
```

#### Integration with MarkdownParser

```python
# In parsers/markdown_parser.py

class MarkdownParser:
    def __init__(self, cache_manager: Optional[CacheManager] = None):
        """
        Initialize parser with optional caching

        Args:
            cache_manager: CacheManager instance for caching parsed files
        """
        self.cache = cache_manager

    @staticmethod
    def parse_file(
        file_path: Path,
        cache: Optional[CacheManager] = None
    ) -> Tuple[Dict[str, Any], str]:
        """
        Parse markdown file with optional caching

        Args:
            file_path: Path to markdown file
            cache: Optional CacheManager

        Returns:
            (frontmatter_dict, content_string)
        """
        # Try cache first
        if cache:
            cached = cache.get(file_path)
            if cached:
                return cached

        # Parse file
        with open(file_path, 'r', encoding='utf-8') as f:
            post = frontmatter.load(f)

        result = (post.metadata, post.content)

        # Store in cache
        if cache:
            cache.set(file_path, result)

        return result
```

---

### 3.6 Parallel Data Aggregator

**File**: `obsidian_excel_automation/aggregators/parallel_aggregator.py`

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import multiprocessing
from typing import Dict, List
from dataclasses import dataclass

from .data_aggregator import DataAggregator, DashboardData, RoadmapData, BlockerData, QuarterlyData
from ..utils.cache_manager import CacheManager

@dataclass
class AllData:
    """Container for all aggregated data"""
    dashboard: DashboardData
    roadmap: RoadmapData
    blockers: BlockerData
    q1: QuarterlyData
    q2: QuarterlyData
    q3: QuarterlyData
    q4: QuarterlyData

class ParallelDataAggregator(DataAggregator):
    """
    Parallel file parsing and data aggregation

    Uses ThreadPoolExecutor to load multiple files concurrently
    Expected speedup: 3x for 4 data sources
    """

    def __init__(
        self,
        config,
        cache_manager: Optional[CacheManager] = None,
        max_workers: int = None
    ):
        """
        Initialize with parallelization support

        Args:
            config: Config object
            cache_manager: Optional CacheManager for file caching
            max_workers: Number of worker threads (default: CPU count)
        """
        super().__init__(config)
        self.cache = cache_manager
        self.max_workers = max_workers or multiprocessing.cpu_count()

    def load_all_data_parallel(self) -> AllData:
        """
        Load all data sources in parallel

        Returns:
            AllData container with all loaded data

        Process:
            1. Submit all load tasks to thread pool
            2. Wait for all tasks to complete
            3. Collect results
            4. Return aggregated data

        Performance:
            Sequential: ~300ms
            Parallel: ~100ms (3x faster)
        """
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all load tasks
            futures = {
                'dashboard': executor.submit(self.load_dashboard_data),
                'roadmap': executor.submit(self.load_roadmap_data),
                'blockers': executor.submit(self.load_blocker_data),
                'q1': executor.submit(self.load_quarterly_data, 1),
                'q2': executor.submit(self.load_quarterly_data, 2),
                'q3': executor.submit(self.load_quarterly_data, 3),
                'q4': executor.submit(self.load_quarterly_data, 4),
            }

            # Collect results
            results = {}
            for key, future in futures.items():
                try:
                    results[key] = future.result()
                except Exception as e:
                    logger.error(f"Error loading {key} data: {e}")
                    results[key] = None

        return AllData(**results)

    def load_all_features_parallel(self) -> List[Feature]:
        """
        Load all feature files in parallel

        Returns:
            List of Feature objects

        Process:
            1. Get list of all _Unified.md files
            2. Submit parse tasks for each file
            3. Collect and aggregate results
            4. Sort by feature ID

        Performance:
            25 files sequential: ~500ms
            25 files parallel: ~150ms (3.3x faster)
        """
        features_dir = self.config.vault_path / self.config.base_path / "02_Implementation/Features"
        feature_files = list(features_dir.glob("*_Unified.md"))

        features = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit parse tasks
            future_to_file = {
                executor.submit(self._parse_feature_file, file): file
                for file in feature_files
            }

            # Collect results
            for future in as_completed(future_to_file):
                try:
                    feature = future.result()
                    if feature:
                        features.append(feature)
                except Exception as e:
                    logger.error(f"Error parsing feature file: {e}")

        return sorted(features, key=lambda f: f.id)

    def _parse_feature_file(self, file_path: Path) -> Optional[Feature]:
        """
        Parse single feature file

        Args:
            file_path: Path to _Unified.md file

        Returns:
            Feature object or None on error
        """
        try:
            metadata, content = self.parser.parse_file(file_path, cache=self.cache)

            return Feature(
                id=metadata.get('feature_id', ''),
                name=metadata.get('feature_name', ''),
                priority=metadata.get('priority', 'P2'),
                status=metadata.get('status', '대기'),
                start_date=metadata.get('start_date'),
                completion_date=metadata.get('completion_date'),
                progress=self._calculate_feature_progress(content),
                cycle=metadata.get('cycle'),
                blocker=self._extract_blocker(content)
            )
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return None
```

---

## 4. CLI Integration

### 4.1 New CLI Commands

**File**: `obsidian_excel_automation/cli.py`

```python
# Add to existing cli.py

@generate.command('quarterly')
@click.option('--quarter', type=int, help='Quarter number (1-4, auto-detected if not specified)')
@click.option('--year', type=int, help='Year (defaults to current year)')
@click.option('--output', type=click.Path(), help='Custom output filename')
def generate_quarterly(quarter, year, output):
    """Generate quarterly status report (4 sheets)"""
    try:
        config = ConfigManager.load()
        generator = QuarterlyReportGenerator(config)
        output_path = generator.generate(
            quarter=quarter,
            year=year,
            output_filename=output
        )

        click.echo(f"✅ Quarterly report generated!")
        click.echo(f"📁 File: {output_path}")
        click.echo(f"📊 Sheets:")
        click.echo(f"   1. Q{quarter or 'X'} Overview")
        click.echo(f"   2. P0 Tasks")
        click.echo(f"   3. P1 Tasks")
        click.echo(f"   4. Progress Charts")

    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        raise click.Abort()

@generate.command('features')
@click.option('--output', type=click.Path(), help='Custom output filename')
def generate_features(output):
    """Generate feature progress report (3 sheets)"""
    try:
        config = ConfigManager.load()
        generator = FeatureReportGenerator(config)
        output_path = generator.generate(output_filename=output)

        click.echo(f"✅ Feature progress report generated!")
        click.echo(f"📁 File: {output_path}")
        click.echo(f"📊 Analyzed 25 features")

    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        raise click.Abort()

@generate.command('blockers')
@click.option('--output', type=click.Path(), help='Custom output filename')
def generate_blockers(output):
    """Generate blocker tracking report (2 sheets)"""
    try:
        config = ConfigManager.load()
        generator = BlockerReportGenerator(config)
        output_path = generator.generate(output_filename=output)

        click.echo(f"✅ Blocker tracking report generated!")
        click.echo(f"📁 File: {output_path}")

    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        raise click.Abort()

# Update 'all' command to include new reports
@generate.command('all')
def generate_all():
    """Generate all enabled reports"""
    config = ConfigManager.load()

    reports_generated = []

    # Weekly
    if config.reports.get('weekly', {}).get('enabled', True):
        weekly_gen = WeeklyReportGenerator(config)
        path = weekly_gen.generate()
        reports_generated.append(('Weekly', path))

    # Quarterly
    if config.reports.get('quarterly', {}).get('enabled', True):
        quarterly_gen = QuarterlyReportGenerator(config)
        path = quarterly_gen.generate()
        reports_generated.append(('Quarterly', path))

    # Features
    if config.reports.get('features', {}).get('enabled', True):
        feature_gen = FeatureReportGenerator(config)
        path = feature_gen.generate()
        reports_generated.append(('Features', path))

    # Blockers
    if config.reports.get('blockers', {}).get('enabled', True):
        blocker_gen = BlockerReportGenerator(config)
        path = blocker_gen.generate()
        reports_generated.append(('Blockers', path))

    click.echo(f"✅ Generated {len(reports_generated)} reports:")
    for name, path in reports_generated:
        click.echo(f"   • {name}: {path.name}")
```

---

## 5. Testing Strategy

### 5.1 Unit Tests Structure

**Directory**: `tests/`

```
tests/
├── __init__.py
├── conftest.py              # Pytest fixtures
├── test_parsers.py          # Parser tests
├── test_aggregators.py      # Aggregator tests
├── test_generators.py       # Generator tests
├── test_reports.py          # Report tests
├── test_cache.py            # Cache manager tests
└── fixtures/                # Test data
    ├── sample_vault/
    │   ├── _PM Dashboard.md
    │   ├── 2026_Q1_Status.md
    │   └── Features/
    │       └── A1_Sample_Unified.md
    └── expected_outputs/
        └── sample_report.xlsx
```

### 5.2 Test Cases

**Parser Tests** (`test_parsers.py`):
```python
def test_task_parsing_complete():
    """Test parsing completed tasks"""

def test_task_parsing_incomplete():
    """Test parsing incomplete tasks"""

def test_task_priority_detection():
    """Test P0/P1/P2 emoji detection"""

def test_task_due_date_extraction():
    """Test due date parsing"""

def test_feature_frontmatter_parsing():
    """Test feature file frontmatter"""

def test_blocker_table_parsing():
    """Test blocker table extraction"""
```

**Aggregator Tests** (`test_aggregators.py`):
```python
def test_dashboard_loading(sample_vault):
    """Test dashboard data loading"""

def test_quarterly_loading(sample_vault):
    """Test quarterly data loading"""

def test_metrics_calculation():
    """Test completion rate calculations"""

def test_feature_loading_parallel():
    """Test parallel feature loading"""

def test_cache_effectiveness():
    """Test cache hit rate"""
```

**Generator Tests** (`test_generators.py`):
```python
def test_workbook_creation():
    """Test Excel workbook creation"""

def test_weekly_report_structure():
    """Test weekly report has 7 sheets"""

def test_quarterly_report_structure():
    """Test quarterly report has 4 sheets"""

def test_chart_generation():
    """Test chart creation"""

def test_styling_application():
    """Test priority color coding"""
```

### 5.3 Performance Benchmarks

**File**: `tests/benchmark_performance.py`

```python
import time
from obsidian_excel_automation.aggregators.data_aggregator import DataAggregator
from obsidian_excel_automation.aggregators.parallel_aggregator import ParallelDataAggregator
from obsidian_excel_automation.utils.cache_manager import CacheManager

def benchmark_sequential_loading():
    """Benchmark sequential data loading"""
    start = time.time()
    aggregator = DataAggregator(config)
    data = aggregator.load_all_data()
    duration = time.time() - start
    print(f"Sequential loading: {duration:.3f}s")

def benchmark_parallel_loading():
    """Benchmark parallel data loading"""
    start = time.time()
    aggregator = ParallelDataAggregator(config)
    data = aggregator.load_all_data_parallel()
    duration = time.time() - start
    print(f"Parallel loading: {duration:.3f}s")

def benchmark_with_cache():
    """Benchmark with caching enabled"""
    cache = CacheManager(cache_dir=Path("/tmp/obsidian_excel_cache"))

    # First run (cold cache)
    start = time.time()
    aggregator = ParallelDataAggregator(config, cache_manager=cache)
    data = aggregator.load_all_data_parallel()
    cold_duration = time.time() - start

    # Second run (warm cache)
    start = time.time()
    data = aggregator.load_all_data_parallel()
    warm_duration = time.time() - start

    print(f"Cold cache: {cold_duration:.3f}s")
    print(f"Warm cache: {warm_duration:.3f}s")
    print(f"Speedup: {cold_duration / warm_duration:.1f}x")
```

---

## 6. Implementation Order

### 6.1 Phase 1: Feature Completion (Week 1)

**Day 1-2: Quarterly Report**
1. Create `reports/quarterly_report.py`
2. Implement `QuarterlyReportGenerator` class
3. Implement 4 sheet methods
4. Add CLI command
5. Test with Q1 data

**Day 3-4: Feature Report**
1. Create `reports/feature_report.py`
2. Add `load_all_features()` to aggregator
3. Implement `FeatureReportGenerator` class
4. Implement 3 sheet methods
5. Add CLI command
6. Test with 25 feature files

**Day 5: Blocker Report**
1. Create `reports/blocker_report.py`
2. Implement `BlockerReportGenerator` class
3. Implement 2 sheet methods
4. Add CLI command
5. Test with blocker data

### 6.2 Phase 2: Chart Integration (Week 2)

**Day 1-2: Chart Infrastructure**
1. Enhance `chart_builder.py` with new methods:
   - `add_progress_bar_chart()`
   - `add_completion_pie_chart()`
   - `add_trend_line_chart()`
2. Test charts standalone
3. Create chart templates

**Day 3-4: Weekly Report Charts**
1. Add completion pie chart to Sheet 1
2. Add roadmap progress bars to Sheet 2
3. Test chart formatting
4. Verify Excel compatibility

**Day 5: Quarterly Report Charts**
1. Add all charts to Sheet 4
2. Integrate with quarterly report
3. Test multi-chart layout

### 6.3 Phase 3: Performance Optimization (Week 3)

**Day 1-2: Caching Layer**
1. Create `utils/cache_manager.py`
2. Implement `CacheManager` class
3. Integrate with `MarkdownParser`
4. Test cache invalidation
5. Benchmark performance

**Day 3-4: Parallel Processing**
1. Create `aggregators/parallel_aggregator.py`
2. Implement `ParallelDataAggregator`
3. Add parallel feature loading
4. Test thread safety
5. Benchmark speedup

**Day 5: Optimization Testing**
1. Run comprehensive benchmarks
2. Profile bottlenecks
3. Document improvements
4. Tune worker counts

### 6.4 Phase 4: Testing & Quality (Week 4)

**Day 1-3: Unit Tests**
1. Create test structure
2. Write parser tests (10+ test cases)
3. Write aggregator tests (8+ test cases)
4. Write generator tests (10+ test cases)
5. Achieve 85%+ coverage

**Day 4-5: Integration Tests**
1. End-to-end report generation tests
2. Error handling tests
3. Edge case tests
4. Documentation updates

---

## 7. Success Validation

### 7.1 Functional Tests

**Quarterly Report**:
- [ ] Generates 4 sheets correctly
- [ ] Auto-detects current quarter
- [ ] Displays correct metrics
- [ ] Applies styling properly
- [ ] Filename format correct

**Feature Report**:
- [ ] Parses all 25 feature files
- [ ] Calculates progress accurately
- [ ] Groups by priority correctly
- [ ] Groups by cycle correctly
- [ ] Progress bars display

**Blocker Report**:
- [ ] Lists all active blockers
- [ ] Shows resolved blockers
- [ ] Calculates resolution time
- [ ] Applies color coding
- [ ] Links to affected features

### 7.2 Performance Tests

**Speed Benchmarks**:
- [ ] Weekly report: <0.3s
- [ ] Quarterly report: <0.5s
- [ ] Feature report: <0.4s
- [ ] All reports batch: <1.5s
- [ ] Cache hit rate: >80%

**Quality Metrics**:
- [ ] Test coverage: ≥85%
- [ ] No critical bugs
- [ ] All edge cases handled
- [ ] Documentation complete

---

## 8. Risk Mitigation

### 8.1 Technical Risks

**Risk**: Chart rendering issues in different Excel versions
- **Mitigation**: Test in Excel 2016, 2019, 2021, Office 365
- **Fallback**: Provide chart-less option via config

**Risk**: Parallel processing race conditions
- **Mitigation**: Use thread-safe data structures, comprehensive testing
- **Fallback**: Disable parallelization if issues occur

**Risk**: Cache corruption
- **Mitigation**: CRC checks, graceful degradation
- **Fallback**: Auto-clear cache on error

### 8.2 Data Risks

**Risk**: Missing or malformed feature files
- **Mitigation**: Validate frontmatter, provide defaults
- **Fallback**: Skip invalid files with warning

**Risk**: Inconsistent task syntax
- **Mitigation**: Flexible parsing, error logging
- **Fallback**: Best-effort extraction

---

## 9. Maintenance & Documentation

### 9.1 Documentation Updates Required

**Files to Update**:
- [ ] `USER_GUIDE.md` - Add new reports, charts, performance tips
- [ ] `TECHNICAL.md` - Add cache manager, parallel aggregator
- [ ] `WORKFLOW.md` - Update with quarterly/feature report workflows
- [ ] `README.md` - Update feature list, version number
- [ ] `COMPLETION_SUMMARY.md` - Update to 100% complete

### 9.2 Version Strategy

**Version Progression**:
- Current: v1.0.0 (MVP)
- After Phase 1: v1.1.0 (Feature complete)
- After Phase 2: v1.2.0 (Charts integrated)
- After Phase 3: v1.3.0 (Performance optimized)
- After Phase 4: v1.4.0 (Production quality)

---

## 10. Conclusion

This design document provides a complete blueprint for optimizing the Obsidian-Excel automation system to 100% feature completeness with performance and quality enhancements.

**Key Deliverables**:
1. 3 new report generators (quarterly, feature, blocker)
2. Enhanced chart builder with 6+ chart types
3. Cache manager for 70% speedup
4. Parallel aggregator for 67% speedup
5. Comprehensive test suite (85%+ coverage)

**Implementation Timeline**: 4 weeks
**Total Effort**: 30 hours
**Expected Outcome**: Production-grade, feature-complete reporting system

---

**Status**: Design Complete ✅
**Next Phase**: Implementation (Do)
**Approval**: Ready to proceed
**Version**: 1.0.0
**Last Updated**: 2026-02-03
