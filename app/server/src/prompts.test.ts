import { describe, test, expect, afterEach } from 'bun:test';
import {
  loadTemplate,
  interpolate,
  processConditionals,
  buildSystemPrompt,
  buildUserPrompt,
  getTranscriptStrategy,
  prepareTranscriptContext,
  formatTranscriptTurns,
} from './prompts';
import type { Program, TranscriptTurn } from './db';

describe('loadTemplate', () => {
  test('loads system template with frontmatter', () => {
    const template = loadTemplate('system');

    expect(template.frontmatter.name).toBe('booknotes-system');
    expect(template.frontmatter.version).toBe('1.0');
    expect(template.content).toContain('You are simulating');
    expect(template.content).toContain('{guest}');
  });

  test('loads user template with frontmatter', () => {
    const template = loadTemplate('user');

    expect(template.frontmatter.name).toBe('booknotes-user');
    expect(template.content).toContain('{transcript_lead_in}');
    expect(template.content).toContain('{transcript_context}');
    expect(template.content).toContain('{{#if user_topic}}');
  });

  test('caches templates on subsequent loads', () => {
    const first = loadTemplate('system');
    const second = loadTemplate('system');

    expect(first).toBe(second);
  });
});

describe('interpolate', () => {
  test('replaces single variable', () => {
    const result = interpolate('Hello {name}', { name: 'World' });
    expect(result).toBe('Hello World');
  });

  test('replaces multiple variables', () => {
    const result = interpolate('{greeting} {name}!', { greeting: 'Hi', name: 'Alice' });
    expect(result).toBe('Hi Alice!');
  });

  test('leaves unmatched placeholders unchanged', () => {
    const result = interpolate('Hello {name}, your {missing} is here', { name: 'Bob' });
    expect(result).toBe('Hello Bob, your {missing} is here');
  });

  test('handles empty string values', () => {
    const result = interpolate('Value: {val}', { val: '' });
    expect(result).toBe('Value: ');
  });
});

describe('processConditionals', () => {
  const template = '{{#if topic}}Has topic: {topic}{{else}}No topic{{/if}}';

  test('uses if-block when variable is truthy', () => {
    const result = processConditionals(template, { topic: 'AI' });
    expect(result).toBe('Has topic: {topic}');
  });

  test('uses else-block when variable is null', () => {
    const result = processConditionals(template, { topic: null });
    expect(result).toBe('No topic');
  });

  test('uses else-block when variable is empty string', () => {
    const result = processConditionals(template, { topic: '' });
    expect(result).toBe('No topic');
  });

  test('handles multiple conditionals', () => {
    const multi = '{{#if a}}A{{else}}no-A{{/if}} and {{#if b}}B{{else}}no-B{{/if}}';
    const result = processConditionals(multi, { a: 'yes', b: null });
    expect(result).toBe('A and no-B');
  });
});

describe('buildSystemPrompt', () => {
  const mockProgram: Program = {
    id: 'test-1',
    title: 'Episode Title',
    guest: 'Jane Doe',
    air_date: '1998-03-15',
    summary: 'A fascinating discussion',
    book_title: 'The Test Book',
    book_isbn: null,
    url: null,
    transcript: [],
    related_episodes: [],
    created_at: '',
    updated_at: '',
  };

  test('interpolates guest name', () => {
    const result = buildSystemPrompt(mockProgram);
    expect(result).toContain('Jane Doe');
  });

  test('interpolates book title', () => {
    const result = buildSystemPrompt(mockProgram);
    expect(result).toContain('The Test Book');
  });

  test('formats air date', () => {
    const result = buildSystemPrompt(mockProgram);
    expect(result).toContain('March');
    expect(result).toContain('1998');
  });

  test('uses episode title as fallback when book_title is null', () => {
    const programWithoutBook = { ...mockProgram, book_title: null };
    const result = buildSystemPrompt(programWithoutBook);
    expect(result).toContain('Episode Title');
  });

  test('handles missing air_date', () => {
    const programWithoutDate = { ...mockProgram, air_date: null };
    const result = buildSystemPrompt(programWithoutDate);
    expect(result).toContain('Unknown');
  });
});

describe('buildUserPrompt', () => {
  const mockProgram: Program = {
    id: 'test-1',
    title: 'Episode Title',
    guest: 'Jane Doe',
    air_date: '1998-03-15',
    summary: 'A fascinating discussion',
    book_title: 'The Test Book',
    book_isbn: null,
    url: null,
    transcript: [],
    related_episodes: [],
    created_at: '',
    updated_at: '',
  };

  const mockTranscript: TranscriptTurn[] = [
    { speaker: 'LAMB:', text: 'Welcome to the show.' },
    { speaker: 'DOE:', text: 'Thank you for having me.' },
  ];

  const defaultOptions = { leadIn: 'Below are the most recent exchanges from the interview:' };

  test('includes lead-in text and formatted transcript context', () => {
    const result = buildUserPrompt(mockProgram, mockTranscript, null, 'Let me ask', defaultOptions);

    expect(result).toContain('Below are the most recent exchanges from the interview:');
    expect(result).toContain('LAMB: Welcome to the show.');
    expect(result).toContain('GUEST: Thank you for having me.');
  });

  test('includes user topic when provided', () => {
    const result = buildUserPrompt(mockProgram, mockTranscript, 'What about AI?', 'A caller asks', defaultOptions);

    expect(result).toContain('What about AI?');
    expect(result).toContain('A caller asks');
  });

  test('uses continuation text when no topic', () => {
    const result = buildUserPrompt(mockProgram, mockTranscript, null, 'Let me follow up', defaultOptions);

    expect(result).toContain('Continue the conversation naturally');
    expect(result).toContain('Let me follow up');
    expect(result).not.toContain('viewer has called in');
  });
});

