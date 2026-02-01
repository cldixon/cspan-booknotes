from bs4 import BeautifulSoup

from cspan_booknotes.exceptions import TranscriptNotFoundError
from cspan_booknotes.models.fields import TranscriptEntry


def process_transcript_entry(entry_tag, index: int = 0) -> TranscriptEntry:
    ## -- speaker role (take from div class attribute)
    speaker_role = entry_tag.get("class")[0]

    ## -- speaker name
    speaker_name = entry_tag.find("span").get_text(strip=True, separator=" ")

    ## -- entry text
    entry_text = " ".join(entry_tag.find_all(string=True, recursive=False)).strip()

    return TranscriptEntry(
        index=index,
        speaker_role=speaker_role,
        speaker_name=speaker_name,
        text=entry_text,
    )


def get_transcript(html: BeautifulSoup) -> list[TranscriptEntry]:
    ## -- get conversation transcript section
    transcript_section = html.find("div", id="transContent").find(
        "div", id="ransContPadding"
    )
    if transcript_section is None:
        raise TranscriptNotFoundError()

    ## -- get conversation turns from the transcript (only take tags marked as 'guest' or 'host')
    transcript_entries = transcript_section.find_all("div", class_=["guest", "host"])

    ## -- process transcript entries
    transcript_entries = [
        process_transcript_entry(entry, index=idx)
        for idx, entry in enumerate(transcript_entries, start=1)
    ]

    return transcript_entries
