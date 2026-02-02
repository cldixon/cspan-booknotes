import { describe, test, expect } from 'bun:test';
import {
  loadTemplate,
  interpolate,
  processConditionals,
  buildSystemPrompt,
  buildUserPrompt,
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

  test('includes formatted transcript context', () => {
    const result = buildUserPrompt(mockProgram, mockTranscript, null, 'Let me ask');

    expect(result).toContain('LAMB: Welcome to the show.');
    expect(result).toContain('GUEST: Thank you for having me.');
  });

  test('includes user topic when provided', () => {
    const result = buildUserPrompt(mockProgram, mockTranscript, 'What about AI?', 'A caller asks');

    expect(result).toContain('What about AI?');
    expect(result).toContain('A caller asks');
  });

  test('uses continuation text when no topic', () => {
    const result = buildUserPrompt(mockProgram, mockTranscript, null, 'Let me follow up');

    expect(result).toContain('Continue the conversation naturally');
    expect(result).toContain('Let me follow up');
    expect(result).not.toContain('viewer has called in');
  });
});
