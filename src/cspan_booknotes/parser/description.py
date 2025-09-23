import re

from bs4 import BeautifulSoup

from cspan_booknotes.exceptions import DescriptionNotFoundError

DESCRIPTION_TAG_TYPE = "div"
DESCRIPTION_TAG_ID = "progContent"


def get_program_description(html: BeautifulSoup) -> str | None:
    description_tag = html.find("div", id="progContent")
    if description_tag is None:
        raise DescriptionNotFoundError

    description_text = description_tag.get_text(strip=True, separator=" ")
    description_text = re.sub(r"\n+", " ", description_text)
    description_text = re.sub(r"\s+", " ", description_text)

    return description_text if description_text != "" else None
