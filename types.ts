
export enum VoicePreset {
  NEUTRAL = 'neutral',
  WARM = 'warm',
  CONFIDENT = 'confident',
  STORYTELLER = 'storyteller',
  INSTRUCTIONAL = 'instructional'
}

export interface BrandVoiceProfile {
  tone: 'formal' | 'friendly' | 'authoritative';
  pacing: 'measured' | 'fast';
  emphasisStyle: 'subtle' | 'assertive';
}

export type AudioEngineType = 'Gemini Live' | 'Studio Voice (Higgs)';

export interface AudioChunk {
  id: string;
  text: string;
  status: 'pending' | 'processing' | 'playing' | 'completed' | 'error';
  engine: AudioEngineType;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
