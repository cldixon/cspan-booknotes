from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field

from cspan_booknotes.models.validators import (
    validate_air_date,
    validate_episode_duration,
    validate_program_id,
)

## -------------------- ##
## ---- PROGRAM ID ---- ##
## -------------------- ##


ProgramId = Annotated[
    str,
    AfterValidator(validate_program_id),
    Field(..., description="The ID of the program. Can be found in the program's URL."),
]

## --------------------------- ##
## ---- ORIGINAL AIR DATE ---- ##
## --------------------------- ##


AirDate = Annotated[
    str,
    Field(
        description="Original air date in 'Month DD, YYYY' format",
        examples=[
            "June 5, 1994",
            "January 15, 1990",
            "December 25, 2000",
            "Feb 14, 1995",
        ],
        pattern=r"^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}$",
        min_length=8,  # "Jan 1, 1990"
        max_length=20,  # "September 30, 2004"
    ),
    AfterValidator(validate_air_date),
]

## ---- PROGRAM DESCRIPTION ---- ##


ProgramDescription = Annotated[
    str | None, Field(..., description="The description of the program", min_length=25)
]

## ---------------------- ##
## ---- GUEST AUTHOR ---- ##
## ---------------------- ##


GuestAuthor = Annotated[
    str,
    Field(
        ..., description="The guest author of the episode", min_length=5, max_length=250
    ),
]


## ------------------- ##
## ---- BOOK ISBN ---- ##
## ------------------- ##


BookISBN = Annotated[
    str | None,
    Field(
        description="Valid ISBN-10 or ISBN-13 number (with or without hyphens)",
        examples=["978-0-123456-78-9", "0123456789", "012345678X"],
        min_length=9,
        max_length=17,  # Accounts for hyphens in ISBN-13
    ),
]

## ---- PROGRAM TITLE ---- ##

ProgramTitle = Annotated[
    str,
    Field(..., description="The title of the episode", min_length=5, max_length=250),
]


## ---------------------- ##
## ---- PROGRAM URL ---- ##
## ---------------------- ##


ProgramUrl = Annotated[
    str, Field(..., description="The URL of the episode", min_length=5, max_length=250)
]

## -------------------- ##
## ---- TRANSCRIPT ---- ##
## -------------------- ##


class TranscriptEntry(BaseModel):
    """A single entry/line in the conversation transcript"""

    index: int = Field(description="Sequential line number in the transcript")
    speaker_role: Literal["host", "guest"] = Field(description="Role of the speaker")
    speaker_name: str = Field(
        description="Speaker's name/identifier (e.g., 'LAMB', 'AMBROSE')"
    )
    text: str = Field(description="Full text content of the speaker's statement")


Transcript = Annotated[
    list[TranscriptEntry],
    Field(
        description="Complete conversation transcript between host and guest",
    ),
]


## -------------------------- ##
## ---- RELATED PROGRAMS ---- ##
## -------------------------- ##


## --- RELATED PROGRAMS ---- ##
class RelatedProgram(BaseModel):
    """A related program via recommendation."""

    id: ProgramId
    url: ProgramUrl
    author: GuestAuthor
    title: ProgramTitle


RelatedPrograms = Annotated[
    list[RelatedProgram],
    Field(description="Complete conversation transcript between host and guest"),
]


## ---- PROGRAM DURATION ---- ##

ProgramDuration = Annotated[
    str,
    Field(
        description="Program duration in MM:SS or HH:MM:SS format",
        examples=["57:09", "1:23:45", "2:15", "0:45"],
        pattern=r"^(\d{1,2}):([0-5]\d)$|^(\d{1,2}):([0-5]\d):([0-5]\d)$",
        min_length=4,  # Minimum "0:00"
        max_length=8,  # Maximum "99:59:59"
    ),
    AfterValidator(validate_episode_duration),
]
