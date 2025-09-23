import json
import logging
import os
from pathlib import Path
from urllib.parse import urljoin

import polars as pl
import ray
from bs4 import BeautifulSoup

from cspan_booknotes import get_program_page
from cspan_booknotes.constants import ROOT_URL
from cspan_booknotes.get import PageContent
from cspan_booknotes.parser import ProgramParser

ray.init(log_to_driver=False, logging_level=logging.CRITICAL)


AUTHOR_INDEX_FILEPATH = "data/author_index.parquet"

## -- SET UP LOCAL DIRECTORY PATHS FOR STORING OUTPUTS

PROJECT_ROOT = Path(
    __file__
).parent.parent.absolute()  # or however you define your project root


HTML_CACHE_DIR = PROJECT_ROOT / "data" / "html_cache"
os.makedirs(HTML_CACHE_DIR, exist_ok=True)


PARSED_PROGRAM_DIR = PROJECT_ROOT / "data" / "programs"
os.makedirs(PARSED_PROGRAM_DIR, exist_ok=True)


def read_html_from_file(filepath) -> BeautifulSoup:
    """Read HTML content from a local file."""
    with open(filepath, "r") as f:
        page_content = f.read()
    return BeautifulSoup(page_content, "lxml")


def save_to_json(data: dict, filepath: str) -> None:
    with open(filepath, "w") as outfile:
        json.dump(data, outfile)
        outfile.close()


@ray.remote
def parse_program_webpage(url: str) -> None:
    parser = ProgramParser()
    program_id = parser.get_program_id(url)

    ## -- set output path for parsed data
    parsed_output_path = os.path.join(PARSED_PROGRAM_DIR, f"{program_id}.json")

    ## -- check if parsed data already exists
    if os.path.exists(parsed_output_path):
        return

    ## -- check if html already downloaded in cache
    html_cache_path = os.path.join(HTML_CACHE_DIR, f"{program_id}.html")
    if os.path.exists(html_cache_path):
        html = read_html_from_file(html_cache_path)
        page_content = PageContent(url=url, html=html)
    else:
        ## -- download and cache html content
        page_content = get_program_page(url)
        try:
            with open(html_cache_path, "w") as f:
                f.write(str(page_content["html"]))
        except Exception as e:
            raise ValueError(f"Error caching HTML for {url}: {e}. CWD: {os.getcwd()}")

    ## -- parse program html
    try:
        program_object = parser.parse(page_content)
    except Exception as e:
        raise ValueError(f"Error parsing program '{program_id}' HTML for {url}: {e}")

    ## -- convert to dictionary
    program_data = program_object.model_dump()

    ## -- save as json to disk
    save_to_json(program_data, parsed_output_path)
    return


def main():
    ## -- read author index file
    df = pl.read_parquet(AUTHOR_INDEX_FILEPATH)
    print(f"Loaded {len(df)} index entries from '{AUTHOR_INDEX_FILEPATH}'")

    ## -- build urls for all index pages
    all_program_page_urls = [
        urljoin(ROOT_URL, path) for path in df["program_path"].to_list()
    ]
    print(f"Example program URLs: {all_program_page_urls[:3]}")

    all_programs = ray.get(
        [parse_program_webpage.remote(url) for url in all_program_page_urls]
    )

    ## -- check total results parsed
    num_parsed_programs = len(os.listdir(PARSED_PROGRAM_DIR))
    num_webpages_cached = len(os.listdir(HTML_CACHE_DIR))
    print(f"Total programs parsed: {num_parsed_programs}/{len(all_program_page_urls)}")
    print(f"Total webpages cached: {num_webpages_cached}/{len(all_program_page_urls)}")
    return


if __name__ == "__main__":
    main()
