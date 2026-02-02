import Anthropic from '@anthropic-ai/sdk';
import type { TranscriptTurn, Program } from './db';

const anthropic = new Anthropic();

const MODEL = 'claude-3-haiku-20240307';

// Number of recent turns to include for context (to manage token usage)
const CONTEXT_TURNS = 20;

// Transition phrases for when Lamb "resumes" the conversation
const RESUME_WITH_TOPIC_PHRASES = [
  "We're back. A caller has a question",
  "I understand we have a caller on the line",
  "Let me bring in a question from one of our viewers",
  "A viewer has called in with a question",
  "We have a caller who wants to ask",
];

const RESUME_CONTINUE_PHRASES = [
  "Before we wrap up, I wanted to ask",
  "There's something else I'm curious about",
  "Let me follow up on that",
  "I want to dig deeper into something you said",
  "Going back to what you mentioned earlier",
];

function getRandomPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function buildSystemPrompt(program: Program): string {
  return `You are simulating a continuation of a conversation from the C-SPAN show "Booknotes" hosted by Brian Lamb. The show aired from 1989-2004 and featured hour-long interviews with authors about their books.

EPISODE CONTEXT:
- Guest: ${program.guest}
- Book: ${program.book_title || program.title}
- Original Air Date: ${program.air_date ? new Date(program.air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
- Summary: ${program.summary || 'No summary available'}

YOUR TASK:
Generate a natural continuation of this interview as if Brian Lamb and ${program.guest} have returned to continue their conversation. You must simulate BOTH speakers.

CHARACTER GUIDELINES:

Brian Lamb (Host):
- Asks direct, probing questions without editorializing
- Known for his neutral, curious interviewing style
- Lets guests speak at length without interruption
- Often asks "why" and "how" questions
- Interested in the process of writing and research
- May reference specific passages or details from the book

${program.guest} (Guest):
- Should respond in character based on their background and the book's subject matter
- Should maintain consistency with views expressed in the original interview
- Can elaborate on themes from their book
- Should sound like an articulate author/expert in their field

FORMAT:
Output the conversation as alternating turns. Each turn should be on its own line in this exact format:
LAMB: [Brian Lamb's dialogue]
GUEST: [${program.guest}'s dialogue]

Generate 2-5 natural exchanges (4-10 turns total). End at a natural pause point in the conversation.

IMPORTANT:
- Stay in character throughout
- Make the dialogue feel authentic to the show's style
- The conversation should feel intellectually substantive
- Do not break character or add meta-commentary
- Do not use quotation marks around the dialogue`;
}

function buildUserPrompt(program: Program, recentTranscript: TranscriptTurn[], userTopic: string | null): string {
  // Format recent transcript for context
  const transcriptContext = recentTranscript
    .map(turn => {
      const isLamb = turn.speaker.toLowerCase().includes('lamb');
      const prefix = isLamb ? 'LAMB' : 'GUEST';
      return `${prefix}: ${turn.text}`;
    })
    .join('\n\n');

  let prompt = `Here is the recent conversation for context:\n\n${transcriptContext}\n\n`;

  if (userTopic) {
    const transitionPhrase = getRandomPhrase(RESUME_WITH_TOPIC_PHRASES);
    prompt += `A viewer has called in with this topic/question: "${userTopic}"\n\n`;
    prompt += `Continue the conversation with Brian Lamb introducing this topic using a phrase like "${transitionPhrase}..." and then the guest responding. Generate 2-5 exchanges.`;
  } else {
    const transitionPhrase = getRandomPhrase(RESUME_CONTINUE_PHRASES);
    prompt += `Continue the conversation naturally. Brian Lamb should ask a follow-up question or explore a new angle related to the book and discussion so far. Use a transition like "${transitionPhrase}..." Generate 2-5 exchanges.`;
  }

  return prompt;
}

function parseGeneratedTurns(text: string, guestName: string): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  const lines = text.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const lambMatch = line.match(/^LAMB:\s*(.+)$/i);
    const guestMatch = line.match(/^GUEST:\s*(.+)$/i);

    if (lambMatch) {
      turns.push({
        speaker: 'LAMB:',
        text: lambMatch[1].trim(),
        is_generated: true,
      });
    } else if (guestMatch) {
      // Use a shortened version of guest name for generated turns
      const shortGuestName = guestName.split(' ').pop() || guestName;
      turns.push({
        speaker: `${shortGuestName.toUpperCase()}:`,
        text: guestMatch[1].trim(),
        is_generated: true,
      });
    }
  }

  return turns;
}

