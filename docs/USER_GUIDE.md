# Obsidian Excel Automation - User Guide

Complete guide to using the Obsidian Excel Automation system for generating professional Excel reports from your Obsidian markdown files.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Basic Usage](#basic-usage)
5. [Report Types](#report-types)
6. [Advanced Features](#advanced-features)
7. [Customization](#customization)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [FAQ](#faq)

---

## Introduction

### What is Obsidian Excel Automation?

Obsidian Excel Automation is a Python-based CLI tool that automatically generates professional Excel reports from your Obsidian markdown files. It eliminates the need for manual data entry, copy-pasting, and Excel formatting.

### Key Benefits

- **Time Savings**: 99% reduction in report creation time (10+ hours/week → <1 minute)
- **100% Accuracy**: Direct data extraction from Obsidian files eliminates manual errors
- **Consistency**: Professional formatting applied automatically every time
- **Flexibility**: Configurable data sources, styling, and report layouts
- **Extensibility**: Easy to add new report types or customize existing ones

### Supported Report Types

1. **Weekly Report** - 7-sheet Lawson weekly status (fully implemented)
2. **Quarterly Report** - 4-sheet quarterly status (coming soon)
3. **Feature Progress** - 3-sheet feature tracking (coming soon)
4. **Blocker Tracking** - 2-sheet blocker analysis (coming soon)

---

## Installation

### Prerequisites

- **Python 3.8 or higher** - Check with `python3 --version`
- **Obsidian vault** with task management markdown files
- **macOS, Linux, or Windows** operating system

### Step 1: Download or Clone

```bash
# If you have the source code
cd /path/to/obsidian-excel-automation
```

### Step 2: Create Virtual Environment

**Why virtual environment?** Isolates dependencies and avoids conflicts with system Python.

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

You should see `(venv)` in your terminal prompt when activated.

### Step 3: Install Package

```bash
# Install in editable mode (recommended for development)
pip install -e .

# Or install normally
pip install .
```

### Step 4: Verify Installation

```bash
# Check that the CLI is available
obsidian-excel --help

# Check version
obsidian-excel version
```

Expected output:
```
Obsidian Excel Automation v1.0.0
Copyright (c) 2026 Jamin Park
```

### Updating

To update to a newer version:

```bash
cd /path/to/obsidian-excel-automation
git pull  # if using git
pip install -e . --upgrade
```

---

## Configuration

### First-Time Setup

Initialize the configuration file with your Obsidian vault path:

```bash
obsidian-excel init "/Users/jamin.park/Downloads/Obsidian/2026"
```

This creates `~/.obsidian_excel_config.yaml` with default settings.

### Configuration File Location

- **macOS/Linux**: `~/.obsidian_excel_config.yaml`
- **Windows**: `C:\Users\YourName\.obsidian_excel_config.yaml`

### Configuration Structure

```yaml
# Vault and path settings
vault_path: /Users/jamin.park/Downloads/Obsidian/2026
base_path: 02. Area/03. Work/STOREAGENT
output_dir: 02. Area/03. Work/STOREAGENT/05_Roadmap/Excel

# Data source files (relative to vault_path/base_path)
sources:
  dashboard: 00_Dashboard/_PM Dashboard.md
  q1_status: 00_Dashboard/2026_Q1_Status.md
  q2_status: 00_Dashboard/2026_Q2_Status.md
  q3_status: 00_Dashboard/2026_Q3_Status.md
  q4_status: 00_Dashboard/2026_Q4_Status.md
  blockers: 00_Dashboard/Blockers_Tracker.md
  roadmap: 05_Roadmap/Lawson_2026_로드맵_관리.md
  betting: 02_Implementation/Betting/2026_Q1_Betting.md
  features_dir: 02_Implementation/Features
  playbook: ../../01. Project/PRJ_2026_플레이북/01_Strategic/KPIs/2026_H1_Goals.md

# Report settings
reports:
  weekly:
    enabled: true
    filename_format: "Lawson_Weekly_Report_W{week}_{date}.xlsx"
    sheets:
      - 주간현황
      - 로드맵진척
      - Q1작업상세
      - 블로커추적
      - Lawson협의
      - 마일스톤
      - 플레이북진척

  quarterly:
    enabled: true
    filename_format: "STOREAGENT_Q{quarter}_Status_{date}.xlsx"
    sheets:
      - Overview
      - P0_Tasks
      - P1_Tasks
      - Progress_Charts

  features:
    enabled: true
    filename_format: "STOREAGENT_Features_{date}.xlsx"
    sheets:
      - All_Features
      - By_Priority
      - By_Cycle

  blockers:
    enabled: true
    filename_format: "STOREAGENT_Blockers_{date}.xlsx"
    sheets:
      - Active_Blockers
      - Blocker_History

# Styling configuration
styling:
  header_color: "4472C4"      # Blue
  subheader_color: "D9E1F2"   # Light blue
  priority_colors:
    P0: "FFC7CE"  # Red (critical)
    P1: "FFEB9C"  # Yellow (high)
    P2: "C6EFCE"  # Green (medium)
  status_colors:
    completed: "C6EFCE"     # Green
    in_progress: "FFEB9C"   # Yellow
    pending: "FFC7CE"       # Red

# Advanced settings
advanced:
  week_start_day: 1  # 1=Monday, 7=Sunday
  date_format: "%Y-%m-%d"
  debug: false
  log_level: INFO
```

### Managing Configuration

#### View Current Configuration

```bash
obsidian-excel config show
```

#### Update Configuration Values

```bash
# Update vault path
obsidian-excel config set vault_path "/new/path/to/vault"

# Update output directory
obsidian-excel config set output_dir "/new/output/directory"

# Update nested values (use dot notation)
obsidian-excel config set styling.header_color "FF0000"
obsidian-excel config set reports.weekly.enabled true
```

#### Edit Configuration Manually

```bash
# Open in your default editor
nano ~/.obsidian_excel_config.yaml
# or
vim ~/.obsidian_excel_config.yaml
# or
code ~/.obsidian_excel_config.yaml
```

---

## Basic Usage

### Generate Weekly Report

The most common use case - generate a weekly status report:

```bash
# Activate virtual environment first
source venv/bin/activate

# Generate report for current week
obsidian-excel generate weekly
```

Output:
```
✅ Weekly report generated successfully!
📁 File: /Users/.../Lawson_Weekly_Report_W06_20260203.xlsx
📊 Open in Excel to view 7 sheets:
   1. 주간현황 (Weekly Summary)
   2. 로드맵진척 (Roadmap Progress)
   3. Q1작업상세 (Q1 Tasks)
   4. 블로커추적 (Blockers)
   5. Lawson협의 (Coordination)
   6. 마일스톤 (Milestones)
   7. 플레이북진척 (Playbook)
```

### Preview Before Generating

Use `--dry-run` to see what would be generated without creating the file:

```bash
obsidian-excel generate weekly --dry-run
```

Output:
```
🔍 Dry run - would generate:
   Report type: Weekly
   Week: W06
   Date: 2026-02-03
   Output: /Users/.../Lawson_Weekly_Report_W06_20260203.xlsx
```

### Generate for Specific Date

```bash
# Generate report for February 10, 2026
obsidian-excel generate weekly --date 2026-02-10
```

### Custom Output Filename

```bash
# Specify custom filename
obsidian-excel generate weekly --output "Custom_Weekly_Report.xlsx"

# Or with full path
obsidian-excel generate weekly --output "/path/to/output/MyReport.xlsx"
```

### Generate All Reports

```bash
# Generate all enabled reports at once
obsidian-excel generate all
```

This will generate:
- Weekly report (if enabled)
- Quarterly report (if enabled and implemented)
- Feature report (if enabled and implemented)
- Blocker report (if enabled and implemented)

---

## Report Types

### 1. Weekly Report

**Purpose**: Comprehensive weekly status for Lawson stakeholders

**Sheets** (7 total):

1. **주간현황 (Weekly Summary)**
   - Current week, date, cycle information
   - KPI metrics (P0/P1/P2 completion rates)
   - Completed tasks this week
   - Next week's planned tasks

2. **로드맵진척 (Roadmap Progress)**
   - 17 features with status
   - Priority indicators (P0/P1/P2)
   - Start dates and completion dates
   - Progress percentage

3. **Q1작업상세 (Q1 Tasks Detail)**
   - P0 tasks breakdown
   - P1 tasks breakdown
   - Due dates and owners
   - Task status tracking

4. **블로커추적 (Blockers)**
   - Active blockers by priority
   - Blocker owner (Lawson/Internal)
   - Target resolution dates
   - Impact assessment

5. **Lawson협의 (Coordination)**
   - Customer coordination items
   - Meeting notes and decisions
   - Action items from Lawson

6. **마일스톤 (Milestones)**
   - Q1 milestone tracking
   - Completion status
   - Critical path items

7. **플레이북진척 (Playbook Progress)**
   - Golden Case progress
   - Playbook KPI tracking
   - Strategic goals status

**Data Sources**:
- `_PM Dashboard.md` - Current status
- `2026_Q1_Status.md` - Task details
- `Blockers_Tracker.md` - Blocker information
- `Lawson_2026_로드맵_관리.md` - Roadmap features
- `2026_H1_Goals.md` - Playbook goals

**Usage**:
```bash
# Current week
obsidian-excel generate weekly

# Specific date
obsidian-excel generate weekly --date 2026-02-10

# Preview first
obsidian-excel generate weekly --dry-run
```

### 2. Quarterly Report (Coming Soon)

**Purpose**: End-of-quarter comprehensive status

**Sheets** (4 total):
1. Q{n} Overview - Quarter summary with KPIs
2. P0 Tasks - Critical tasks detail
3. P1 Tasks - High priority tasks
4. Progress Charts - Visual progress tracking

**Usage**:
```bash
# Auto-detect current quarter
obsidian-excel generate quarterly

# Specific quarter
obsidian-excel generate quarterly --quarter 2
```

### 3. Feature Progress Report (Coming Soon)

**Purpose**: Feature-level progress tracking

**Sheets** (3 total):
1. All Features - Overview of all 25 features
2. By Priority - Grouped by P0/P1/P2
3. By Cycle - Grouped by C1/C2/C3

**Usage**:
```bash
obsidian-excel generate features
```

### 4. Blocker Tracking Report (Coming Soon)

**Purpose**: Dedicated blocker analysis

**Sheets** (2 total):
1. Active Blockers - Current blockers with details
2. Blocker History - Resolved blockers with timeline

**Usage**:
```bash
obsidian-excel generate blockers
```

---

## Advanced Features

### Debug Mode

Enable detailed logging to troubleshoot issues:

```bash
obsidian-excel --debug generate weekly
```

Output includes:
- File reading operations
- Data parsing steps
- Excel generation progress
- Detailed error messages

### Scheduling Automatic Reports

#### Option 1: Cron (macOS/Linux)

Generate weekly report every Monday at 9 AM:

```bash
# Edit crontab
crontab -e

# Add this line
0 9 * * 1 cd /path/to/obsidian-excel-automation && source venv/bin/activate && obsidian-excel generate weekly
```

#### Option 2: Shell Script

Create `generate_weekly.sh`:

```bash
#!/bin/bash
cd /path/to/obsidian-excel-automation
source venv/bin/activate
obsidian-excel generate weekly
echo "Weekly report generated at $(date)"
```

Make executable and schedule:

```bash
chmod +x generate_weekly.sh
# Add to crontab
0 9 * * 1 /path/to/generate_weekly.sh >> /path/to/logs/weekly_report.log 2>&1
```

#### Option 3: Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Weekly, Monday, 9:00 AM
4. Action: Start a program
5. Program: `C:\path\to\venv\Scripts\python.exe`
6. Arguments: `-m obsidian_excel_automation.cli generate weekly`
7. Start in: `C:\path\to\obsidian-excel-automation`

### Batch Processing

Generate multiple reports at once:

```bash
#!/bin/bash
# generate_all_reports.sh

source venv/bin/activate

echo "Generating weekly report..."
obsidian-excel generate weekly

echo "Generating quarterly report..."
obsidian-excel generate quarterly

echo "Generating feature report..."
obsidian-excel generate features

echo "All reports generated!"
```

### Custom Date Ranges

Generate reports for last week:

```bash
# Calculate last Monday's date
LAST_MONDAY=$(date -v-7d -v-Mon +%Y-%m-%d)
obsidian-excel generate weekly --date $LAST_MONDAY
```

Generate reports for specific month:

```bash
# Loop through weeks in January 2026
for week in 1 2 3 4 5; do
  date=$(date -j -f "%Y-W%V-%u" "2026-W0${week}-1" +%Y-%m-%d)
  obsidian-excel generate weekly --date $date
done
```

---

## Customization

### Styling Customization

Edit `~/.obsidian_excel_config.yaml`:

```yaml
styling:
  # Header colors (hex without #)
  header_color: "4472C4"      # Dark blue
  subheader_color: "D9E1F2"   # Light blue

  # Priority colors
  priority_colors:
    P0: "FFC7CE"  # Red background for critical
    P1: "FFEB9C"  # Yellow background for high
    P2: "C6EFCE"  # Green background for medium

  # Status colors
  status_colors:
    completed: "C6EFCE"     # Green
    in_progress: "FFEB9C"   # Yellow
    pending: "FFC7CE"       # Red
    blocked: "E7E6E6"       # Gray
```

Color reference:
- Red tones: FFC7CE (light), FF0000 (bright)
- Yellow tones: FFEB9C (light), FFD700 (gold)
- Green tones: C6EFCE (light), 00FF00 (bright)
- Blue tones: D9E1F2 (light), 4472C4 (dark)
- Gray tones: E7E6E6 (light), 808080 (medium)

### Data Source Customization

If your Obsidian structure is different, update source paths:

```yaml
sources:
  dashboard: "My_Dashboard/Dashboard.md"
  q1_status: "Status/Q1.md"
  # ... etc
```

Paths are relative to `vault_path/base_path`.

### Filename Format Customization

Change how generated files are named:

```yaml
reports:
  weekly:
    filename_format: "Weekly_{week}_{date}.xlsx"
    # Results in: Weekly_W06_20260203.xlsx

  quarterly:
    filename_format: "Q{quarter}_{year}_Status.xlsx"
    # Results in: Q1_2026_Status.xlsx
```

Available variables:
- `{week}` - Week number (e.g., W06)
- `{date}` - Date in YYYYMMDD format
- `{year}` - Year (e.g., 2026)
- `{quarter}` - Quarter number (e.g., 1)
- `{month}` - Month number (e.g., 02)
- `{day}` - Day (e.g., 03)

### Sheet Customization

Add or remove sheets from reports:

```yaml
reports:
  weekly:
    sheets:
      - 주간현황
      - 로드맵진척
      - Q1작업상세
      # Remove sheets you don't need
      # Add custom sheets (requires code changes)
```

Note: Removing sheets requires corresponding code changes in `reports/weekly_report.py`.

### Adding Custom Data Sources

To add a new data source:

1. **Update configuration**:
```yaml
sources:
  my_custom_data: "Path/To/Custom.md"
```

2. **Access in code**:
```python
# In your report generator
custom_path = self.config.get_full_path('my_custom_data')
metadata, content = MarkdownParser.parse_file(custom_path)
```

---

## Troubleshooting

### Issue: Configuration file not found

**Error**:
```
❌ FileNotFoundError: Configuration file not found
```

**Solution**:
```bash
# Initialize configuration
obsidian-excel init "/path/to/your/obsidian/vault"

# Verify it was created
obsidian-excel config show
```

### Issue: Source file not found

**Warning**:
```
⚠️  Warning: Could not find file: 00_Dashboard/_PM Dashboard.md
```

**Solutions**:

1. **Check if file exists**:
```bash
ls "/Users/jamin.park/Downloads/Obsidian/2026/02. Area/03. Work/STOREAGENT/00_Dashboard/_PM Dashboard.md"
```

2. **Update configuration if path changed**:
```bash
obsidian-excel config set sources.dashboard "NewPath/_PM Dashboard.md"
```

3. **Verify full path**:
```bash
obsidian-excel config show
# Check that vault_path + base_path + source path is correct
```

### Issue: Permission denied saving Excel file

**Error**:
```
❌ PermissionError: [Errno 13] Permission denied
```

**Solutions**:

1. **Check if file is open in Excel**:
   - Close the Excel file and try again

2. **Check directory permissions**:
```bash
# Create output directory if missing
mkdir -p "/Users/jamin.park/Downloads/Obsidian/2026/02. Area/03. Work/STOREAGENT/05_Roadmap/Excel"

# Check permissions
ls -la "/Users/jamin.park/Downloads/Obsidian/2026/02. Area/03. Work/STOREAGENT/05_Roadmap/"
```

3. **Change output directory**:
```bash
obsidian-excel config set output_dir "~/Desktop/Excel_Reports"
```

### Issue: Module not found errors

**Error**:
```
ModuleNotFoundError: No module named 'openpyxl'
```

**Solution**:

1. **Ensure virtual environment is activated**:
```bash
source venv/bin/activate
# You should see (venv) in your prompt
```

2. **Reinstall dependencies**:
```bash
cd /path/to/obsidian-excel-automation
pip install -r requirements.txt
```

3. **Verify installation**:
```bash
pip list | grep openpyxl
# Should show: openpyxl 3.1.0 (or similar)
```

### Issue: Incorrect data in report

**Problem**: Report shows wrong data or missing information

**Solutions**:

1. **Enable debug mode**:
```bash
obsidian-excel --debug generate weekly
# Check log output for parsing issues
```

2. **Verify source files have correct format**:
   - Tasks should use `- [ ]` or `- [x]` format
   - Tables should have proper markdown table syntax
   - Frontmatter should be valid YAML

3. **Check Obsidian file content**:
   - Ensure priority tags are present (⏫ P0, 🔼 P1, 🔽 P2)
   - Verify due dates use `📅 YYYY-MM-DD` format
   - Check that sections exist with correct headings

### Issue: Empty or partially empty sheets

**Problem**: Some sheets are empty or missing data

**Causes**:
- Source files don't exist
- Data format doesn't match expected patterns
- Section headings don't match

**Debug Steps**:

1. **Run with debug mode**:
```bash
obsidian-excel --debug generate weekly 2>&1 | tee debug.log
```

2. **Check log for warnings**:
```
⚠️  No tasks found in section: 이번 주 완료
⚠️  No table found in section: Features
```

3. **Verify source file content matches expected format**

### Issue: Week number is incorrect

**Problem**: Report shows wrong week number

**Solution**:

Check week start day setting:

```yaml
advanced:
  week_start_day: 1  # 1=Monday, 7=Sunday
```

ISO week numbering starts weeks on Monday. If your organization uses Sunday, change to 7.

### Getting More Help

If you encounter issues not covered here:

1. **Check logs**: Run with `--debug` flag
2. **Verify configuration**: Run `obsidian-excel config show`
3. **Check file formats**: Ensure Obsidian files match expected syntax
4. **Review documentation**: See TECHNICAL.md for architecture details
5. **Report bugs**: (Add your issue tracking link here)

---

## Best Practices

### 1. Regular Workflow

**Recommended Weekly Workflow**:

```bash
# Monday morning routine
cd /path/to/obsidian-excel-automation
source venv/bin/activate

# Preview first
obsidian-excel generate weekly --dry-run

# Generate actual report
obsidian-excel generate weekly

# Open in Excel and review
open /path/to/output/Lawson_Weekly_Report_W*.xlsx
```

### 2. Maintaining Data Quality

**In Obsidian**:
- Use consistent task syntax: `- [ ]` for pending, `- [x]` for completed
- Always tag with priority: ⏫ P0, 🔼 P1, 🔽 P2
- Include due dates: 📅 YYYY-MM-DD
- Keep frontmatter updated
- Use consistent section headings

**Example Task Format**:
```markdown
- [ ] Implement user authentication ⏫ 📅 2026-02-15 #storeagent/q1/p0
- [x] Design database schema 🔼 📅 2026-02-01 #storeagent/q1/p1
```

### 3. Version Control

**Track your Excel outputs**:

```bash
# Create output archive directory
mkdir -p ~/Excel_Reports/Archive/2026/Q1

# After generating, copy to archive
cp /path/to/output/Lawson_Weekly_Report_*.xlsx ~/Excel_Reports/Archive/2026/Q1/
```

**Track configuration changes**:

```bash
# Back up your configuration
cp ~/.obsidian_excel_config.yaml ~/.obsidian_excel_config.yaml.backup

# Track in git (if desired)
cd ~
git add .obsidian_excel_config.yaml
git commit -m "Update Excel automation config"
```

### 4. Performance Optimization

**For large vaults**:

1. **Limit data sources**: Only include files you need
2. **Use specific sections**: Extract only required sections, not entire files
3. **Cache results**: Generate once, reuse throughout the day
4. **Regular cleanup**: Archive completed tasks to separate files

### 5. Consistency Standards

**Establish team standards**:

1. **Task format**: Agree on tag taxonomy
2. **Priority levels**: Define clear P0/P1/P2 criteria
3. **Section names**: Use consistent heading names
4. **Update frequency**: Define when tasks should be updated
5. **Review process**: Who reviews reports before sharing

### 6. Backup Strategy

**Protect your work**:

```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR=~/Backups/Obsidian_Excel/$DATE

mkdir -p $BACKUP_DIR

# Backup configuration
cp ~/.obsidian_excel_config.yaml $BACKUP_DIR/

# Backup generated reports
cp -r /path/to/output/*.xlsx $BACKUP_DIR/

echo "Backup completed: $BACKUP_DIR"
```

Run weekly or after major config changes.

---

## FAQ

### Q: How do I change the output directory?

```bash
obsidian-excel config set output_dir "/new/path/to/output"
```

### Q: Can I generate reports for past weeks?

Yes, use the `--date` option:

```bash
obsidian-excel generate weekly --date 2026-01-27
```

### Q: How do I disable a specific report type?

Edit `~/.obsidian_excel_config.yaml`:

```yaml
reports:
  quarterly:
    enabled: false  # Disable quarterly reports
```

### Q: Can I customize the Excel styling?

Yes, edit the `styling` section in the config file. See [Styling Customization](#styling-customization).

### Q: What if my Obsidian structure is different?

Update the `sources` section in your config to match your vault structure. See [Data Source Customization](#data-source-customization).

### Q: How do I add a new report type?

This requires coding. See `docs/TECHNICAL.md` for guidance on extending the system.

### Q: Can I use this with multiple Obsidian vaults?

Yes, either:
1. Create multiple config files and specify with `--config` flag (feature to be added)
2. Switch config values before generating:
```bash
obsidian-excel config set vault_path "/path/to/vault2"
obsidian-excel generate weekly
```

### Q: Why is my virtual environment deactivated?

You need to activate it each time you open a new terminal:

```bash
cd /path/to/obsidian-excel-automation
source venv/bin/activate
```

Consider adding an alias to your `~/.bashrc` or `~/.zshrc`:

```bash
alias excel-weekly='cd /path/to/obsidian-excel-automation && source venv/bin/activate && obsidian-excel generate weekly'
```

### Q: Can I preview the data before generating Excel?

Yes, use `--dry-run`:

```bash
obsidian-excel generate weekly --dry-run
```

For more detailed preview, use `--debug`:

```bash
obsidian-excel --debug generate weekly --dry-run
```

### Q: How do I update to a new version?

```bash
cd /path/to/obsidian-excel-automation
git pull  # if using git
source venv/bin/activate
pip install -e . --upgrade
```

### Q: What's the difference between `pip install .` and `pip install -e .`?

- `pip install .` - Regular installation, changes require reinstall
- `pip install -e .` - Editable installation, changes take effect immediately (recommended for development)

### Q: Can I run this on a schedule?

Yes, see [Scheduling Automatic Reports](#scheduling-automatic-reports).

### Q: How do I see what version I have installed?

```bash
obsidian-excel version
```

### Q: Where are the logs stored?

Logs are output to the console. To save logs:

```bash
obsidian-excel generate weekly 2>&1 | tee report_generation.log
```

---

## Next Steps

- **Workflow Guide**: See `WORKFLOW.md` for Obsidian best practices
- **Technical Details**: See `TECHNICAL.md` for architecture and extension guide
- **Workflow Review**: See `WORKFLOW_REVIEW.md` for improvement recommendations

---

**Last Updated**: 2026-02-03
**Version**: 1.0.0
