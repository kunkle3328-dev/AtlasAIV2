export const VoiceArchetypes = {
  narrator: {
    pitch: -0.1,
    rate: 0.92,
    emphasis: 0.85,
    pause: 420,
    timbre: 0.1,
    variability: 0.25,
    label: "Professional Narrator"
  },
  educator: {
    pitch: 0.05,
    rate: 0.88,
    emphasis: 0.9,
    pause: 480,
    timbre: 0,
    variability: 0.2,
    label: "Academic Educator"
  },
  conversational: {
    pitch: 0.15,
    rate: 1.0,
    emphasis: 0.75,
    pause: 280,
    timbre: 0.05,
    variability: 0.4,
    label: "Natural Dialogue"
  },
  storyteller: {
    pitch: 0.1,
    rate: 0.9,
    emphasis: 1.1,
    pause: 520,
    timbre: 0.15,
    variability: 0.6,
    label: "Dynamic Storyteller"
  },
  executive: {
    pitch: -0.15,
    rate: 0.85,
    emphasis: 0.7,
    pause: 600,
    timbre: -0.05,
    variability: 0.15,
    label: "Executive Authority"
  }
};

export type ArchetypeKey = keyof typeof VoiceArchetypes;