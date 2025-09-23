import re
from datetime import datetime
from typing import Any

## ---- PROGRAM ID ---- ##


def validate_program_id(value: Any) -> str:
    """
    Validates that the program ID follows the correct format: digits-digits
    For use with pydantic.AfterValidator
    """
    if not isinstance(value, str):
        raise ValueError(f"Program ID must be a string, got {type(value).__name__}")

    pattern = r"^\d+-\d+$"
    if not re.match(pattern, value):
        raise ValueError(
            f"Program ID '{value}' must be in format 'numbers-numbers' (e.g., '57267-1')"
        )

    return value


## ---- ORIGINAL AIR DATE ---- ##


def validate_air_date(value: Any) -> str:
    """
    Validates original air date in "Month DD, YYYY" format.
    Keeps the original string format but validates it's a proper date.
    For use with pydantic.AfterValidator
    """
    if not isinstance(value, str):
        raise ValueError(f"Air date must be a string, got {type(value).__name__}")

    date_str = value.strip()

    if not date_str:
        raise ValueError("Air date cannot be empty")

    # Pattern for "Month DD, YYYY" format
    # Month names can be full or abbreviated
    pattern = r"^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})$"

    match = re.match(pattern, date_str)
    if not match:
        raise ValueError(
            f"Air date '{date_str}' must be in 'Month DD, YYYY' format "
            f"(e.g., 'June 5, 1994', 'January 15, 1990')"
        )

    month_name, day, year = match.groups()
    day = int(day)
    year = int(year)

    # Additional validation: ensure it's a valid date
    try:
        # Try to parse the date to ensure it's valid (e.g., not February 30)
        datetime.strptime(date_str, "%B %d, %Y")
    except ValueError:
        try:
            # Try abbreviated month format
            datetime.strptime(date_str, "%b %d, %Y")
        except ValueError:
            raise ValueError(f"Air date '{date_str}' is not a valid calendar date")

    # Reasonable bounds for Booknotes (ran 1989-2004)
    if year < 1980 or year > 2010:
        raise ValueError(
            f"Air date year '{year}' seems outside reasonable range for Booknotes episodes"
        )

    if day < 1 or day > 31:
        raise ValueError(f"Air date day '{day}' must be between 1 and 31")

    return date_str  # Return original string format


## ---- PROGRAM TITLE ---- ##


def validate_title(title: str) -> bool:
    return bool(title.strip())


## ---- PROGRAM DURATION VALIDATION ---- ##


def validate_episode_duration(value: Any) -> str:
    """
    Validates episode duration in MM:SS or HH:MM:SS format.
    For use with pydantic.AfterValidator
    """
    if not isinstance(value, str):
        raise ValueError(
            f"Episode duration must be a string, got {type(value).__name__}"
        )

    duration = value.strip()

    if not duration:
        raise ValueError("Episode duration cannot be empty")

    # Pattern for MM:SS or HH:MM:SS format
    # ^(\d{1,2}):([0-5]\d)$ for MM:SS (minutes:seconds)
    # ^(\d{1,2}):([0-5]\d):([0-5]\d)$ for HH:MM:SS (hours:minutes:seconds)
    mm_ss_pattern = r"^(\d{1,2}):([0-5]\d)$"
    hh_mm_ss_pattern = r"^(\d{1,2}):([0-5]\d):([0-5]\d)$"

    if re.match(mm_ss_pattern, duration):
        # Validate MM:SS format
        minutes, seconds = duration.split(":")
        minutes = int(minutes)
        seconds = int(seconds)

        if minutes > 999:  # Reasonable upper limit for minutes
            raise ValueError(
                f"Episode duration '{duration}' has too many minutes (max 999)"
            )

    elif re.match(hh_mm_ss_pattern, duration):
        # Validate HH:MM:SS format
        hours, minutes, seconds = duration.split(":")
        hours = int(hours)
        minutes = int(minutes)
        seconds = int(seconds)

        if hours > 99:  # Reasonable upper limit for hours
            raise ValueError(
                f"Episode duration '{duration}' has too many hours (max 99)"
            )

    else:
        raise ValueError(
            f"Episode duration '{duration}' must be in MM:SS or HH:MM:SS format "
            f"(e.g., '57:09', '1:23:45'). Minutes and seconds must be 00-59."
        )

    return duration
