from bs4 import BeautifulSoup

from cspan_booknotes.exceptions import FieldNotFoundError

FIELD_NAME = "Duration"
FIELD_TAG_TYPE = "div"
FIELD_TAG_ID = "jw-video-duration"


def get_program_duration(html: BeautifulSoup) -> str:
    """Get the duration of the program from the HTML page."""
    duration_tag = html.find(FIELD_TAG_TYPE, {"class": FIELD_TAG_ID})
    if duration_tag is None:
        raise FieldNotFoundError
    return duration_tag.get_text(strip=True, separator=" ")
