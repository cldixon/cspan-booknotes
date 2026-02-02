from bs4 import BeautifulSoup

from cspan_booknotes.exceptions import GuestAuthorNotFoundError


def get_guest_author(html: BeautifulSoup) -> str:
    """Extract guest author name from HTML."""
    guest_author_tag = html.find("div", id="AuthorName")
    if guest_author_tag is None:
        raise GuestAuthorNotFoundError

    return guest_author_tag.get_text(strip=True, separator=" ")
