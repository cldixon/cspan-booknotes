from bs4 import BeautifulSoup

from cspan_booknotes.exceptions import AirDateNotFoundError


def get_original_air_date(html: BeautifulSoup) -> str:
    field_element = html.find("span", id="lblAirDate")
    if field_element is None:
        raise AirDateNotFoundError

    field_text = field_element.get_text(strip=True, separator=" ")
    return field_text
