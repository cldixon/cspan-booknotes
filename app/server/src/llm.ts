import Anthropic from '@anthropic-ai/sdk';
import type { TranscriptTurn, Program } from './db';
import { buildSystemPrompt, buildUserPrompt, prepareTranscriptContext } from './prompts';

const anthropic = new Anthropic();

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-6';

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
  const { turns: contextTranscript, leadIn, separatorAfterIndex } = prepareTranscriptContext(program.transcript);

  const transitionPhrase = userTopic
    ? getRandomPhrase(RESUME_WITH_TOPIC_PHRASES)
    : getRandomPhrase(RESUME_CONTINUE_PHRASES);

  const systemPrompt = buildSystemPrompt(program);
  const userPrompt = buildUserPrompt(program, contextTranscript, userTopic, transitionPhrase, {
    leadIn,
    separatorAfterIndex,
  });

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
  const { turns: contextTranscript, leadIn, separatorAfterIndex } = prepareTranscriptContext(program.transcript);

  const transitionPhrase = userTopic
    ? getRandomPhrase(RESUME_WITH_TOPIC_PHRASES)
    : getRandomPhrase(RESUME_CONTINUE_PHRASES);

  const systemPrompt = buildSystemPrompt(program);
  const userPrompt = buildUserPrompt(program, contextTranscript, userTopic, transitionPhrase, {
    leadIn,
    separatorAfterIndex,
  });

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
