# Obsidian Excel Automation Plugin

> Generate professional Excel reports directly from your Obsidian markdown files

## Overview

This Obsidian plugin automatically converts your markdown task management files into professional Excel reports. Perfect for project managers who use Obsidian for planning and need to generate stakeholder reports in Excel format.

> [한국어 문서 (Korean Documentation)](README_KO.md)

**Version**: 3.0.0
**Author**: Jamin Park
**License**: MIT
**Platform**: Desktop only (ExcelJS requires Node.js APIs)

## Features

- **4 Report Types**: Weekly, Quarterly, Feature Progress, Blocker Tracking
- **Multi-language Support**: English, Korean, Japanese, and custom presets
- **One-Click Generation**: Generate reports via command palette or ribbon icon
- **Auto-Detection**: Automatically detects current week/quarter
- **Customizable**: Configure parsing rules, styling, and report structure
- **Professional Formatting**: Colors, charts, conditional formatting
- **100% Data Accuracy**: Direct parsing from Obsidian markdown files

---

## Installation

### Method 1: Manual Installation (Recommended)

1. **Download the plugin files**
   - Download `main.js`, `manifest.json`, and `styles.css` from the releases

2. **Install in your vault**
   ```
   your-vault/
   └── .obsidian/
       └── plugins/
           └── obsidian-excel-automation/
               ├── main.js
               ├── manifest.json
               └── styles.css
   ```

3. **Enable the plugin**
   - Open Obsidian Settings (`Cmd/Ctrl + ,`)
   - Go to **Community plugins**
   - Find "Excel Automation" and toggle it ON

### Method 2: Build from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/obsidian-excel-automation.git
   cd obsidian-excel-automation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the plugin**
   ```bash
   npm run build
   ```

4. **Copy to your vault**
   ```bash
   cp main.js manifest.json /path/to/your-vault/.obsidian/plugins/obsidian-excel-automation/
   ```

5. **Enable the plugin** in Obsidian settings

---

## Quick Start

### 1. Configure Source Files

Open Obsidian Settings > **Excel Automation** and set up your source files:

| Setting | Description | Example |
|---------|-------------|---------|
| Base Path | Root folder for all source files | `02. Area/Work/PROJECT` |
| Output Directory | Where Excel files will be saved | `Reports/Excel` |
| Dashboard File | PM Dashboard markdown file | `00_Dashboard/_PM Dashboard.md` |
| Blockers File | Blockers tracker markdown file | `03_Issues/Blockers.md` |

### 2. Generate Your First Report

**Option A: Using the Ribbon Icon**
- Click the Excel icon in the left ribbon
- Generates a weekly report by default

**Option B: Using Command Palette**
1. Press `Cmd/Ctrl + P` to open command palette
2. Type "Excel" to filter commands
3. Select the report type you want to generate

### 3. Find Your Report

Reports are saved to your configured **Output Directory** with automatic naming:
- Weekly: `Weekly_W05_20260204.xlsx`
- Quarterly: `Quarterly_Q1_20260204.xlsx`
- Feature: `Features_20260204.xlsx`
- Blocker: `Blockers_20260204.xlsx`

---

## Available Commands

Access these via Command Palette (`Cmd/Ctrl + P`):

| Command | Description |
|---------|-------------|
| **Generate Weekly Report** | Creates 7-sheet report with weekly summary, roadmap, tasks, blockers, coordination, milestones, playbook |
| **Generate Quarterly Report** | Creates 4-sheet report with quarterly overview, P0 tasks, P1 tasks, progress analytics |
| **Generate Feature Progress Report** | Creates 3-sheet report with all features, by priority, by cycle |
| **Generate Blocker Tracking Report** | Creates 2-sheet report with active blockers and history |
| **Generate All Enabled Reports** | Generates all report types that are enabled in settings |

---

## Report Types

### 1. Weekly Report (7 Sheets)

