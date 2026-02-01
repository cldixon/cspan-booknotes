import os
from io import BytesIO

import yaml
from dotenv import load_dotenv
from huggingface_hub import HfApi

PROCESSED_DIR: str = "data/processed"

REPO_ID: str = "cldixon/cspan-booknotes"

REPO_TYPE: str = "dataset"

load_dotenv()

## -- DATASET CARD CONFIGURATION
HF_README_TEMPLATE = """
---
{yaml_config}
---

{readme_content}
"""


def load_config():
    with open("hf_repo.yaml", "r") as infile:
        config = yaml.safe_load(infile)
    return config


def main():
    api = HfApi(token=os.getenv("HF_TOKEN"))

    ## -- updload readme

    with open("hf_repo.yaml", "r") as infile:
        yaml_config = infile.read()

    with open("README.md", "r") as infile:
        readme_content = infile.read()

    readme_with_config = HF_README_TEMPLATE.format(
        yaml_config=yaml_config, readme_content=readme_content
    )

    api.upload_file(
        path_or_fileobj=BytesIO(readme_with_config.encode()),
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
