import logging
import string
from typing import Literal
from urllib.parse import urljoin

import polars as pl
import ray
import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel

from cspan_booknotes.models import ProgramId
from cspan_booknotes.models.fields import ProgramTitle

ray.init(log_to_driver=False, logging_level=logging.CRITICAL)

AUTHOR_INDEX_URL = "https://booknotes.c-span.org/AuthorIndex/"

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
}

OUTPUT_FILEPATH = "data/author_index.parquet"


AlphaIndexSchema = Literal[
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
]


class AuthorIndexEntry(BaseModel):
    program_id: ProgramId
    program_path: str
    author_name: str
    program_title: ProgramTitle


def process_index_entry(index_entry) -> dict:
    ## -- get path
    program_path = (
        index_entry.find("td", class_="aLinkItem")
        .find("a", class_="aLinkItem")
        .get("href")
    )

    ## -- extract id from path
    program_id = program_path.split("/")[-1]

    ## -- get author name
    author_name = index_entry.find("td", class_="aLinkItem").get_text(
        strip=True, separator=" "
    )

    ## -- get program title
    program_title = index_entry.find("a", class_="pLinkItem").get_text()

    return AuthorIndexEntry(
        program_id=program_id,
        program_path=program_path,
        author_name=author_name,
        program_title=program_title,
    ).model_dump()


@ray.remote
def get_author_index(url: str, headers: dict = DEFAULT_HEADERS) -> list[dict]:
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.content, features="lxml")

    ## -- get all entry tags
    entry_tags = soup.find_all("tr", {"class": "rowStyl"})

    return [process_index_entry(entry) for entry in entry_tags]


def main():
    ## -- start with letter 'A'
    all_index_page_urls = [
        urljoin(AUTHOR_INDEX_URL, letter) for letter in string.ascii_uppercase
    ]

    print(
        f"Author index organized alphabetically. Collecting and processing {len(all_index_page_urls)} pages in parallel."
    )

    ## -- get all author index entries
    author_index_entries = ray.get(
        [get_author_index.remote(url) for url in all_index_page_urls]
    )

    ## -- flatten list of lists
    author_index_entries = [
        entry for sublist in author_index_entries for entry in sublist
    ]

    ## -- print example entry
    print(f"Returned {len(author_index_entries)} author index entries")
    print(f"Example entry: {author_index_entries[0]}")

    ## -- convert to dataframe and save to parquet file
    author_index_df = pl.DataFrame(author_index_entries)
    author_index_df.write_parquet(OUTPUT_FILEPATH)

    return


if __name__ == "__main__":
    main()
