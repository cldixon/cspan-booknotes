from bs4 import BeautifulSoup

from cspan_booknotes import PageContent
from cspan_booknotes.models import Program, RelatedProgram, TranscriptEntry
from cspan_booknotes.parser.air_date import get_original_air_date
from cspan_booknotes.parser.description import get_program_description
from cspan_booknotes.parser.guest import get_guest_author
from cspan_booknotes.parser.isbn import get_book_isbn
from cspan_booknotes.parser.program_id import get_program_id
from cspan_booknotes.parser.related import get_related_programs
from cspan_booknotes.parser.title import get_program_title
from cspan_booknotes.parser.transcript import get_transcript

## ---------------------------------- ##
## ---- PARSE HTML PAGE CONTENT  ---- ##
## ---------------------------------- ##


class ProgramParser:
    def parse(self, page: PageContent) -> Program:
        return Program(
            id=self.get_program_id(page["url"]),
            url=page["url"],
            title=self._get_program_title(page["html"]),
            guest=self._get_guest_author(page["html"]),
            description=self._get_program_description(page["html"]),
            book_isbn=self._get_book_isbn(page["html"]),
            air_date=self._get_air_date(page["html"]),
            transcript=self._get_transcript(page["html"]),
            related=self._get_related_programs(page["html"]),
        )

    def get_program_id(self, url: str) -> str:
        """Extract episode ID from URL.
        URLs look like this: 'https://booknotes.c-span.org/Watch/57267-1'."""
        return get_program_id(url)

    def _get_program_title(self, html: BeautifulSoup) -> str:
        return get_program_title(html)

    def _get_program_description(self, html: BeautifulSoup) -> str | None:
        return get_program_description(html)

    def _get_air_date(self, html: BeautifulSoup) -> str:
        return get_original_air_date(html)

    def _get_guest_author(self, html: BeautifulSoup) -> str:
        return get_guest_author(html)

    def _get_book_isbn(self, html: BeautifulSoup) -> str | None:
        return get_book_isbn(html)

    def _get_transcript(self, html: BeautifulSoup) -> list[TranscriptEntry]:
        return get_transcript(html)

    def _get_related_programs(self, html: BeautifulSoup) -> list[RelatedProgram]:
        return get_related_programs(html)
