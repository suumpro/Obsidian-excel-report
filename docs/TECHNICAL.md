# Technical Documentation

Comprehensive technical guide to the Obsidian Excel Automation system architecture, implementation details, and extension guide.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Module Reference](#module-reference)
4. [Data Flow](#data-flow)
5. [Key Algorithms](#key-algorithms)
6. [Extending the System](#extending-the-system)
7. [Adding New Report Types](#adding-new-report-types)
8. [API Reference](#api-reference)
9. [Performance Considerations](#performance-considerations)
10. [Testing Strategy](#testing-strategy)

---

## System Overview

### Purpose

Automate the conversion of Obsidian markdown task management files into professional Excel reports with:
- 100% data accuracy
- Consistent formatting
- <1 minute generation time
- Extensible architecture

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Language | Python | 3.8+ | Core implementation |
| CLI Framework | Click | 8.1+ | Command-line interface |
| Excel Generation | openpyxl | 3.1+ | Excel file creation |
| Data Processing | pandas | 2.0+ | Data manipulation |
| Config Management | PyYAML | 6.0+ | YAML parsing |
| Markdown Parsing | python-frontmatter | 1.0+ | Frontmatter extraction |
| Date Utilities | python-dateutil | 2.8+ | Date calculations |
| Testing | pytest | 7.4+ | Unit and integration tests |

### Design Principles

1. **Modularity** - Clear separation of concerns (parsing, aggregation, generation)
2. **Extensibility** - Easy to add new report types
3. **Configuration-driven** - Behavior controlled via YAML config
4. **Type Safety** - Dataclasses and type hints throughout
5. **Error Handling** - Graceful degradation with meaningful errors
6. **Performance** - Efficient parsing and generation (<1s for typical vaults)

---

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  CLI Interface  │  (cli.py)
│   (Click)       │
└────────┬────────┘
         │
         ├───────────────────────────────┐
         │                               │
         v                               v
┌────────────────────┐          ┌─────────────────┐
│ Configuration Mgr  │          │  Logger/Utils   │
│   (config.py)      │          │  (utils/)       │
└─────────┬──────────┘          └─────────────────┘
          │
          v
┌────────────────────────────────────────────────┐
│           Data Acquisition Layer               │
├────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────────┐    │
│  │   Markdown   │  │   Data Aggregator   │    │
│  │    Parser    │──│  (dashboard,        │    │
│  │ (parsers/)   │  │   roadmap,          │    │
│  └──────────────┘  │   blockers, etc.)   │    │
│                    │  (aggregators/)      │    │
│                    └─────────┬────────────┘    │
└──────────────────────────────┼─────────────────┘
                               │
                               v
┌────────────────────────────────────────────────┐
│          Processing Layer                      │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐     │
│  │     Metrics Calculator               │     │
│  │  (completion rates, trends, etc.)    │     │
│  │  (aggregators/metrics_calculator.py) │     │
│  └──────────────────────────────────────┘     │
└────────────────────┬───────────────────────────┘
                     │
                     v
┌────────────────────────────────────────────────┐
│          Generation Layer                      │
├────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────────────┐  │
│  │ Excel         │  │ Report Generators    │  │
│  │ Generator     │──│ (weekly, quarterly,  │  │
│  │ (generators/) │  │  feature, blocker)   │  │
│  └───────────────┘  │ (reports/)           │  │
│  ┌───────────────┐  └──────────────────────┘  │
│  │ Style Manager │                             │
│  │ Chart Builder │                             │
│  └───────────────┘                             │
└────────────────────┬───────────────────────────┘
                     │
                     v
          ┌──────────────────────┐
          │  Excel Output File   │
          │  (.xlsx)             │
          └──────────────────────┘
```

### Directory Structure

```
obsidian_excel_automation/
├── __init__.py                    # Package initialization
├── cli.py                         # ⚡ CLI entry point (Click commands)
├── config.py                      # 📋 Configuration management
│
├── parsers/                       # 📖 Markdown parsing layer
│   ├── __init__.py
│   └── markdown_parser.py         # Task, Feature, Blocker parsing
│
├── aggregators/                   # 📊 Data aggregation layer
│   ├── __init__.py
│   ├── data_aggregator.py         # Main aggregator (loads all data)
│   └── metrics_calculator.py      # Metrics and calculations
│
├── generators/                    # 🎨 Excel generation layer
│   ├── __init__.py
│   ├── excel_generator.py         # Base Excel workbook generator
│   ├── style_manager.py           # Styling (colors, fonts, borders)
│   └── chart_builder.py           # Chart generation
│
├── reports/                       # 📈 Report implementations
│   ├── __init__.py
│   ├── weekly_report.py           # ✅ Weekly report (7 sheets)
│   ├── quarterly_report.py        # ⏳ Quarterly report (4 sheets)
│   ├── feature_report.py          # ⏳ Feature report (3 sheets)
│   └── blocker_report.py          # ⏳ Blocker report (2 sheets)
│
└── utils/                         # 🛠️ Utilities
    ├── __init__.py
    ├── date_utils.py              # Week/quarter calculations
    └── logger.py                  # Logging configuration
```

---

## Module Reference

### parsers/markdown_parser.py

**Purpose**: Parse Obsidian markdown files into structured Python objects

**Key Components**:

#### 1. Dataclasses

```python
@dataclass
class Task:
    """Represents a task extracted from markdown"""
    content: str                    # Clean task text
    status: bool                    # True if completed ([x])
    tags: List[str]                 # Extracted tags (#tag)
    priority: Optional[str]         # P0, P1, P2
    due_date: Optional[datetime]    # Parsed from 📅 YYYY-MM-DD
    category: Optional[str]         # Category classification
    owner: Optional[str]            # Task owner
    raw_line: str                   # Original markdown line

@dataclass
class Feature:
    """Represents a feature from roadmap"""
    id: str                         # A1, B2, etc.
    name: str                       # Feature name
    priority: str                   # P0, P1, P2
    status: str                     # 진행중, 대기, 완료
    start_date: Optional[str]       # Start date
    completion_date: Optional[str]  # Completion date
    progress: int                   # 0-100 percentage
    cycle: Optional[str]            # C1, C2, C3
    blocker: Optional[str]          # Blocker ID if blocked

@dataclass
class Blocker:
    """Represents a blocker"""
    id: str                         # Blocker ID
    title: str                      # Blocker description
    priority: str                   # 높음, 중간, 낮음
    status: str                     # 🔄 진행중, ⚠️ 미해결, ✅ 해결
    owner: str                      # Lawson, 내부
    target_date: str                # Target resolution date
    impact: str                     # Impact description
    description: Optional[str]      # Detailed description
```

#### 2. MarkdownParser Class

```python
class MarkdownParser:
    """Static class for markdown parsing operations"""

    @staticmethod
    def parse_file(file_path: Path) -> Tuple[Dict[str, Any], str]:
        """
        Parse markdown file with frontmatter

        Args:
            file_path: Path to markdown file

        Returns:
            Tuple of (frontmatter_dict, content_string)
        """

    @staticmethod
    def extract_section(content: str, heading: str, level: int = 2) -> Optional[str]:
        """
        Extract content under a specific heading

        Args:
            content: Markdown content
            heading: Heading text to find (e.g., "이번 주 완료")
            level: Heading level (1-6, default 2 for ##)

        Returns:
            Section content as string, or None if not found

        Example:
            content = "## Tasks\n- Task 1\n- Task 2\n## Next\n- Task 3"
            extract_section(content, "Tasks", 2)  # Returns "- Task 1\n- Task 2"
        """

    @staticmethod
    def extract_tasks(content: str, filters: Optional[Dict[str, Any]] = None) -> List[Task]:
        """
        Extract tasks from markdown content with optional filtering

        Args:
            content: Markdown content containing tasks
            filters: Optional dictionary:
                {
                    'priority': 'P0',  # Filter by priority
                    'status': True,    # Filter by completion status
                    'tags': ['tag1']   # Filter by tags (must contain all)
                }

        Returns:
            List of Task objects

        Example:
            tasks = extract_tasks(content, {'priority': 'P0', 'status': False})
            # Returns all incomplete P0 tasks
        """

    @staticmethod
    def parse_table(content: str, section_heading: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Parse markdown table into list of dictionaries

        Args:
            content: Markdown content (or section content)
            section_heading: If provided, first extract section

        Returns:
            List of dicts, one per row (header columns as keys)

        Example:
            content = "| ID | Name |\n|---|---|\n| A1 | Feature 1 |"
            parse_table(content)  # Returns [{'ID': 'A1', 'Name': 'Feature 1'}]
        """
```

**Parsing Patterns**:

```python
# Task pattern
task_pattern = r'^(\s*-\s*\[([ xX])\])\s+(.+)$'
# Matches: "- [ ] Task description" or "- [x] Completed task"

# Tag pattern
tag_pattern = r'#([\w/-]+)'
# Matches: #storeagent/q1/p0

# Due date pattern
date_pattern = r'📅\s*(\d{4}-\d{2}-\d{2})'
# Matches: 📅 2026-02-15

# Priority detection
# ⏫ = P0, 🔼 = P1, 🔽 = P2
```

### aggregators/data_aggregator.py

**Purpose**: Load and organize data from multiple Obsidian files

**Key Components**:

#### 1. Data Containers

```python
@dataclass
class DashboardData:
    """Container for dashboard data"""
    current_week: int               # Current week number
    current_cycle: str              # Current cycle (C1-C3)
    current_date: str               # Today's date
    p0_tasks: List[Task]            # All P0 tasks
    p1_tasks: List[Task]            # All P1 tasks
    p2_tasks: List[Task]            # All P2 tasks
    all_tasks: List[Task]           # All tasks combined
    completed_this_week: List[Task] # Completed this week
    planned_next_week: List[Task]   # Planned for next week

@dataclass
class RoadmapData:
    """Container for roadmap data"""
    features: List[Feature]                      # All features
    features_by_priority: Dict[str, List[Feature]]  # Grouped by P0/P1/P2
    q1_features: List[Feature]                   # Q1 features only
    coordination_items: List[Dict[str, str]]     # Customer coordination
    blockers: List[str]                          # Feature blockers

@dataclass
class BlockerData:
    """Container for blocker data"""
    all_blockers: List[Blocker]                 # All blockers
    high_priority: List[Blocker]                # High priority
    medium_priority: List[Blocker]              # Medium priority
    low_priority: List[Blocker]                 # Low priority
    active_blockers: List[Blocker]              # Currently active
    resolved_blockers: List[Blocker]            # Resolved
```

#### 2. DataAggregator Class

```python
class DataAggregator:
    """Aggregates data from multiple Obsidian markdown files"""

    def __init__(self, config: Config):
        """
        Initialize aggregator with configuration

        Args:
            config: Config object with vault paths and sources
        """
        self.config = config
        self.parser = MarkdownParser()

    def load_dashboard_data(self) -> DashboardData:
        """
        Load PM Dashboard data

        Reads: _PM Dashboard.md
        Extracts:
            - Current week/cycle/date
            - All tasks (P0/P1/P2)
            - This week's completed tasks
            - Next week's planned tasks

        Returns:
            DashboardData object
        """

    def load_quarterly_data(self, quarter: int) -> QuarterlyData:
        """
        Load quarterly status data

        Args:
            quarter: Quarter number (1-4)

        Reads: 2026_Q{quarter}_Status.md
        Extracts:
            - Quarter metadata (start/end dates, total tasks)
            - P0/P1/P2 tasks for the quarter
            - Completion rates
            - Milestone information

        Returns:
            QuarterlyData object
        """

    def load_roadmap_data(self) -> RoadmapData:
        """
        Load roadmap feature data

        Reads: Lawson_2026_로드맵_관리.md
        Extracts:
            - All 17 features with status
            - Priority groupings
            - Q1-specific features
            - Customer coordination items
            - Blocker references

        Returns:
            RoadmapData object
        """

    def load_blocker_data(self) -> BlockerData:
        """
        Load blocker tracking data

        Reads: Blockers_Tracker.md
        Extracts:
            - All blockers with details
            - Priority groupings
            - Active vs resolved status
            - Owner information
            - Impact assessments

        Returns:
            BlockerData object
        """
```

### aggregators/metrics_calculator.py

**Purpose**: Calculate completion rates, progress metrics, and trends

```python
class MetricsCalculator:
    """Calculate various metrics from aggregated data"""

    @staticmethod
    def calculate_dashboard_metrics(dashboard: DashboardData) -> Metrics:
        """
        Calculate metrics from dashboard data

        Calculates:
            - P0/P1/P2 completion rates
            - Overall task completion percentage
            - This week's completion count
            - Tasks per priority level

        Returns:
            Metrics dictionary with keys:
                'p0_completion': float (0.0-100.0)
                'p1_completion': float
                'p2_completion': float
                'overall_completion': float
                'total_tasks': int
                'completed_tasks': int
        """

    @staticmethod
    def calculate_roadmap_metrics(roadmap: RoadmapData) -> Metrics:
        """
        Calculate roadmap progress metrics

        Calculates:
            - Feature completion by priority
            - Q1 feature progress
            - On-track vs delayed features
            - Blocker impact

        Returns:
            Metrics dictionary
        """

    @staticmethod
    def calculate_combined_metrics(
        dashboard: DashboardData,
        roadmap: RoadmapData,
        blocker_data: BlockerData,
        quarterly: QuarterlyData = None
    ) -> Metrics:
        """
        Calculate comprehensive metrics from all data sources

        Combines data from multiple sources to calculate:
            - Overall project health
            - Velocity trends
            - Blocker impact on progress
            - Quarterly completion projection

        Returns:
            Comprehensive metrics dictionary
        """
```

### generators/excel_generator.py

**Purpose**: Base Excel workbook creation with styling and structure

```python
class ExcelGenerator:
    """Base class for Excel workbook generation"""

    def __init__(self, config: Config):
        """
        Initialize generator with configuration

        Args:
            config: Config object with styling and output settings
        """
        self.config = config
        self.style_manager = StyleManager(config.styling)
        self.chart_builder = ChartBuilder()
        self.wb = None  # Workbook object

    def create_workbook(self) -> Workbook:
        """
        Create a new Excel workbook with default styling

        Returns:
            openpyxl Workbook object
        """

    def add_sheet(self, title: str, index: Optional[int] = None) -> Worksheet:
        """
        Add a new sheet to the workbook

        Args:
            title: Sheet name (max 31 characters)
            index: Position to insert (None = append)

        Returns:
            Worksheet object
        """

    def add_table(
        self,
        ws: Worksheet,
        headers: List[str],
        data: List[List[Any]],
        start_row: int,
        start_col: int = 1
    ) -> int:
        """
        Add a table with headers and data to worksheet

        Args:
            ws: Worksheet object
            headers: Column headers
            data: 2D list of data
            start_row: Starting row number (1-indexed)
            start_col: Starting column number (1-indexed)

        Returns:
            Next available row number after table

        Side effects:
            - Applies header styling
            - Auto-adjusts column widths
            - Adds borders to cells
        """

    def add_section(
        self,
        ws: Worksheet,
        title: str,
        row: int,
        col: int = 1
    ) -> int:
        """
        Add a section header to worksheet

        Args:
            ws: Worksheet object
            title: Section title text
            row: Row number for title
            col: Column number for title

        Returns:
            Next available row number

        Side effects:
            - Applies subheader styling
            - Makes title bold
        """

    def add_metric_boxes(
        self,
        ws: Worksheet,
        metrics: List[Dict[str, Any]],
        start_row: int,
        boxes_per_row: int = 4
    ) -> int:
        """
        Add metric boxes in a grid layout

        Args:
            ws: Worksheet object
            metrics: List of metric dicts with keys:
                {'label': str, 'value': str, 'color': str}
            start_row: Starting row number
            boxes_per_row: Number of boxes per row

        Returns:
            Next available row number

        Layout:
            ┌─────────┬─────────┬─────────┬─────────┐
            │ Label 1 │ Label 2 │ Label 3 │ Label 4 │
            │ Value 1 │ Value 2 │ Value 3 │ Value 4 │
            └─────────┴─────────┴─────────┴─────────┘
        """

    def save(self, output_path: Path):
        """
        Save workbook to file

        Args:
            output_path: Full path for output file

        Raises:
            PermissionError: If file is open or directory not writable
            IOError: If save fails
        """
```

### generators/style_manager.py

**Purpose**: Centralized styling management for Excel cells

```python
class StyleManager:
    """Manages Excel cell styling"""

    def __init__(self, styling_config: Dict[str, Any]):
        """
        Initialize with styling configuration

        Args:
            styling_config: Dictionary from config.yaml:
                {
                    'header_color': '4472C4',
                    'priority_colors': {'P0': 'FFC7CE', ...},
                    'status_colors': {'completed': 'C6EFCE', ...}
                }
        """

    def apply_header_style(self, cell, text: str = None):
        """Apply header style (dark blue, white text, bold)"""

    def apply_subheader_style(self, cell, text: str = None):
        """Apply subheader style (light blue, bold)"""

    def apply_priority_style(self, cell, priority: str):
        """
        Apply priority-based coloring

        Args:
            cell: Cell object
            priority: 'P0', 'P1', or 'P2'

        Colors:
            P0: Red background (FFC7CE)
            P1: Yellow background (FFEB9C)
            P2: Green background (C6EFCE)
        """

    def apply_status_style(self, cell, status: str):
        """
        Apply status-based coloring

        Args:
            cell: Cell object
            status: 'completed', 'in_progress', 'pending', 'blocked'

        Colors:
            completed: Green (C6EFCE)
            in_progress: Yellow (FFEB9C)
            pending: Red (FFC7CE)
            blocked: Gray (E7E6E6)
        """

    def apply_border(self, cell, style: str = 'thin'):
        """Apply border to cell"""

    def auto_adjust_column_widths(
        self,
        ws: Worksheet,
        min_width: int = 10,
        max_width: int = 50
    ):
        """
        Auto-adjust column widths based on content

        Args:
            ws: Worksheet object
            min_width: Minimum column width
            max_width: Maximum column width

        Algorithm:
            For each column:
                width = max(len(cell.value) for cell in column)
                width = clamp(width, min_width, max_width)
        """
```

### reports/weekly_report.py

**Purpose**: Generate 7-sheet Lawson weekly status report

```python
class WeeklyReportGenerator(ExcelGenerator):
    """Generates weekly report with 7 sheets"""

    def generate(
        self,
        output_filename: Optional[str] = None,
        date: Optional[datetime] = None
    ) -> Path:
        """
        Generate weekly report

        Args:
            output_filename: Custom filename (optional)
            date: Report date (defaults to today)

        Returns:
            Path to generated Excel file

        Process:
            1. Load all data (dashboard, roadmap, blockers, quarterly)
            2. Calculate metrics
            3. Create workbook with 7 sheets
            4. Apply styling
            5. Save to output directory

        Output:
            Lawson_Weekly_Report_W{week}_{date}.xlsx
        """

    def _create_sheet1_weekly_summary(
        self,
        dashboard: DashboardData,
        metrics: Metrics,
        week_info: dict
    ):
        """
        Sheet 1: 주간현황 (Weekly Summary)

        Layout:
            - Title and metadata (Week, Date, Cycle)
            - KPI metrics (P0/P1/P2 completion)
            - Completed tasks this week
            - Next week's planned tasks
        """

    def _create_sheet2_roadmap_progress(self, roadmap: RoadmapData):
        """
        Sheet 2: 로드맵진척 (Roadmap Progress)

        Table with columns:
            - Feature ID (A1-B12)
            - Feature Name
            - Priority (P0/P1/P2) with color coding
            - Status (진행중/대기/완료)
            - Start Date
            - Target Date
            - Progress %
        """

    # ... _create_sheet3 through _create_sheet7
    # See weekly_report.py:65-287 for full implementation
```

---

## Data Flow

### End-to-End Flow

```
1. User Invocation
   obsidian-excel generate weekly
         ↓
2. CLI Layer (cli.py)
   - Parse arguments (--date, --output, --dry-run)
   - Load configuration
   - Instantiate WeeklyReportGenerator
         ↓
3. Configuration Layer (config.py)
   - Load ~/.obsidian_excel_config.yaml
   - Resolve vault paths
   - Get styling settings
         ↓
4. Data Aggregation Layer (aggregators/)
   - DataAggregator.load_dashboard_data()
     → Read _PM Dashboard.md
     → Parse with MarkdownParser
     → Extract tasks by priority
     → Return DashboardData object
   - DataAggregator.load_roadmap_data()
     → Read Lawson_2026_로드맵_관리.md
     → Parse features table
     → Return RoadmapData object
   - DataAggregator.load_blocker_data()
     → Read Blockers_Tracker.md
     → Parse blocker table
     → Return BlockerData object
   - DataAggregator.load_quarterly_data(1)
     → Read 2026_Q1_Status.md
     → Parse P0/P1/P2 sections
     → Return QuarterlyData object
         ↓
5. Metrics Calculation (aggregators/metrics_calculator.py)
   - Calculate P0/P1/P2 completion rates
   - Calculate overall progress
   - Calculate week-over-week trends
         ↓
6. Excel Generation (reports/weekly_report.py)
   - Create workbook with 7 sheets
   - For each sheet:
     → Add title and metadata
     → Create tables from data
     → Apply styling (colors, fonts, borders)
     → Auto-adjust column widths
   - Save to output path
         ↓
7. Output
   /path/to/Excel/Lawson_Weekly_Report_W06_20260203.xlsx
```

### Data Transformation Example

**Input** (_PM Dashboard.md):
```markdown
## 이번 주 완료
- [x] Feature A1 implementation ⏫ 📅 2026-02-01 #storeagent/q1/p0
- [x] Database schema design 🔼 📅 2026-02-02 #storeagent/q1/p1
```

**Parsed** (Task objects):
```python
[
    Task(
        content="Feature A1 implementation",
        status=True,
        tags=["storeagent/q1/p0"],
        priority="P0",
        due_date=datetime(2026, 2, 1),
        raw_line="- [x] Feature A1 implementation ⏫ 📅 2026-02-01 #storeagent/q1/p0"
    ),
    Task(
        content="Database schema design",
        status=True,
        tags=["storeagent/q1/p1"],
        priority="P1",
        due_date=datetime(2026, 2, 2),
        raw_line="- [x] Database schema design 🔼 📅 2026-02-02 #storeagent/q1/p1"
    )
]
```

**Aggregated** (DashboardData):
```python
DashboardData(
    current_week=6,
    current_cycle="C2",
    current_date="2026-02-03",
    p0_tasks=[Task(content="Feature A1 implementation", ...)],
    p1_tasks=[Task(content="Database schema design", ...)],
    completed_this_week=[
        Task(content="Feature A1 implementation", ...),
        Task(content="Database schema design", ...)
    ],
    ...
)
```

**Rendered** (Excel Sheet 1):
```
| 주간현황 |                    |
|----------|---------------------|
| 주차     | W06                 |
| 날짜     | 2026-02-03          |
| 사이클   | C2                  |

| 이번 주 완료          |
|------------------------|
| Feature A1 implementation |
| Database schema design |
```

---

## Key Algorithms

### 1. Task Parsing Algorithm

```python
def extract_tasks(content: str, filters: Optional[Dict[str, Any]] = None) -> List[Task]:
    """
    Extract tasks from markdown content

    Time Complexity: O(n) where n = number of lines
    Space Complexity: O(m) where m = number of tasks found
    """
    lines = content.split('\n')
    tasks = []

    for line in lines:
        # 1. Match task pattern: - [ ] or - [x]
        task_match = re.match(r'^(\s*-\s*\[([ xX])\])\s+(.+)$', line)
        if not task_match:
            continue

        # 2. Extract completion status
        status = task_match.group(2).lower() == 'x'

        # 3. Extract tags using regex
        tags = re.findall(r'#([\w/-]+)', line)

        # 4. Detect priority from emoji or tag
        priority = None
        if '⏫' in line or 'P0' in tags:
            priority = 'P0'
        elif '🔼' in line or 'P1' in tags:
            priority = 'P1'
        elif '🔽' in line or 'P2' in tags:
            priority = 'P2'

        # 5. Extract due date
        date_match = re.search(r'📅\s*(\d{4}-\d{2}-\d{2})', line)
        due_date = None
        if date_match:
            try:
                due_date = datetime.strptime(date_match.group(1), '%Y-%m-%d')
            except ValueError:
                pass

        # 6. Clean content (remove metadata for display)
        clean_content = line
        clean_content = re.sub(r'⏫|🔼|🔽|📅\s*\d{4}-\d{2}-\d{2}', '', clean_content)
        clean_content = re.sub(r'#[\w/-]+', '', clean_content).strip()

        # 7. Create Task object
        task = Task(
            content=clean_content,
            status=status,
            tags=tags,
            priority=priority,
            due_date=due_date,
            raw_line=line
        )

        # 8. Apply filters
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
```

### 2. Week Number Calculation

```python
def get_week_number(date: datetime = None, start_day: int = 1) -> int:
    """
    Get ISO week number for a date

    ISO 8601 standard:
        - Week 1 is the first week with a Thursday
        - Weeks start on Monday (start_day=1)

    Args:
        date: Date to get week for (defaults to today)
        start_day: Week start day (1=Monday, 7=Sunday)

    Returns:
        Week number (1-53)

    Algorithm:
        1. Get ISO calendar (year, week, weekday)
        2. Return week number
    """
    if date is None:
        date = datetime.now()

    iso_calendar = date.isocalendar()
    return iso_calendar[1]  # week number
```

### 3. Completion Rate Calculation

```python
def calculate_completion_rate(tasks: List[Task]) -> float:
    """
    Calculate completion rate for a list of tasks

    Args:
        tasks: List of Task objects

    Returns:
        Completion rate as percentage (0.0-100.0)

    Algorithm:
        1. Count total tasks
        2. Count completed tasks (status=True)
        3. Calculate percentage: (completed / total) * 100
        4. Handle edge case: return 0 if total=0
    """
    if not tasks:
        return 0.0

    total = len(tasks)
    completed = sum(1 for task in tasks if task.status)

    return (completed / total) * 100.0
```

### 4. Auto Column Width Adjustment

```python
def auto_adjust_column_widths(
    ws: Worksheet,
    min_width: int = 10,
    max_width: int = 50
):
    """
    Auto-adjust column widths based on content

    Algorithm:
        For each column:
            1. Find max content length in column
            2. Add padding (+2 for margins)
            3. Clamp to [min_width, max_width]
            4. Set column width

    Time Complexity: O(rows * cols)
    """
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter

        for cell in column:
            if cell.value:
                cell_length = len(str(cell.value))
                max_length = max(max_length, cell_length)

        # Add padding and clamp
        adjusted_width = max_length + 2
        adjusted_width = max(min_width, min(adjusted_width, max_width))

        ws.column_dimensions[column_letter].width = adjusted_width
```

---

## Extending the System

### Adding a New Data Source

**1. Update Configuration**:

Edit `~/.obsidian_excel_config.yaml`:
```yaml
sources:
  my_new_source: "Path/To/NewSource.md"
```

**2. Create Data Container** (if needed):

In `aggregators/data_aggregator.py`:
```python
@dataclass
class NewSourceData:
    """Container for new source data"""
    field1: str
    field2: List[Any]
    field3: Dict[str, Any]
```

**3. Add Aggregation Method**:

```python
class DataAggregator:
    def load_new_source_data(self) -> NewSourceData:
        """
        Load data from new source

        Returns:
            NewSourceData object
        """
        # Get file path
        file_path = self.config.get_full_path('my_new_source')

        # Parse file
        metadata, content = self.parser.parse_file(file_path)

        # Extract data
        field1 = metadata.get('field1', '')
        field2 = self.parser.extract_tasks(content)
        field3 = self._parse_custom_format(content)

        return NewSourceData(
            field1=field1,
            field2=field2,
            field3=field3
        )
```

**4. Use in Report**:

```python
class MyReportGenerator(ExcelGenerator):
    def generate(self):
        # Load new data
        new_data = self.aggregator.load_new_source_data()

        # Use in sheets
        self._create_sheet_with_new_data(new_data)
```

### Adding Custom Styling

**1. Define in Configuration**:

```yaml
styling:
  custom_colors:
    urgent: "FF0000"
    normal: "00FF00"
    low: "0000FF"
```

**2. Add to StyleManager**:

```python
class StyleManager:
    def __init__(self, styling_config: Dict[str, Any]):
        # ... existing code ...

        # Add custom fills
        custom_colors = styling_config.get('custom_colors', {})
        self.urgent_fill = PatternFill(
            start_color=custom_colors.get('urgent', 'FF0000'),
            end_color=custom_colors.get('urgent', 'FF0000'),
            fill_type="solid"
        )

    def apply_custom_style(self, cell, category: str):
        """Apply custom category styling"""
        if category == 'urgent':
            cell.fill = self.urgent_fill
        elif category == 'normal':
            cell.fill = self.normal_fill
        # ... etc
```

---

## Adding New Report Types

### Step-by-Step Guide

**Example: Adding a "Customer Feedback Report"**

#### Step 1: Create Report File

Create `obsidian_excel_automation/reports/customer_feedback_report.py`:

```python
"""Customer feedback report generator"""

from typing import Optional
from datetime import datetime
from pathlib import Path

from ..generators.excel_generator import ExcelGenerator
from ..aggregators.data_aggregator import DataAggregator


class CustomerFeedbackReportGenerator(ExcelGenerator):
    """Generates customer feedback report with 3 sheets"""

    def __init__(self, config):
        super().__init__(config)
        self.aggregator = DataAggregator(config)

    def generate(
        self,
        output_filename: Optional[str] = None,
        date: Optional[datetime] = None
    ) -> Path:
        """
        Generate customer feedback report

        Args:
            output_filename: Custom filename (optional)
            date: Report date (defaults to today)

        Returns:
            Path to generated Excel file
        """
        # 1. Load data
        feedback_data = self.aggregator.load_customer_feedback_data()

        # 2. Create workbook
        self.wb = self.create_workbook()

        # 3. Create sheets
        self._create_sheet1_summary(feedback_data)
        self._create_sheet2_details(feedback_data)
        self._create_sheet3_trends(feedback_data)

        # 4. Generate filename
        if not output_filename:
            date_str = (date or datetime.now()).strftime('%Y%m%d')
            output_filename = f"Customer_Feedback_{date_str}.xlsx"

        # 5. Save
        output_path = self.config.get_output_path(output_filename)
        self.save(output_path)

        return output_path

    def _create_sheet1_summary(self, data):
        """Sheet 1: Feedback Summary"""
        ws = self.add_sheet("Feedback Summary", 0)

        # Title
        ws['A1'] = "Customer Feedback Summary"
        self.style_manager.apply_header_style(ws['A1'])

        # Metrics
        metrics = [
            {'label': 'Total Responses', 'value': len(data.responses)},
            {'label': 'Avg Rating', 'value': data.avg_rating},
            {'label': 'Satisfaction', 'value': f"{data.satisfaction}%"},
        ]
        self.add_metric_boxes(ws, metrics, start_row=3)

        # ... add more content

    def _create_sheet2_details(self, data):
        """Sheet 2: Detailed Feedback"""
        ws = self.add_sheet("Details", 1)

        # Table with all feedback
        headers = ["Date", "Customer", "Rating", "Comment", "Category"]
        table_data = [
            [f.date, f.customer, f.rating, f.comment, f.category]
            for f in data.responses
        ]
        self.add_table(ws, headers, table_data, start_row=2)

    def _create_sheet3_trends(self, data):
        """Sheet 3: Trend Analysis"""
        ws = self.add_sheet("Trends", 2)

        # Add trend chart
        # (use chart_builder here when charts are implemented)
```

#### Step 2: Add Data Aggregation

In `aggregators/data_aggregator.py`:

```python
@dataclass
class CustomerFeedbackData:
    """Container for customer feedback data"""
    responses: List[Dict[str, Any]]
    avg_rating: float
    satisfaction: float
    by_category: Dict[str, List[Any]]

class DataAggregator:
    def load_customer_feedback_data(self) -> CustomerFeedbackData:
        """Load customer feedback data"""
        file_path = self.config.get_full_path('customer_feedback')
        metadata, content = self.parser.parse_file(file_path)

        # Parse feedback entries
        responses = self.parser.parse_table(content, "Feedback Entries")

        # Calculate metrics
        avg_rating = sum(r['Rating'] for r in responses) / len(responses)
        satisfaction = (avg_rating / 5.0) * 100

        # Group by category
        by_category = {}
        for r in responses:
            cat = r['Category']
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(r)

        return CustomerFeedbackData(
            responses=responses,
            avg_rating=avg_rating,
            satisfaction=satisfaction,
            by_category=by_category
        )
```

#### Step 3: Add CLI Command

In `cli.py`:

```python
from .reports.customer_feedback_report import CustomerFeedbackReportGenerator

@generate.command('feedback')
@click.option('--output', type=click.Path(), help='Custom output filename')
def generate_feedback(output):
    """Generate customer feedback report (3 sheets)"""
    try:
        config = ConfigManager.load()
        generator = CustomerFeedbackReportGenerator(config)
        output_path = generator.generate(output_filename=output)

        click.echo(f"✅ Customer feedback report generated!")
        click.echo(f"📁 File: {output_path}")
    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        raise click.Abort()
```

#### Step 4: Update Configuration

In `~/.obsidian_excel_config.yaml`:

```yaml
sources:
  customer_feedback: "Customers/Feedback/Feedback_Tracker.md"

reports:
  customer_feedback:
    enabled: true
    filename_format: "Customer_Feedback_{date}.xlsx"
    sheets:
      - Feedback Summary
      - Details
      - Trends
```

#### Step 5: Test

```bash
# Test new report
obsidian-excel generate feedback

# Test with all reports
obsidian-excel generate all
```

---

## API Reference

### Core Classes

```python
# Configuration
class Config:
    vault_path: str
    base_path: str
    output_dir: str
    sources: Dict[str, str]
    reports: Dict[str, Dict[str, Any]]
    styling: Dict[str, Any]

    def get_full_path(source_key: str) -> Path
    def get_output_path(filename: str) -> Path

class ConfigManager:
    @classmethod
    def load(config_path: Optional[Path] = None) -> Config
    @classmethod
    def init(vault_path: str, base_path: str) -> Config
    @classmethod
    def update(key: str, value: str)

# Parsing
class Task:
    content: str
    status: bool
    tags: List[str]
    priority: Optional[str]
    due_date: Optional[datetime]

class MarkdownParser:
    @staticmethod
    def parse_file(file_path: Path) -> Tuple[Dict, str]
    @staticmethod
    def extract_tasks(content: str, filters: Dict = None) -> List[Task]
    @staticmethod
    def parse_table(content: str) -> List[Dict[str, str]]

# Aggregation
class DataAggregator:
    def load_dashboard_data() -> DashboardData
    def load_quarterly_data(quarter: int) -> QuarterlyData
    def load_roadmap_data() -> RoadmapData
    def load_blocker_data() -> BlockerData

# Generation
class ExcelGenerator:
    def create_workbook() -> Workbook
    def add_sheet(title: str) -> Worksheet
    def add_table(ws, headers, data, start_row) -> int
    def save(output_path: Path)

class StyleManager:
    def apply_header_style(cell, text: str = None)
    def apply_priority_style(cell, priority: str)
    def auto_adjust_column_widths(ws: Worksheet)
```

---

## Performance Considerations

### Optimization Strategies

**1. File Reading**:
- Single read per file (cache in memory)
- Lazy loading for large vaults

**2. Parsing**:
- Compiled regex patterns (module-level)
- Early termination on filters

**3. Excel Generation**:
- Batch cell updates where possible
- Minimize style applications

**4. Memory**:
- Use generators for large task lists
- Clear intermediate data structures

### Benchmarks

Typical performance (M1 MacBook Pro):

```
Vault size: 1000 markdown files
Tasks: 500 total
Features: 25
Blockers: 10

Load data:       0.3s
Parse tasks:     0.1s
Generate Excel:  0.2s
Total:          ~0.6s
```

For very large vaults (10,000+ files):
- Consider indexing
- Add caching layer
- Implement incremental updates

---

## Testing Strategy

### Unit Tests

Test individual components:

```python
# tests/test_parsers.py
def test_task_parsing():
    line = "- [ ] Task description ⏫ 📅 2026-02-15 #tag"
    task = Task.from_markdown(line)

    assert task.content == "Task description"
    assert task.status == False
    assert task.priority == "P0"
    assert task.due_date == datetime(2026, 2, 15)
    assert "tag" in task.tags

# tests/test_aggregators.py
def test_dashboard_loading(tmp_path):
    # Create test markdown file
    dashboard = tmp_path / "_PM Dashboard.md"
    dashboard.write_text("...")

    # Test loading
    aggregator = DataAggregator(config)
    data = aggregator.load_dashboard_data()

    assert data.current_week == 6
    assert len(data.p0_tasks) > 0
```

### Integration Tests

Test full workflow:

```python
# tests/test_reports.py
def test_weekly_report_generation(tmp_path, sample_vault):
    config = Config(vault_path=sample_vault, ...)
    generator = WeeklyReportGenerator(config)

    output = generator.generate()

    assert output.exists()
    assert output.stat().st_size > 1000  # Non-empty

    # Verify workbook
    wb = load_workbook(output)
    assert len(wb.sheetnames) == 7
    assert "주간현황" in wb.sheetnames
```

### Test Coverage Goals

- Parsers: 95%+ coverage
- Aggregators: 90%+ coverage
- Generators: 85%+ coverage
- CLI: 80%+ coverage

---

**Last Updated**: 2026-02-03
**Version**: 1.0.0
