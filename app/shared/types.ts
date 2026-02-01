// Shared types between frontend and backend

export interface Show {
  id: string;
  title: string;
  guest: string;
  book: string;
  airDate: string;
  transcript: string;
}

export interface ConversationMessage {
  speaker: 'Brian Lamb' | string; // Guest name
  text: string;
  timestamp?: string;
  isGenerated?: boolean; // True if AI-generated
}

export interface ResumeRequest {
  showId: string;
  userPrompt?: string;
}

export interface ResumeResponse {
  messages: ConversationMessage[];
}
