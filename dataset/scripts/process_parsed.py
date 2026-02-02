"""
This script flattens the collected and parsed programs data
(stored in individual JSON files via `scripts/parse_programs.py`).
The result is multiple parquet files, including program metadata,
transcript entries, and related programs.
"""

import json
import logging
import os
from datetime import datetime
from typing import Literal, TypedDict

import polars as pl
import ray
from obstore.store import LocalStore
from tqdm import tqdm

from cspan_booknotes.models.program import Program

ray.init(log_to_driver=False, logging_level=logging.CRITICAL)


## -- LOCAL INPUT DIRECTORY CONTAINING PARSED JSON FILES (OUTPUT OF scripts/parse_programs.py)
PARSED_DIR = "data/programs"

## -- MAX NUMBER OF CONCURRENT TASKS FOR FLATTENING JOB
MAX_CONCURRENT: int = 10

## -- LOCAL OUTPUT DIRECTORY FOR FLATTENED DATA
PROCESSED_DIR = "data/processed"
os.makedirs(PROCESSED_DIR, exist_ok=True)

## -- NUMBER OF CONCURRENT STORES FOR READING JSON FILES
NUM_STORES: int = 4

TEST_MODE: bool = False


def read_program(filepath: str) -> Program:
    with open(filepath, "r") as f:
        data = json.load(f)
    return Program(**data)


## --------------------------------------------------------- ##
## ---- DEFINE ROW-LEVEL SCHEMA FOR FINAL FLAT DATASETS ---- ##
## --------------------------------------------------------- ##


class ProgramRow(TypedDict):
    program_id: str
    guest: str
    title: str
    air_date: datetime
    description: str | None
    book_isbn: str | None
    url: str


class TranscriptEntryRow(TypedDict):
    program_id: str
    sequence: int
    speaker_role: Literal["host", "guest"]
    speaker_name: str
    text: str


class RelatedItemRow(TypedDict):
    program_id: str
    related_id: str
    guest: str
    title: str
    url: str


## -- below uses local store but could be S3Store in a production case...
@ray.remote
class LocalStoreManager:
    def __init__(self, path: str):
        self.store = LocalStore(path)

    def read_json(self, file_path: str) -> dict:
        data = self.store.get(str(file_path)).bytes().to_bytes()
        return json.loads(data)


def load_local_stores(path: str, num_stores: int) -> list:
    return [LocalStoreManager.remote(path) for _ in range(num_stores)]


@ray.remote
def flatten_program_from_file(
    store_manager,
    filepath: str,
) -> tuple[ProgramRow, list[TranscriptEntryRow], list[RelatedItemRow]]:
    ## -- read json file containing parsed program data
    data = ray.get(store_manager.read_json.remote(str(filepath)))

    ## -- re-validate program data
    program = Program.model_validate(data)

    ## -- convert air date from string to datetime
    air_datetime = datetime.strptime(program.air_date, "%B %d, %Y")

    ## -- create program row (single dictionary)
    program_row = ProgramRow(
        program_id=program.id,
        title=program.title,
        air_date=air_datetime,
        book_isbn=program.book_isbn,
        description=program.description,
        guest=program.guest,
        url=program.url,
    )

    ## -- create array of transcript entry rows
    transcript_entry_rows = [
        TranscriptEntryRow(
            program_id=program.id,
            sequence=i,
            speaker_role=entry.speaker_role,
            speaker_name=entry.speaker_name,
            text=entry.text,
        )
        for i, entry in enumerate(program.transcript)
    ]

    ## -- create array of related item rows (these are provided on program webpage)
    related_item_rows = [
        RelatedItemRow(
            program_id=program.id,
            related_id=item.id,
            url=item.url,
            guest=item.author,  # <- couldn't decide on standard name for this field :)
            title=item.title,
        )
        for item in program.related
    ]

    return program_row, transcript_entry_rows, related_item_rows


def main():
    ## ---- STAGE 1: INITIALIZE OBJECT STORES AND LIST OF PARSED JSON FILES
    ## --------------------------------------------------------------------

    ## -- !! NOTE: absolute path is necessary since ray tasks run elsewhere on machine...
    stores = load_local_stores(os.path.abspath(PARSED_DIR), NUM_STORES)

    ## -- list contents of parsed directory
    parsed_program_files = os.listdir(PARSED_DIR)

    print(f"> Processing {len(parsed_program_files)} files from '{PARSED_DIR}'")

    if TEST_MODE:
        parsed_program_files = parsed_program_files[:10]
        print(
            f"> !! Running in test mode. Processing first {len(parsed_program_files)} files."
        )

    ## ---- STAGE 2: PARSE PROGRAM JSON FILES IN PARALLEL
    ## --------------------------------------------------

    all_program_results = []
    futures = [
        flatten_program_from_file.remote(stores[i % NUM_STORES], filepath)
        for i, filepath in enumerate(parsed_program_files)
    ]

    progress_bar = tqdm(
        total=len(parsed_program_files), desc="Processing parsed programs..."
    )

    while futures:
        ## -- wait for first task to complete
        ready, futures = ray.wait(futures, num_returns=1)

        # -- get results from completed tasks
        for future in ready:
            result = ray.get(future)
            all_program_results.append(result)
            progress_bar.update(1)
            progress_bar.set_postfix(completed=len(all_program_results))

    progress_bar.close()
    ray.shutdown()

    ## ---- STAGE 3: UNPACK RESULTS AND CONVERT TO DATAFRAMES
    ## ------------------------------------------------------

    program_rows: list[ProgramRow] = []
    transcript_rows: list[TranscriptEntryRow] = []
    related_item_rows: list[RelatedItemRow] = []

    for program, transcript_entries, related_items in all_program_results:
        program_rows.append(program)
        transcript_rows.extend(transcript_entries)
        related_item_rows.extend(related_items)

    ## ---- DF-1. programs
    programs_df = pl.DataFrame(program_rows).select(
        "program_id", "guest", "title", "description", "air_date", "book_isbn", "url"
    )
    print(f"> Created programs dataset with {len(program_rows):,} rows")

    ## ---- DF-2. transcripts
    transcripts_df = pl.DataFrame(transcript_rows).select(
        "program_id", "sequence", "speaker_role", "speaker_name", "text"
    )
    print(f"> Created transcripts dataset with {len(transcript_rows):,} rows")

    ## ---- DF-3. related items
    related_items_df = pl.DataFrame(related_item_rows).select(
        "program_id", "related_id", "guest", "title", "url"
    )
    print(f"> Created related items dataset with {len(related_item_rows):,} rows")

    ## -- write parquet files
    programs_df.write_parquet(os.path.join(PROCESSED_DIR, "programs.parquet"))
    transcripts_df.write_parquet(os.path.join(PROCESSED_DIR, "transcripts.parquet"))
    related_items_df.write_parquet(os.path.join(PROCESSED_DIR, "related_items.parquet"))

    return


if __name__ == "__main__":
    main()
