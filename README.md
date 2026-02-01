# CSPAN Booknotes - Chat Dataset

This project develops a unique dataset from the public archives of the wonderful CSPAN program [Booknotes](https://booknotes.c-span.org). The dataset includes transcripts of the conversations between the show's host, [Brian Lamb](https://en.wikipedia.org/wiki/Brian_Lamb), and his more than 800 guests.

## Datasets

There are (3) datasets available:

1. `programs`: Information for ~809 episodes, including title, description and guest information.
2. `transcripts`: Full conversation transcripts (~200 turns/conversation) between Brian Lamb and his guests.
3. `related_items`: Related or recommended programs (~5) for each episode.

The `transcripts` dataset is the key dataset here, with the other 2 providing additional context and information about each episode. Using the `sequence`, `speaker_role`, and `text` fields, we can create a chat-like dataset (representing very interesting conversations!) for evaluating language models.

## Source JSON Schema

To understand how the 3 tables work together, we provide the source JSON schema for each program. This data is extracted by crawling each episode's page on the CSPAN website.

```json
{
  "id": "51559-1",
  "url": "https://booknotes.c-span.org/Watch/51559-1",
  "title": "For the Sake of Argument",
  "guest": "Christopher Hitchens",
  "description": "Mr. Hitchens discussed the recent publication of his book, For the Sake of Argument, which is a compendium of articles that he has written. He stated that the purpose of this book was a reply to the widespread notion that society no longer needs critique from the left. He hopes to restore the left as a \"very necessary part of the political argument.\" Articles included in the book were published in various periodicals.",
  "book_isbn": "0860914356",
  "air_date": "October 17, 1993",
  "transcript": [
    {
      "sequence": 0,
      "speaker_role": "host",
      "speaker_name": "BRIAN LAMB, HOST:",
      "text": "Christopher Hitchens, author of For the Sake of Argument, you've got a section in there called \"Rogues' Gallery.\" Was that your idea?"
    },
    {
      "sequence": 1,
      "speaker_role": "guest",
      "speaker_name": "CHRISTOPHER HITCHENS:",
      "text": "Yes."
    },
    {
      "sequence": 2,
      "speaker_role": "host",
      "speaker_name": "LAMB:",
      "text": "Why create a Rogues Gallery?"
    },
    {
      "sequence": 3,
      "speaker_role": "guest",
      "speaker_name": "HITCHENS:",
      "text": "For a lot of people, their first love is what they'll always remember. For me it's always been the first hate, and I think that hatred, though it provides often rather junky energy, is a terrific way of getting you out of bed in the morning and keeping you going. If you don't let it get out of hand, it can be canalized into writing. In this country where people love to be nonjudgmental when they can be, which translates as, on the whole, lenient, there are an awful lot of bubble reputations floating around that one wouldn't be doing one's job if one didn't itch to prick."
    },
    ...
  ],
  "related": [
    {
      "id": "55567-1",
      "url": "https://booknotes.c-span.org/Watch/55567-1",
      "author": "John Corry",
      "title": "My Times:  Adventures in the News Trade"
    },
    ...
  ]
}
```
# CSPAN Booknotes Resume
