export const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

export const VoicePresets = {
  neutral: { 
    pitch: 0, 
    rate: 1.0, 
    timbre: 0, 
    baseEmotion: "neutral", 
    emphasis: 0, 
    breathiness: 0, 
    pause: 0,
    description: "Even-tempered, professional demeanor with balanced, clear inflection."
  },
  warm: { 
    pitch: -0.5, 
    rate: 0.95, 
    timbre: 0.1, 
    baseEmotion: "warm", 
    emphasis: 0.05, 
    breathiness: 0.05, 
    pause: 50,
    description: "Approachable empathy with soft transitions and a supportive presence."
  },
  confident: { 
    pitch: 0.5, 
    rate: 1.05, 
    timbre: -0.05, 
    baseEmotion: "confident", 
    emphasis: 0.1, 
    breathiness: 0, 
    pause: 30,
    description: "Absolute authority with firm intonation and leadership-focused pacing."
  },
  storyteller: { 
    pitch: -0.3, 
    rate: 0.9, 
    timbre: 0.05, 
    baseEmotion: "storytelling", 
    emphasis: 0.15, 
    breathiness: 0.1, 
    pause: 100,
    description: "Dramatic vocal range with significant pitch variance for narrative impact."
  },
  instructional: { 
    pitch: 0, 
    rate: 1.1, 
    timbre: 0, 
    baseEmotion: "instructional", 
    emphasis: 0.05, 
    breathiness: 0, 
    pause: 20,
    description: "Crisp, clipped articulation optimized for pedagogical clarity."
  },
  friendly: { 
    pitch: 0.2, 
    rate: 1.0, 
    timbre: 0.05, 
    baseEmotion: "friendly", 
    emphasis: 0.05, 
    breathiness: 0.05, 
    pause: 40,
    description: "Cheerful and engaging tone with bright, welcoming energy."
  },
  empathetic: { 
    pitch: -0.2, 
    rate: 0.95, 
    timbre: 0, 
    baseEmotion: "empathetic", 
    emphasis: 0.05, 
    breathiness: 0.1, 
    pause: 60,
    description: "Compassionate and soft-spoken, focusing on understanding and care."
  },
  excited: { 
    pitch: 0.5, 
    rate: 1.1, 
    timbre: 0.05, 
    baseEmotion: "excited", 
    emphasis: 0.15, 
    breathiness: 0.05, 
    pause: 30,
    description: "High-energy, fast-paced delivery with vibrant emotional peaks."
  },
  curious: { 
    pitch: 0.3, 
    rate: 1.0, 
    timbre: 0.05, 
    baseEmotion: "curious", 
    emphasis: 0.05, 
    breathiness: 0.05, 
    pause: 40,
    description: "Inquisitive and light tone, characterized by rising inflections."
  },
};