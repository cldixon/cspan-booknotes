import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { TranscriptTurn, Program } from './db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROMPTS_DIR = join(__dirname, '..', 'prompts');

export interface PromptTemplate {
  frontmatter: Record<string, string>;
  content: string;
}

// Cache for loaded templates
const templateCache: Map<string, PromptTemplate> = new Map();

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = raw.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content: raw };
  }

  const frontmatterStr = match[1];
  const content = match[2].trim();

  // Simple YAML parsing (key: value pairs)
  const frontmatter: Record<string, string> = {};
  for (const line of frontmatterStr.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content };
}

/**
 * Load a template from the prompts directory
 */
export function loadTemplate(name: string): PromptTemplate {
  const cached = templateCache.get(name);
  if (cached) {
    return cached;
  }

  const filePath = join(PROMPTS_DIR, `${name}.md`);
  const raw = readFileSync(filePath, 'utf-8');
  const template = parseFrontmatter(raw);

  templateCache.set(name, template);
  return template;
}

/**
 * Interpolate variables into a template string
 * Uses {variable} syntax for simple replacement
 */
export function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

/**
 * Process conditional blocks in a template
 * Supports {{#if var}}...{{else}}...{{/if}} syntax
 */
export function processConditionals(template: string, variables: Record<string, string | null>): string {
  const conditionalRegex = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;

  return template.replace(conditionalRegex, (match, varName, ifBlock, elseBlock) => {
    const value = variables[varName];
    // Truthy check: exists, not null, not empty string
    if (value !== null && value !== undefined && value !== '') {
      return ifBlock.trim();
    }
    return elseBlock.trim();
  });
}

/**
 * Build the system prompt from template
 */
export function buildSystemPrompt(program: Program): string {
  const template = loadTemplate('system');

  const variables: Record<string, string> = {
    guest: program.guest,
    book_title: program.book_title || program.title,
    air_date: program.air_date
      ? new Date(program.air_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Unknown',
    summary: program.summary || 'No summary available',
  };

  return interpolate(template.content, variables);
}

/**
 * Build the user prompt from template
 */
export function buildUserPrompt(
  program: Program,
  recentTranscript: TranscriptTurn[],
  userTopic: string | null,
  transitionPhrase: string
): string {
  const template = loadTemplate('user');

  // Format transcript context
  const transcriptContext = recentTranscript
    .map((turn) => {
      const isLamb = turn.speaker.toLowerCase().includes('lamb');
      const prefix = isLamb ? 'LAMB' : 'GUEST';
      return `${prefix}: ${turn.text}`;
    })
    .join('\n\n');

  // Process conditionals first
  const processed = processConditionals(template.content, { user_topic: userTopic });

  // Then interpolate variables
  const variables: Record<string, string> = {
    transcript_context: transcriptContext,
    user_topic: userTopic || '',
    transition_phrase: transitionPhrase,
  };

  return interpolate(processed, variables);
}
