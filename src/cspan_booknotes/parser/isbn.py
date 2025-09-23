from bs4 import BeautifulSoup

from cspan_booknotes.exceptions import BookISBNNotFoundError


def get_book_isbn(html: BeautifulSoup) -> str | None:
    book_isbn_element = html.find("span", id="lblISBN")
    if book_isbn_element is None:
        raise BookISBNNotFoundError

    isbn_text = book_isbn_element.get_text(strip=True, separator=" ")
    return isbn_text if isbn_text != "" else None
