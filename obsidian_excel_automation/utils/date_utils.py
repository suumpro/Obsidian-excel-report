"""
Date utility functions for week/quarter calculations
"""

from datetime import datetime, timedelta
from typing import Tuple


def get_week_number(date: datetime = None, start_day: int = 1) -> int:
    """
    Get ISO week number for a date

    Args:
        date: Date to calculate (defaults to today)
        start_day: 0=Sunday, 1=Monday (default)

    Returns:
        Week number (1-53)
    """
    if date is None:
        date = datetime.now()

    return date.isocalendar()[1]


def get_quarter(date: datetime = None) -> int:
    """
    Get quarter number (1-4) for a date

    Args:
        date: Date to calculate (defaults to today)

    Returns:
        Quarter number (1-4)
    """
    if date is None:
        date = datetime.now()

    return (date.month - 1) // 3 + 1


def get_week_range(week_number: int, year: int = None) -> Tuple[datetime, datetime]:
    """
    Get start and end dates for a week number

    Args:
        week_number: ISO week number
        year: Year (defaults to current year)

    Returns:
        (start_date, end_date) tuple
    """
    if year is None:
        year = datetime.now().year

    # Find first day of the year
    jan1 = datetime(year, 1, 1)

    # Find first Monday (ISO week start)
    days_since_monday = jan1.weekday()
    first_monday = jan1 - timedelta(days=days_since_monday)

    # Calculate week start
    week_start = first_monday + timedelta(weeks=week_number - 1)
    week_end = week_start + timedelta(days=6)

    return week_start, week_end


def get_quarter_range(quarter: int, year: int = None) -> Tuple[datetime, datetime]:
    """
    Get start and end dates for a quarter

    Args:
        quarter: Quarter number (1-4)
        year: Year (defaults to current year)

    Returns:
        (start_date, end_date) tuple
    """
    if year is None:
        year = datetime.now().year

    if quarter not in [1, 2, 3, 4]:
        raise ValueError("Quarter must be 1-4")

    start_month = (quarter - 1) * 3 + 1
    end_month = start_month + 2

    start_date = datetime(year, start_month, 1)

    # Last day of end_month
    if end_month == 12:
        end_date = datetime(year, 12, 31)
    else:
        end_date = datetime(year, end_month + 1, 1) - timedelta(days=1)

    return start_date, end_date


def format_date(date: datetime, format_string: str = "%Y-%m-%d") -> str:
    """
    Format date to string

    Args:
        date: Date to format
        format_string: Python date format string

    Returns:
        Formatted date string
    """
    return date.strftime(format_string)


def parse_date(date_string: str, format_string: str = "%Y-%m-%d") -> datetime:
    """
    Parse date from string

    Args:
        date_string: Date string
        format_string: Python date format string

    Returns:
        Datetime object
    """
    return datetime.strptime(date_string, format_string)


def get_current_week_info() -> dict:
    """Get current week information"""
    now = datetime.now()
    week_num = get_week_number(now)
    start, end = get_week_range(week_num)

    return {
        "week_number": week_num,
        "year": now.year,
        "start_date": start,
        "end_date": end,
        "formatted_week": f"W{week_num}",
        "formatted_date": format_date(now),
    }


def get_current_quarter_info() -> dict:
    """Get current quarter information"""
    now = datetime.now()
    quarter = get_quarter(now)
    start, end = get_quarter_range(quarter)

    return {
        "quarter": quarter,
        "year": now.year,
        "start_date": start,
        "end_date": end,
        "formatted_quarter": f"Q{quarter}",
        "formatted_date": format_date(now),
    }
