---
name: booknotes-user
version: "2.0"
description: User prompt for continuing Booknotes conversation
---

{transcript_lead_in}

{transcript_context}

{{#if user_topic}}
A viewer has called in with this topic/question: "{user_topic}"

Continue the conversation with Brian Lamb introducing this topic using a phrase like "{transition_phrase}..." and then the guest responding. Generate 2-5 exchanges.
{{else}}
Continue the conversation naturally. Brian Lamb should ask a follow-up question or explore a new angle related to the book and discussion so far. Use a transition like "{transition_phrase}..." Generate 2-5 exchanges.
{{/if}}
