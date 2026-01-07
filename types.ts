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

export interface ProsodyMatrix {
  pitch: number;
  rate: number;
  timbre: number;
  emphasis: number;
  breathiness: number;
  vocalTension: number;
  pause: number;
}

export interface MicroProsodyBounds {
  pitchDrift: number;
  rateVariance: number;
  variability: number;
  prosodyVariance: number;
}

export interface BreathModel {
  inhaleFrequency: number;
  inhaleLengthMs: number;
  microPauses: boolean;
}

export interface ImperfectionProfile {
  hesitationRate: number;
  softFillers: boolean;
  restartChance: number;
}

export interface IntentPacingProfile {
  instructionScale: number;
  reassuranceScale: number;
  storytellingScale: number;
}

export interface HumanizationReport {
  score: number;
  metrics: {
    pitchVariance: number;
    pauseNaturalness: number;
    monotonyPenalty: number;
    emphasisBalance: number;
  };
  adjustmentsApplied: string[];
}

export interface MasterVoicePreset {
  id: string;
  displayName: string;
  description: string;
  prosodyMatrix: ProsodyMatrix;
  microProsodyBounds: MicroProsodyBounds;
  breathModel: BreathModel;
  phraseEmphasisProfile: {
    emphasisWindow: number;
    emphasisCurve: 'linear' | 'arc' | 'decay';
  };
  imperfectionProfile: ImperfectionProfile;
  intentPacingProfile: IntentPacingProfile;
  safetyConstraints: {
    maxPitch: number;
    maxRate: number;
  };
}

export interface AdvancedVoiceConfig {
  humanizationLevel: number; // 0-1
  breathRealism: boolean;
  conversationalWarmth: number;
  stabilityVsExpressiveness: number;
}

export interface BrandVoiceProfile {
  tone: 'formal' | 'friendly' | 'authoritative';
  rate: number;
  pitch: number;
  timbre: number;
  emphasis: number;
  pause: number;
  breathiness: number;
  vocalTension?: number;
  prosodyVariance?: number;
  bargeInSensitivity?: number;
  variability?: number;
  archetype?: string;
  emotion?: string;
  masterPresetId?: string;
  __manualOverride?: boolean;
  advanced?: AdvancedVoiceConfig;
  lastReport?: HumanizationReport;
}

export type AudioEngineType = 'Gemini Live' | 'Studio Voice (Higgs)';

export interface AudioChunk {
  id: string;
  text: string;
  status: 'pending' | 'processing' | 'playing' | 'completed' | 'error';
  engine: AudioEngineType;
  profile?: BrandVoiceProfile;
}

export type SessionState = 
  | 'idle' 
  | 'listening' 
  | 'validating' 
  | 'committing' 
  | 'responding' 
  | 'playing' 
  | 'recovering' 
  | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  telemetry?: {
    latency?: number;
    duration?: number;
    confidence?: number;
    engine?: string;
  };
}