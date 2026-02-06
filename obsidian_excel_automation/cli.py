"""
Command-line interface for Obsidian Excel Automation
"""

import click
from pathlib import Path
from datetime import datetime

from .config import ConfigManager
from .reports.weekly_report import WeeklyReportGenerator
from .reports.quarterly_report import QuarterlyReportGenerator
from .utils.logger import logger, setup_logger
from .utils.date_utils import get_current_week_info, get_current_quarter_info


@click.group()
@click.option('--debug', is_flag=True, help='Enable debug logging')
def cli(debug):
    """Obsidian Excel Automation - Generate Excel reports from Obsidian markdown files"""
    if debug:
        global logger
        logger = setup_logger(level='DEBUG')


@cli.command()
@click.argument('vault_path', type=click.Path(exists=True))
@click.option('--base-path', default='02. Area/03. Work/STOREAGENT', help='Base path within vault')
def init(vault_path, base_path):
    """Initialize configuration file"""
    try:
        config = ConfigManager.init(vault_path, base_path)
        click.echo(f"✅ Configuration created at: {ConfigManager.DEFAULT_CONFIG_PATH}")
        click.echo(f"   Vault path: {config.vault_path}")
        click.echo(f"   Base path: {config.base_path}")
        click.echo(f"   Output dir: {config.output_dir}")
        click.echo("\nEdit the config file to customize paths and settings.")
    except Exception as e:
        click.echo(f"❌ Error creating configuration: {e}", err=True)
        raise click.Abort()


@cli.group()
def config():
    """Manage configuration"""
    pass


@config.command('show')
def config_show():
    """Show current configuration"""
    try:
        cfg = ConfigManager.load()
        click.echo("📋 Current Configuration")
        click.echo(f"\nVault path: {cfg.vault_path}")
        click.echo(f"Base path: {cfg.base_path}")
        click.echo(f"Output dir: {cfg.output_dir}")
        click.echo(f"\nData sources:")
        for key, path in cfg.sources.items():
            click.echo(f"  {key}: {path}")
        click.echo(f"\nReports:")
        for report_type, settings in cfg.reports.items():
            status = "✅ Enabled" if settings.get('enabled') else "❌ Disabled"
            click.echo(f"  {report_type}: {status}")
    except FileNotFoundError as e:
        click.echo(f"❌ {e}", err=True)
        click.echo("Run 'obsidian-excel init <vault_path>' to create configuration.", err=True)
        raise click.Abort()


@config.command('set')
@click.argument('key')
@click.argument('value')
def config_set(key, value):
    """Set a configuration value (e.g., vault_path /path/to/vault)"""
    try:
        ConfigManager.update(key, value)
        click.echo(f"✅ Updated {key} = {value}")
    except Exception as e:
        click.echo(f"❌ Error updating configuration: {e}", err=True)
        raise click.Abort()


@cli.group()
def generate():
    """Generate Excel reports"""
    pass


@generate.command('weekly')
@click.option('--date', type=click.DateTime(formats=['%Y-%m-%d']), help='Report date (YYYY-MM-DD)')
@click.option('--output', type=click.Path(), help='Custom output filename')
@click.option('--dry-run', is_flag=True, help='Preview without creating file')
def generate_weekly(date, output, dry_run):
    """Generate weekly report (Lawson format, 7 sheets)"""
    try:
        # Load config
        config = ConfigManager.load()

        if dry_run:
            week_info = get_current_week_info()
            click.echo("🔍 Dry run - would generate:")
            click.echo(f"   Report type: Weekly")
            click.echo(f"   Week: {week_info['formatted_week']}")
            click.echo(f"   Date: {week_info['formatted_date']}")
            filename = config.reports['weekly']['filename_format'].format(
                week=week_info['formatted_week'],
                date=week_info['formatted_date'].replace('-', '')
            )
            output_path = config.get_output_path(filename)
            click.echo(f"   Output: {output_path}")
            return

        # Generate report
        generator = WeeklyReportGenerator(config)
        output_path = generator.generate(output_filename=output, date=date)

        click.echo(f"✅ Weekly report generated successfully!")
        click.echo(f"📁 File: {output_path}")
        click.echo(f"📊 Open in Excel to view 7 sheets:")
        click.echo(f"   1. 주간현황 (Weekly Summary)")
        click.echo(f"   2. 로드맵진척 (Roadmap Progress)")
        click.echo(f"   3. Q1작업상세 (Q1 Tasks)")
        click.echo(f"   4. 블로커추적 (Blockers)")
        click.echo(f"   5. Lawson협의 (Coordination)")
        click.echo(f"   6. 마일스톤 (Milestones)")
        click.echo(f"   7. 플레이북진척 (Playbook)")

    except FileNotFoundError as e:
        click.echo(f"❌ {e}", err=True)
        click.echo("Run 'obsidian-excel init <vault_path>' first.", err=True)
        raise click.Abort()
    except Exception as e:
        click.echo(f"❌ Error generating report: {e}", err=True)
        import traceback
        if logger.level <= 10:  # DEBUG
            traceback.print_exc()
        raise click.Abort()


