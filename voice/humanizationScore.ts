import { HumanizationReport, BrandVoiceProfile } from '../types';

/**
 * Evaluates the human-likeness of a speech plan based on text complexity and acoustic profile.
 */
export class HumanizationScorer {
  public static score(text: string, profile: any): HumanizationReport {
    const metrics = {
      pitchVariance: this.evalPitchVariance(profile),
      pauseNaturalness: this.evalPauseNaturalness(text, profile),
      monotonyPenalty: this.evalMonotony(profile),
      emphasisBalance: this.evalEmphasis(profile)
    };

    // Weighted score calculation
    let rawScore = (
      metrics.pitchVariance * 0.3 +
      metrics.pauseNaturalness * 0.3 +
      (100 - metrics.monotonyPenalty) * 0.2 +
      metrics.emphasisBalance * 0.2
    );

    // Bounded normalization
    const finalScore = Math.min(100, Math.max(0, rawScore));

    return {
      score: Math.round(finalScore),
      metrics,
      adjustmentsApplied: []
    };
  }

  private static evalPitchVariance(profile: any): number {
    const variance = (profile.prosodyVariance || 0.2) + (profile.variability || 0.2);
    // Real human speech rarely stays perfectly steady. 
    // Ideal variance is around 0.5-0.7 for standard conversation.
    return Math.min(100, (variance / 0.8) * 100);
  }

  private static evalPauseNaturalness(text: string, profile: any): number {
    const words = text.split(/\s+/).length;
    const pauseBase = profile.pause || 0;
    // Longer text requires more significant breathing/pauses.
    const expectation = words > 15 ? 400 : 200;
    const ratio = pauseBase / expectation;
    return Math.min(100, (1 - Math.abs(1 - ratio)) * 100);
  }

  private static evalMonotony(profile: any): number {
    // Monotony is high if prosodyVariance is very low.
    if ((profile.prosodyVariance || 0) < 0.1) return 80;
    if ((profile.prosodyVariance || 0) < 0.2) return 40;
    return 10;
  }

  private static evalEmphasis(profile: any): number {
    const emp = profile.emphasis || 0;
    // Over-emphasis (> 1.2) starts sounding theatrical.
    if (emp > 1.2) return 60; 
    // Ideal emphasis is 0.7 - 0.9.
    return Math.min(100, (emp / 0.9) * 100);
  }
}
