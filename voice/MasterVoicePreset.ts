import { MasterVoicePreset } from '../types';

export const MasterPresets: Record<string, MasterVoicePreset> = {
  calm_professional: {
    id: 'calm_professional',
    displayName: 'Calm Professional',
    description: 'Measured, deliberate, and authoritative. The gold-standard for premium narration.',
    prosodyMatrix: {
      pitch: 0,
      rate: 0.96,
      timbre: 0.05,
      emphasis: 0.8,
      breathiness: 0.04,
      vocalTension: 0,
      pause: 450
    },
    microProsodyBounds: {
      pitchDrift: 0.015,
      rateVariance: 0.04,
      variability: 0.2,
      prosodyVariance: 0.18
    },
    breathModel: {
      inhaleFrequency: 25,
      inhaleLengthMs: 180,
      microPauses: true
    },
    phraseEmphasisProfile: {
      emphasisWindow: 3,
      emphasisCurve: 'linear'
    },
    imperfectionProfile: {
      hesitationRate: 0.02,
      softFillers: false,
      restartChance: 0.01
    },
    intentPacingProfile: {
      instructionScale: 0.92,
      reassuranceScale: 1.05,
      storytellingScale: 1.05
    },
    safetyConstraints: {
      maxPitch: 0.7,
      maxRate: 1.4
    }
  },
  natural_conversational: {
    id: 'natural_conversational',
    displayName: 'Natural Conversational',
    description: 'Dynamic rhythm with human-like variation and expressive contouring.',
    prosodyMatrix: {
      pitch: 0.1,
      rate: 1.0,
      timbre: 0.08,
      emphasis: 0.7,
      breathiness: 0.1,
      vocalTension: -0.05,
      pause: 300
    },
    microProsodyBounds: {
      pitchDrift: 0.025,
      rateVariance: 0.06,
      variability: 0.45,
      prosodyVariance: 0.5
    },
    breathModel: {
      inhaleFrequency: 21,
      inhaleLengthMs: 140,
      microPauses: true
    },
    phraseEmphasisProfile: {
      emphasisWindow: 2,
      emphasisCurve: 'arc'
    },
    imperfectionProfile: {
      hesitationRate: 0.06,
      softFillers: true,
      restartChance: 0.04
    },
    intentPacingProfile: {
      instructionScale: 0.95,
      reassuranceScale: 1.1,
      storytellingScale: 1.2
    },
    safetyConstraints: {
      maxPitch: 0.9,
      maxRate: 1.8
    }
  },
  thoughtful_analyst: {
    id: 'thoughtful_analyst',
    displayName: 'Thoughtful Analyst',
    description: 'Analytical weight with precise clause-level pausing and steady delivery.',
    prosodyMatrix: {
      pitch: -0.05,
      rate: 0.9,
      timbre: -0.05,
      emphasis: 0.6,
      breathiness: 0.01,
      vocalTension: 0.12,
      pause: 550
    },
    microProsodyBounds: {
      pitchDrift: 0.01,
      rateVariance: 0.02,
      variability: 0.1,
      prosodyVariance: 0.08
    },
    breathModel: {
      inhaleFrequency: 35,
      inhaleLengthMs: 100,
      microPauses: false
    },
    phraseEmphasisProfile: {
      emphasisWindow: 2,
      emphasisCurve: 'linear'
    },
    imperfectionProfile: {
      hesitationRate: 0.01,
      softFillers: false,
      restartChance: 0.005
    },
    intentPacingProfile: {
      instructionScale: 1.0,
      reassuranceScale: 0.95,
      storytellingScale: 0.9
    },
    safetyConstraints: {
      maxPitch: 0.4,
      maxRate: 1.2
    }
  },
  warm_guide: {
    id: 'warm_guide',
    displayName: 'Warm Guide',
    description: 'Soft, approachable, and emotionally supportive presence.',
    prosodyMatrix: {
      pitch: 0.12,
      rate: 0.94,
      timbre: 0.15,
      emphasis: 0.75,
      breathiness: 0.15,
      vocalTension: -0.15,
      pause: 400
    },
    microProsodyBounds: {
      pitchDrift: 0.02,
      rateVariance: 0.04,
      variability: 0.35,
      prosodyVariance: 0.3
    },
    breathModel: {
      inhaleFrequency: 14,
      inhaleLengthMs: 180,
      microPauses: true
    },
    phraseEmphasisProfile: {
      emphasisWindow: 3,
      emphasisCurve: 'arc'
    },
    imperfectionProfile: {
      hesitationRate: 0.03,
      softFillers: false,
      restartChance: 0.02
    },
    intentPacingProfile: {
      instructionScale: 0.9,
      reassuranceScale: 1.25,
      storytellingScale: 1.15
    },
    safetyConstraints: {
      maxPitch: 0.8,
      maxRate: 1.5
    }
  },
  safe_neutral: {
    id: 'safe_neutral',
    displayName: 'Safe Neutral',
    description: 'High-reliability synthesis fallback. No micro-variation or complex prosody.',
    prosodyMatrix: {
      pitch: 0,
      rate: 1.0,
      timbre: 0,
      emphasis: 0.1,
      breathiness: 0,
      vocalTension: 0,
      pause: 200
    },
    microProsodyBounds: {
      pitchDrift: 0,
      rateVariance: 0,
      variability: 0,
      prosodyVariance: 0
    },
    breathModel: {
      inhaleFrequency: 100,
      inhaleLengthMs: 0,
      microPauses: false
    },
    phraseEmphasisProfile: {
      emphasisWindow: 0,
      emphasisCurve: 'linear'
    },
    imperfectionProfile: {
      hesitationRate: 0,
      softFillers: false,
      restartChance: 0
    },
    intentPacingProfile: {
      instructionScale: 1,
      reassuranceScale: 1,
      storytellingScale: 1
    },
    safetyConstraints: {
      maxPitch: 1,
      maxRate: 2
    }
  }
};