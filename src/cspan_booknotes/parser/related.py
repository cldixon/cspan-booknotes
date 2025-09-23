from urllib.parse import urljoin

from bs4 import BeautifulSoup

from cspan_booknotes.constants import ROOT_URL
from cspan_booknotes.exceptions import RelatedProgramsNotFoundError
from cspan_booknotes.models.fields import RelatedProgram


def process_related_program_item(item) -> RelatedProgram:
    ## -- program id
    path = item.find("div", class_="AuthorNameSmall").find("a").get("href")
    program_id = path.split("/")[-1]

    ## -- program url
    program_url = urljoin(ROOT_URL, path)

    ## -- author
    author = item.find("div", class_="AuthorNameSmall").get_text(
        strip=True, separator=" "
    )

    ## -- title
    title = item.find("div", class_="BookTitleSmall").get_text(
        strip=True, separator=" "
    )
    return RelatedProgram(id=program_id, url=program_url, author=author, title=title)


def get_related_programs(html: BeautifulSoup) -> list[RelatedProgram]:
    ## -- get related programs section
    related_program_section = html.find("div", id="RelateProgram")

    if related_program_section is None:
        raise RelatedProgramsNotFoundError

    ## -- get all related program items
    related_program_items = related_program_section.find_all("div", class_="RPItem")

    processed_items = [
        process_related_program_item(item) for item in related_program_items
    ]
    return processed_items
