import { ConfidenceLevel } from '../types';

export interface ConfidenceFactors {
  landmarkConfidence: number; // 0.0 to 1.0 (MediaPipe tracking presence/quality)
  classifierConfidence: number; // 0.0 to 1.0 (distance from decision boundary / softmax probability)
  temporalConsistency: number; // 0.0 to 1.0 (ratio of matching frames in rolling window)
  poseStability: number; // 0.0 to 1.0 (inverse of motion velocity)
  imageQuality: number; // 0.0 to 1.0 (lighting and scale adequacy)
  modelMargin?: number; // 0.0 to 1.0 (difference between top 1 and top 2 candidates)
}

export interface CalculatedConfidence {
  score: number; // 0 to 100
  level: ConfidenceLevel;
  feedbackMessage: string;
  breakdown: ConfidenceFactors;
}

export class ConfidenceCalculator {
  /**
   * Calibrates and computes the final trustworthy confidence score.
   * Combines classifier probability + temporal agreement + landmark quality + pose stability + image quality + model margin.
   * Does NOT inflate or fabricate values.
   */
  public calculate(factors: ConfidenceFactors, isSignRecognized: boolean): CalculatedConfidence {
    if (!isSignRecognized) {
      return {
        score: Math.round(factors.classifierConfidence * 25),
        level: 'LOW',
        feedbackMessage: 'Low confidence — sign not recognized or ambiguous.',
        breakdown: factors,
      };
    }

    const margin = factors.modelMargin ?? 0.15;

    // Weight allocation:
    // Classifier probability: 35%
    // Temporal agreement: 25%
    // Landmark tracking quality: 15%
    // Pose stability: 10%
    // Image lighting/scale quality: 10%
    // Model candidate margin: 5%
    let weightedSum =
      factors.classifierConfidence * 0.35 +
      factors.temporalConsistency * 0.25 +
      factors.landmarkConfidence * 0.15 +
      factors.poseStability * 0.10 +
      factors.imageQuality * 0.10 +
      Math.min(1.0, margin * 4) * 0.05;

    // Crucial rule: If model margin is narrow (< 0.08) or temporal agreement < 0.5, cap confidence strictly
    if (margin < 0.08) {
      weightedSum = Math.min(weightedSum, 0.60);
    }
    if (factors.temporalConsistency < 0.5) {
      weightedSum = Math.min(weightedSum, 0.68);
    }

    // Scale to 0-100 and clamp strictly
    const rawScore = Math.round(weightedSum * 100);
    const score = Math.max(0, Math.min(100, rawScore));

    let level: ConfidenceLevel = 'LOW';
    let feedbackMessage = '';

    if (score >= 88) {
      level = 'VERY_HIGH';
      feedbackMessage = 'Very high confidence — verified stable posture.';
    } else if (score >= 75) {
      level = 'HIGH';
      feedbackMessage = 'High confidence — clear hand posture.';
    } else if (score >= 60) {
      level = 'MEDIUM';
      feedbackMessage = 'Medium confidence — hold hand steady to confirm.';
    } else {
      level = 'LOW';
      feedbackMessage = 'Low confidence — hold the sign steady inside the guide box.';
    }

    return {
      score,
      level,
      feedbackMessage,
      breakdown: factors,
    };
  }
}

export const confidenceCalculator = new ConfidenceCalculator();
