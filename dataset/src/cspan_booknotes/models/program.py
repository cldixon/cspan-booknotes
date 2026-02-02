from pydantic import BaseModel

from cspan_booknotes.models.fields import (
    AirDate,
    BookISBN,
    GuestAuthor,
    ProgramDescription,
    ProgramId,
    ProgramTitle,
    ProgramUrl,
    RelatedPrograms,
    Transcript,
)

## ---------------------------- ##
## ---- PROGRAM DEFINITION ---- ##
## ---------------------------- ##


class Program(BaseModel):
    id: ProgramId
    url: ProgramUrl
    title: ProgramTitle
    guest: GuestAuthor
    description: ProgramDescription
    book_isbn: BookISBN
    air_date: AirDate
    transcript: Transcript
    related: RelatedPrograms