| Sheet | Content |
|-------|---------|
| Weekly Summary | KPI dashboard with total tasks, completion rates, blockers |
| Roadmap Progress | Progress tracking for roadmap items |
| Task Details | All Q1 tasks with status, owner, deadline |
| Blocker Tracking | Current blockers affecting progress |
| Coordination | Cross-team coordination items |
| Milestones | Key milestones and target dates |
| Playbook Progress | Playbook execution tracking |

### 2. Quarterly Report (4 Sheets)

| Sheet | Content |
|-------|---------|
| Quarterly Overview | Quarter summary with KPIs |
| P0 Critical Tasks | High-priority critical tasks |
| P1 High Priority | Important high-priority items |
| Progress Analytics | Charts and trend analysis |

### 3. Feature Progress Report (3 Sheets)

| Sheet | Content |
|-------|---------|
| All Features | Complete feature list with status |
| By Priority | Features grouped by priority (P0, P1, P2) |
| By Cycle | Features grouped by development cycle |

### 4. Blocker Tracking Report (2 Sheets)

| Sheet | Content |
|-------|---------|
| Active Blockers | Currently unresolved blockers |
| Blocker History | Resolved blockers with resolution details |

---

## Configuration

### Language & Presets

The plugin supports multiple languages with built-in presets:

| Preset | Language | Description |
|--------|----------|-------------|
| Korean | 한국어 | Full Korean labels and parsing rules |
| English | English | English labels with standard parsing |
| Japanese | 日本語 | Japanese labels with localized parsing |
| Minimal | English | Simplified reports with abbreviated labels |

**To change language:**
1. Go to Settings > Excel Automation
2. Under "Language", select your preferred preset
3. Settings will refresh with new labels

### Source Files Configuration

```
Settings > Excel Automation > Paths
```

| Setting | Description |
|---------|-------------|
| **Base Path** | Root folder containing all source markdown files |
| **Output Directory** | Folder where generated Excel files are saved |
| **Dashboard File** | Path to PM Dashboard file (relative to Base Path) |
| **Q1 Status File** | Path to Q1 status markdown file |
| **Blockers File** | Path to blockers tracker file |
| **Roadmap File** | Path to roadmap markdown file |

### Report Settings

Enable/disable specific reports and customize filenames:

```
Settings > Excel Automation > Reports
```

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Weekly Report | ON | Generate weekly 7-sheet report |
| Weekly Filename | `Weekly_W{week}_{date}.xlsx` | Filename format |
| Enable Quarterly Report | ON | Generate quarterly 4-sheet report |
| Enable Feature Report | ON | Generate feature progress report |
| Enable Blocker Report | ON | Generate blocker tracking report |

**Filename Placeholders:**
- `{week}` - Week number (01-52)
- `{quarter}` - Quarter number (1-4)
- `{date}` - Date in YYYYMMDD format

### Styling

Customize the appearance of generated reports:

```
Settings > Excel Automation > Styling
```

| Setting | Default | Description |
|---------|---------|-------------|
| Header Color | `#4472C4` | Background color for table headers |
| P0 Priority Color | `#FF6B6B` | Color for critical (P0) items |
| P1 Priority Color | `#FFE066` | Color for high priority (P1) items |
| P2 Priority Color | `#69DB7C` | Color for normal (P2) items |

### Advanced Settings

```
Settings > Excel Automation > Advanced
```

| Setting | Default | Description |
|---------|---------|-------------|
| Debug Mode | OFF | Enable verbose console logging |
| Week Start Day | Sunday | First day of the week (Sunday/Monday) |

---

## Markdown Format Requirements

The plugin parses your markdown files to extract data. Here's how to format your files:

### Tasks

Use standard markdown checkboxes with optional priority indicators:

```markdown
- [ ] Task not started
- [x] Completed task
- [/] Task in progress

## Priority Indicators (any of these work)
- [ ] ⏫ P0 Critical task
- [ ] 🔼 P1 High priority task
- [ ] 🔽 P2 Normal task
- [ ] [P0] Critical using tag
- [ ] #P1 High priority using hashtag
```

### Features