@generate.command('quarterly')
@click.option('--quarter', type=int, help='Quarter number (1-4, auto-detected if not specified)')
@click.option('--year', type=int, help='Year (defaults to current year)')
@click.option('--output', type=click.Path(), help='Custom output filename')
@click.option('--dry-run', is_flag=True, help='Preview without creating file')
def generate_quarterly(quarter, year, output, dry_run):
    """Generate quarterly status report (4 sheets)"""
    try:
        # Load config
        config = ConfigManager.load()

        # Auto-detect quarter if not specified
        if quarter is None or year is None:
            quarter_info = get_current_quarter_info()
            if quarter is None:
                quarter = quarter_info['quarter']
            if year is None:
                year = quarter_info['year']

        if dry_run:
            click.echo("🔍 Dry run - would generate:")
            click.echo(f"   Report type: Quarterly Status")
            click.echo(f"   Quarter: Q{quarter} {year}")
            filename = config.reports['quarterly']['filename_format'].format(
                quarter=quarter,
                date=datetime.now().strftime('%Y%m%d')
            )
            output_path = config.get_output_path(filename)
            click.echo(f"   Output: {output_path}")
            return

        # Generate report
        click.echo(f"📊 Generating Q{quarter} {year} status report...")
        generator = QuarterlyReportGenerator(config)
        output_path = generator.generate(
            quarter=quarter,
            year=year,
            output_filename=output
        )

        click.echo(f"✅ Quarterly report generated successfully!")
        click.echo(f"📁 File: {output_path}")
        click.echo(f"📊 Open in Excel to view 4 sheets:")
        click.echo(f"   1. Q{quarter} Overview (Summary & KPIs)")
        click.echo(f"   2. P0 Tasks (Critical tasks)")
        click.echo(f"   3. P1 Tasks (High priority tasks)")
        click.echo(f"   4. Progress Charts (Visual analytics)")

    except FileNotFoundError as e:
        click.echo(f"❌ {e}", err=True)
        click.echo("Run 'obsidian-excel init <vault_path>' first.", err=True)
        raise click.Abort()
    except Exception as e:
        click.echo(f"❌ Error generating report: {e}", err=True)
        import traceback
        if logger.level <= 10:  # DEBUG
            traceback.print_exc()
        raise click.Abort()


@generate.command('features')
@click.option('--output', type=click.Path(), help='Custom output filename')
def generate_features(output):
    """Generate feature progress report (3 sheets)"""
    click.echo("📊 Generating feature progress report...")
    click.echo("⚠️  Feature report not yet implemented")
    click.echo("   Use 'obsidian-excel generate weekly' for now")


@generate.command('blockers')
@click.option('--output', type=click.Path(), help='Custom output filename')
def generate_blockers(output):
    """Generate blocker tracking report (2 sheets)"""
    click.echo("📊 Generating blocker tracking report...")
    click.echo("⚠️  Blocker report not yet implemented")
    click.echo("   Use 'obsidian-excel generate weekly' for now")


@generate.command('all')
def generate_all():
    """Generate all enabled reports"""
    try:
        config = ConfigManager.load()

        enabled_reports = [
            report_type for report_type, settings in config.reports.items()
            if settings.get('enabled', False)
        ]

        click.echo(f"📊 Generating {len(enabled_reports)} reports...")

        for report_type in enabled_reports:
            if report_type == 'weekly':
                click.echo("\n🔄 Generating weekly report...")
                generator = WeeklyReportGenerator(config)
                output_path = generator.generate()
                click.echo(f"✅ Weekly report: {output_path}")
            elif report_type == 'quarterly':
                click.echo("\n🔄 Generating quarterly report...")
                quarter_info = get_current_quarter_info()
                generator = QuarterlyReportGenerator(config)
                output_path = generator.generate(
                    quarter=quarter_info['quarter'],
                    year=quarter_info['year']
                )
                click.echo(f"✅ Quarterly report: {output_path}")
            else:
                click.echo(f"⏭️  Skipping {report_type} (not yet implemented)")

        click.echo(f"\n✅ All reports generated!")

    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        raise click.Abort()


@cli.command()
def version():
    """Show version information"""
    click.echo("Obsidian Excel Automation v1.0.0")
    click.echo("Copyright (c) 2026 Jamin Park")


if __name__ == '__main__':
    cli()
