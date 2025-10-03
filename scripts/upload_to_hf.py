import os

from dotenv import load_dotenv
from huggingface_hub import HfApi

PROCESSED_DIR: str = "data/processed"

REPO_ID: str = "cldixon/cspan-booknotes"

REPO_TYPE: str = "dataset"

load_dotenv()


def main():
    api = HfApi(token=os.getenv("HF_TOKEN"))

    ## -- updload readme
    api.upload_file(
        path_or_fileobj="HF_README.md",
        path_in_repo="README.md",
        repo_id=REPO_ID,
        repo_type=REPO_TYPE,
    )

    api.upload_folder(
        folder_path=PROCESSED_DIR,
        repo_id=REPO_ID,
        repo_type=REPO_TYPE,
    )

    return


if __name__ == "__main__":
    main()