describe('getTranscriptStrategy', () => {
  const originalEnv = process.env.TRANSCRIPT_STRATEGY;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.TRANSCRIPT_STRATEGY;
    } else {
      process.env.TRANSCRIPT_STRATEGY = originalEnv;
    }
  });

  test('defaults to abridged when env var is not set', () => {
    delete process.env.TRANSCRIPT_STRATEGY;
    expect(getTranscriptStrategy()).toBe('abridged');
  });

  test('returns valid strategy from env var', () => {
    process.env.TRANSCRIPT_STRATEGY = 'recent';
    expect(getTranscriptStrategy()).toBe('recent');

    process.env.TRANSCRIPT_STRATEGY = 'complete';
    expect(getTranscriptStrategy()).toBe('complete');
  });

  test('falls back to abridged for invalid env var', () => {
    process.env.TRANSCRIPT_STRATEGY = 'invalid';
    expect(getTranscriptStrategy()).toBe('abridged');
  });
});

describe('prepareTranscriptContext', () => {
  function makeMockTranscript(n: number): TranscriptTurn[] {
    return Array.from({ length: n }, (_, i) => ({
      speaker: i % 2 === 0 ? 'LAMB:' : 'GUEST:',
      text: `Turn ${i + 1}`,
    }));
  }

  test('recent strategy returns last 25 turns', () => {
    const transcript = makeMockTranscript(100);
    const result = prepareTranscriptContext(transcript, 'recent');

    expect(result.turns).toHaveLength(25);
    expect(result.turns[0].text).toBe('Turn 76');
    expect(result.turns[24].text).toBe('Turn 100');
    expect(result.leadIn).toContain('most recent');
    expect(result.separatorAfterIndex).toBeUndefined();
  });

  test('complete strategy returns all turns', () => {
    const transcript = makeMockTranscript(100);
    const result = prepareTranscriptContext(transcript, 'complete');

    expect(result.turns).toHaveLength(100);
    expect(result.turns[0].text).toBe('Turn 1');
    expect(result.leadIn).toContain('complete');
    expect(result.separatorAfterIndex).toBeUndefined();
  });

  test('abridged strategy returns first and last turns with separator index', () => {
    const transcript = makeMockTranscript(100);
    const result = prepareTranscriptContext(transcript, 'abridged');

    expect(result.turns).toHaveLength(40);
    expect(result.turns[0].text).toBe('Turn 1');
    expect(result.turns[19].text).toBe('Turn 20');
    expect(result.turns[20].text).toBe('Turn 81');
    expect(result.turns[39].text).toBe('Turn 100');
    expect(result.leadIn).toContain('beginning and end');
    expect(result.separatorAfterIndex).toBe(19);
  });

  test('abridged falls back to complete when transcript is short', () => {
    const transcript = makeMockTranscript(30);
    const result = prepareTranscriptContext(transcript, 'abridged');

    expect(result.turns).toHaveLength(30);
    expect(result.leadIn).toContain('complete');
    expect(result.separatorAfterIndex).toBeUndefined();
  });

  test('recent strategy with short transcript returns all turns', () => {
    const transcript = makeMockTranscript(10);
    const result = prepareTranscriptContext(transcript, 'recent');

    expect(result.turns).toHaveLength(10);
  });
});

describe('formatTranscriptTurns', () => {
  const turns: TranscriptTurn[] = [
    { speaker: 'LAMB:', text: 'Question one.' },
    { speaker: 'DOE:', text: 'Answer one.' },
    { speaker: 'LAMB:', text: 'Question two.' },
    { speaker: 'DOE:', text: 'Answer two.' },
  ];

  test('formats turns as LAMB/GUEST lines', () => {
    const result = formatTranscriptTurns(turns);
    expect(result).toContain('LAMB: Question one.');
    expect(result).toContain('GUEST: Answer one.');
  });

  test('inserts separator after specified index', () => {
    const result = formatTranscriptTurns(turns, { abridgedSeparatorAfter: 1 });
    expect(result).toContain('GUEST: Answer one.');
    expect(result).toContain('[... middle portion of interview omitted ...]');
    expect(result).toContain('LAMB: Question two.');
  });

  test('does not insert separator when index is undefined', () => {
    const result = formatTranscriptTurns(turns);
    expect(result).not.toContain('[... middle portion');
  });
});
