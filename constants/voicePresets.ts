
// Professional studio presets with integrated brand alignment
export const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

export const VoicePresets = {
  neutral: { 
    tone: 'formal' as const,
    pitch: 0, 
    rate: 1.0, 
    timbre: 0, 
    emotion: "neutral", 
    emphasis: 0, 
    breathiness: 0, 
    pause: 0,
    description: "Even-tempered, professional demeanor with balanced, clear inflection."
  },
  warm: { 
    tone: 'friendly' as const,
    pitch: -0.5, 
    rate: 0.95, 
    timbre: 0.1, 
    emotion: "warm", 
    emphasis: 0.05, 
    breathiness: 0.05, 
    pause: 50,
    description: "Approachable empathy with soft transitions and a supportive presence."
  },
  confident: { 
    tone: 'authoritative' as const,
    pitch: 0.5, 
    rate: 1.05, 
    timbre: -0.05, 
    emotion: "confident", 
    emphasis: 0.1, 
    breathiness: 0, 
    pause: 30,
    description: "Absolute authority with firm intonation and leadership-focused pacing."
  },
  storyteller: { 
    tone: 'friendly' as const,
    pitch: -0.3, 
    rate: 0.9, 
    timbre: 0.05, 
    emotion: "storytelling", 
    emphasis: 0.15, 
    breathiness: 0.1, 
    pause: 100,
    description: "Dramatic vocal range with significant pitch variance for narrative impact."
  },
  instructional: { 
    tone: 'authoritative' as const,
    pitch: 0, 
    rate: 1.1, 
    timbre: 0, 
    emotion: "instructional", 
    emphasis: 0.05, 
    breathiness: 0, 
    pause: 20,
    description: "Crisp, clipped articulation optimized for pedagogical clarity."
  },
  friendly: { 
    tone: 'friendly' as const,
    pitch: 0.2, 
    rate: 1.0, 
    timbre: 0.05, 
    emotion: "friendly", 
    emphasis: 0.05, 
    breathiness: 0.05, 
    pause: 40,
    description: "Cheerful and engaging tone with bright, welcoming energy."
  },
  empathetic: { 
    tone: 'friendly' as const,
    pitch: -0.2, 
    rate: 0.95, 
    timbre: 0, 
    emotion: "empathetic", 
    emphasis: 0.05, 
    breathiness: 0.1, 
    pause: 60,
    description: "Compassionate and soft-spoken, focusing on understanding and care."
  },
  excited: { 
    tone: 'friendly' as const,
    pitch: 0.5, 
    rate: 1.1, 
    timbre: 0.05, 
    emotion: "excited", 
    emphasis: 0.15, 
    breathiness: 0.05, 
    pause: 30,
    description: "High-energy, fast-paced delivery with vibrant emotional peaks."
  },
  curious: { 
    tone: 'friendly' as const,
    pitch: 0.3, 
    rate: 1.0, 
    timbre: 0.05, 
    emotion: "curious", 
    emphasis: 0.05, 
    breathiness: 0.05, 
    pause: 40,
    description: "Inquisitive and light tone, characterized by rising inflections."
  },
};