export interface ResumeConversationResult {
  turns: TranscriptTurn[];
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export async function resumeConversation(
  program: Program,
  userTopic: string | null
): Promise<ResumeConversationResult> {
  // Get recent transcript for context
  const recentTranscript = program.transcript.slice(-CONTEXT_TURNS);

  const systemPrompt = buildSystemPrompt(program);
  const userPrompt = buildUserPrompt(program, recentTranscript, userTopic);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ],
  });

  const textContent = response.content.find(c => c.type === 'text');
  const generatedText = textContent?.text || '';

  const turns = parseGeneratedTurns(generatedText, program.guest);

  return {
    turns,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model: MODEL,
  };
}

export async function* resumeConversationStream(
  program: Program,
  userTopic: string | null
): AsyncGenerator<{ type: 'turn' | 'done'; turn?: TranscriptTurn; inputTokens?: number; outputTokens?: number; model?: string }> {
  // Get recent transcript for context
  const recentTranscript = program.transcript.slice(-CONTEXT_TURNS);

  const systemPrompt = buildSystemPrompt(program);
  const userPrompt = buildUserPrompt(program, recentTranscript, userTopic);

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ],
  });

  let buffer = '';
  let currentSpeaker: string | null = null;
  let currentText = '';
  const guestName = program.guest;
  const shortGuestName = guestName.split(' ').pop() || guestName;

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      buffer += event.delta.text;

      // Process complete lines from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const lambMatch = trimmedLine.match(/^LAMB:\s*(.+)$/i);
        const guestMatch = trimmedLine.match(/^GUEST:\s*(.+)$/i);

        if (lambMatch || guestMatch) {
          // If we have a previous turn, emit it
          if (currentSpeaker && currentText) {
            yield {
              type: 'turn',
              turn: {
                speaker: currentSpeaker,
                text: currentText.trim(),
                is_generated: true,
              }
            };
          }

          // Start new turn
          if (lambMatch) {
            currentSpeaker = 'LAMB:';
            currentText = lambMatch[1];
          } else if (guestMatch) {
            currentSpeaker = `${shortGuestName.toUpperCase()}:`;
            currentText = guestMatch[1];
          }
        } else if (currentSpeaker) {
          // Continuation of current turn
          currentText += ' ' + trimmedLine;
        }
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    const trimmedLine = buffer.trim();
    const lambMatch = trimmedLine.match(/^LAMB:\s*(.+)$/i);
    const guestMatch = trimmedLine.match(/^GUEST:\s*(.+)$/i);

    if (lambMatch || guestMatch) {
      // Emit previous turn if exists
      if (currentSpeaker && currentText) {
        yield {
          type: 'turn',
          turn: {
            speaker: currentSpeaker,
            text: currentText.trim(),
            is_generated: true,
          }
        };
      }

      // Emit this final turn
      if (lambMatch) {
        yield {
          type: 'turn',
          turn: {
            speaker: 'LAMB:',
            text: lambMatch[1].trim(),
            is_generated: true,
          }
        };
      } else if (guestMatch) {
        yield {
          type: 'turn',
          turn: {
            speaker: `${shortGuestName.toUpperCase()}:`,
            text: guestMatch[1].trim(),
            is_generated: true,
          }
        };
      }
    } else if (currentSpeaker) {
      currentText += ' ' + trimmedLine;
      yield {
        type: 'turn',
        turn: {
          speaker: currentSpeaker,
          text: currentText.trim(),
          is_generated: true,
        }
      };
    }
  } else if (currentSpeaker && currentText) {
    // Emit final turn
    yield {
      type: 'turn',
      turn: {
        speaker: currentSpeaker,
        text: currentText.trim(),
        is_generated: true,
      }
    };
  }

  // Get final message for token counts
  const finalMessage = await stream.finalMessage();

  yield {
    type: 'done',
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
    model: MODEL,
  };
}
