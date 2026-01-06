export const VoicePresets = {
  neutral: {
    pitch: 0,
    rate: 1.0,
    timbre: 0,
    baseEmotion: "neutral",
    emphasis: 0,
    description: "Even-tempered, professional demeanor with balanced, clear inflection."
  },
  warm: {
    pitch: -0.5,
    rate: 0.95,
    timbre: 0.1,
    baseEmotion: "warm",
    emphasis: 0.05,
    description: "Approachable empathy with soft transitions and a supportive presence."
  },
  confident: {
    pitch: 0.5,
    rate: 1.05,
    timbre: -0.05,
    baseEmotion: "confident",
    emphasis: 0.1,
    description: "Absolute authority with firm intonation and leadership-focused pacing."
  },
  storyteller: {
    pitch: -0.3,
    rate: 0.9,
    timbre: 0.05,
    baseEmotion: "storytelling",
    emphasis: 0.15,
    description: "Dramatic vocal range with significant pitch variance for narrative impact."
  },
  instructional: {
    pitch: 0,
    rate: 1.1,
    timbre: 0,
    baseEmotion: "instructional",
    emphasis: 0.05,
    description: "Crisp, clipped articulation optimized for pedagogical clarity."
  }
};