Features are detected by ID patterns (e.g., `F001`, `FEAT-123`):

```markdown
## F001 - User Authentication
- Status: In Progress
- Priority: P0
- Owner: @john
- Cycle: Sprint 3

## F002 - Dashboard
- Status: Completed
- Priority: P1
```

### Blockers

Blockers use status indicators:

```markdown
## High Priority Blockers

### ⚠️ API Rate Limiting Issue
- Impact: Affecting 3 features
- Owner: @jane
- Status: Investigating

### ✅ Database Connection Issue
- Impact: Resolved
- Resolution: Increased connection pool
```

### Tables

The plugin can parse markdown tables:

```markdown
| Category | Content | Owner | Deadline |
|----------|---------|-------|----------|
| Backend | API refactoring | @john | 2026-02-15 |
| Frontend | Dashboard update | @jane | 2026-02-20 |
```

---

## Import/Export Configuration

### Export Configuration

1. Go to Settings > Excel Automation > Import/Export
2. Click **Export**
3. Save the JSON file

### Import Configuration

1. Go to Settings > Excel Automation > Import/Export
2. Click **Import**
3. Select a previously exported JSON configuration file

### Reset to Defaults

Click **Reset** to restore all settings to default values.

---

## Troubleshooting

### Report Generation Fails

1. **Check source file paths**
   - Ensure all configured paths exist in your vault
   - Paths should be relative to vault root

2. **Check file content**
   - Source files must contain valid markdown
   - Enable Debug Mode to see parsing details

3. **Check output directory**
   - Ensure the output directory exists
   - Check you have write permissions

### No Data in Reports

1. **Verify markdown format**
   - Tasks must use `- [ ]` checkbox format
   - Priority indicators must match configured patterns

2. **Check parsing rules**
   - Go to Settings and verify parsing configuration
   - Try the English preset for standard formatting

### Styling Issues

1. **Colors not appearing**
   - Ensure hex colors include `#` prefix
   - Example: `#4472C4` not `4472C4`

### Debug Mode

Enable Debug Mode for detailed logging:
1. Go to Settings > Excel Automation > Advanced
2. Enable **Debug Mode**
3. Open Developer Console (`Cmd/Ctrl + Shift + I`)
4. Check console for parsing details

---

## Keyboard Shortcuts

You can assign custom hotkeys to any command:

1. Go to Settings > Hotkeys
2. Search for "Excel"
3. Click the `+` button to assign a hotkey

**Suggested shortcuts:**
- `Cmd/Ctrl + Shift + W` - Generate Weekly Report
- `Cmd/Ctrl + Shift + Q` - Generate Quarterly Report

---

## API for Developers

If you want to extend the plugin:

```typescript
// Access plugin instance
const plugin = app.plugins.plugins['obsidian-excel-automation'];

// Get current configuration
const config = plugin.configManager.get();

// Generate report programmatically
await plugin.generateWeeklyReport();
await plugin.generateQuarterlyReport();
await plugin.generateFeatureReport();
await plugin.generateBlockerReport();
```

---

## Changelog

### v3.0.0 (2026-02-06)
- Added Executive Summary dashboard sheet
- Enhanced task detection with Dataview inline fields
- Added regex caching for performance improvement
- 242 tests with 71% code coverage
- Fixed generateAllReports() to check both ConfigManager and legacy settings
- Set isDesktopOnly: true for proper mobile compatibility

### v2.0.0 (2026-02-04)
- Added multi-language support (English, Korean, Japanese)
- Added ConfigManager for centralized configuration
- Added 4 preset templates
- Added BaseReport abstract class
- Eliminated 200+ hardcoded values
- Added import/export configuration
- Added reset to defaults option

### v1.0.0 (2026-02-03)
- Initial release
- Weekly, Quarterly, Feature, Blocker reports
- Basic styling configuration
- Command palette integration

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/obsidian-excel-automation/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/obsidian-excel-automation/discussions)

---

## License

MIT License - see [LICENSE](LICENSE) file for details.
