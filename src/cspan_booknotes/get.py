from typing import TypedDict

import requests
from bs4 import BeautifulSoup


## ---- COLLECT HTML PAGE CONTENT ---- ##
class PageContent(TypedDict):
    url: str
    html: BeautifulSoup


def get_program_page(url: str) -> PageContent:
    assert isinstance(url, str)
    resp = requests.get(url)
    resp.raise_for_status()
    html = BeautifulSoup(resp.content, features="lxml")
    return PageContent(url=url, html=html)
