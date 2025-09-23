import re

PROGRAM_ID_EXTRACT_PATTERN = r"booknotes\.c-span\.org/Watch/(\d+-\d+)"


def get_program_id(url: str, _pattern: str = PROGRAM_ID_EXTRACT_PATTERN) -> str:
    """Extract episode ID from URL.
    URLs look like this: 'https://booknotes.c-span.org/Watch/57267-1'."""
    assert isinstance(url, str)
    # let's use a proper regex to do this; not `.split()`
    match = re.search(_pattern, url)
    if match:
        return match.group(1)
    else:
        raise ValueError(f"Invalid URL format: {url}")
