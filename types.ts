
export enum VoicePreset {
  NEUTRAL = 'neutral',
  WARM = 'warm',
  CONFIDENT = 'confident',
  STORYTELLER = 'storyteller',
  INSTRUCTIONAL = 'instructional',
  FRIENDLY = 'friendly',
  EMPATHETIC = 'empathetic',
  EXCITED = 'excited',
  CURIOUS = 'curious'
}

export interface BrandVoiceProfile {
  tone: 'formal' | 'friendly' | 'authoritative';
  rate: number;
  pitch: number;
  timbre: number;
  emphasis: number;
  pause: number;
  breathiness: number;
  emotion?: string;
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
