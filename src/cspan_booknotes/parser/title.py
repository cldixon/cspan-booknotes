from bs4 import BeautifulSoup

from cspan_booknotes.exceptions import TitleNotFoundError


def get_program_title(html: BeautifulSoup) -> str:
    title_div = html.find("div", {"id": "pnlProgramTitle"})
    if title_div:
        title_text = title_div.get_text(separator=" ", strip=True)
        return title_text

    raise TitleNotFoundError
