import { ExtractedGestureFeatures, HandLandmarks, RawClassifierResult } from '../types';
import { SIGN_MEANINGS, STATIC_SIGNS } from './labels';
import { CandidatePrediction, ClassifierPrediction, ISignClassifier } from './classifierInterface';

export interface IClassifier {
  readonly modelName: string;
  readonly modelVersion: string;
  predictRaw(
    features: ExtractedGestureFeatures,
    primaryLandmarks: HandLandmarks,
    secondaryLandmarks?: HandLandmarks
  ): RawClassifierResult;
}

/**
 * Prototype Rule-Based & Geometric Classifier
 * Analyzes normalized finger extension states, joint fold ratios, and geometric alignments.
 */
export class PrototypeSignClassifier implements ISignClassifier, IClassifier {
  public readonly modelName = 'Prototype Geometric Classifier';
  public readonly modelVersion = '2.1.0-asl';
  public readonly isTrainedModel = false;

  public predictRaw(
    features: ExtractedGestureFeatures,
    primaryLandmarks: HandLandmarks,
    secondaryLandmarks?: HandLandmarks
  ): RawClassifierResult {
    const { fingersExtended, fingerFoldRatios, fingertipDistances, isTwoHanded } = features;

    const scores: Record<string, number> = {};
    STATIC_SIGNS.forEach((sign) => {
      scores[sign] = 0;
    });

    const extCount = [
      fingersExtended.thumb,
      fingersExtended.index,
      fingersExtended.middle,
      fingersExtended.ring,
      fingersExtended.pinky,
    ].filter(Boolean).length;

    // 1. "I LOVE YOU" (ASL): Thumb, Index, and Pinky extended; Middle and Ring curled
    if (
      fingersExtended.thumb &&
      fingersExtended.index &&
      !fingersExtended.middle &&
      !fingersExtended.ring &&
      fingersExtended.pinky
    ) {
      let score = 0.85;
      if (fingerFoldRatios.middle < 0.35 && fingerFoldRatios.ring < 0.35) score += 0.08;
      if (fingertipDistances.indexMiddle > 0.4) score += 0.04;
      scores['I LOVE YOU'] = Math.min(0.97, score);
    }

    // 2. "PEACE" (ASL / V-sign): Index and Middle extended spread apart; Thumb, Ring, Pinky curled
    if (
      fingersExtended.index &&
      fingersExtended.middle &&
      !fingersExtended.ring &&
      !fingersExtended.pinky
    ) {
      let score = 0.82;
      // Index and middle should have separation
      if (fingertipDistances.indexMiddle > 0.22) score += 0.08;
      if (!fingersExtended.thumb) score += 0.05;
      if (fingerFoldRatios.ring < 0.35 && fingerFoldRatios.pinky < 0.35) score += 0.04;
      scores['PEACE'] = Math.min(0.96, score);
    }

    // 3. "THUMBS UP" / "YES" (fist with thumb extended upward)
    if (
      fingersExtended.thumb &&
      !fingersExtended.index &&
      !fingersExtended.middle &&
      !fingersExtended.ring &&
      !fingersExtended.pinky
    ) {
      let score = 0.84;
      if (
        fingerFoldRatios.index < 0.35 &&
        fingerFoldRatios.middle < 0.35 &&
        fingerFoldRatios.ring < 0.35 &&
        fingerFoldRatios.pinky < 0.35
      ) {
        score += 0.08;
      }
      scores['THUMBS UP'] = Math.min(0.96, score);
      // In ASL, an S-hand nodded is YES; a thumbs up also maps to affirmative
      scores['YES'] = Math.min(0.85, score * 0.9);
    }

    // 4. "YES" (ASL S-Hand: all fingers folded into a fist)
    if (
      !fingersExtended.index &&
      !fingersExtended.middle &&
      !fingersExtended.ring &&
      !fingersExtended.pinky &&
      !fingersExtended.thumb
    ) {
      const avgFold =
        (fingerFoldRatios.index +
          fingerFoldRatios.middle +
          fingerFoldRatios.ring +
          fingerFoldRatios.pinky) /
        4;
      if (avgFold < 0.38) {
        scores['YES'] = 0.86;
        scores['SORRY'] = 0.72; // S-hand over chest is sorry
      }
    }

    // 5. "OK" (ASL): Thumb and Index fingertips touching (O-ring); Middle, Ring, Pinky extended
    if (fingertipDistances.thumbIndex < 0.28) {
      if (fingersExtended.middle && fingersExtended.ring) {
        let score = 0.84;
        if (fingersExtended.pinky) score += 0.08;
        if (fingertipDistances.thumbIndex < 0.18) score += 0.05;
        scores['OK'] = Math.min(0.96, score);
      }
    }

    // 6. "HELLO" (ASL B-Hand): All 4 or 5 fingers extended flat together
    if (
      fingersExtended.index &&
      fingersExtended.middle &&
      fingersExtended.ring &&
      fingersExtended.pinky
    ) {
      let score = 0.78;
      // Fingers held close together
      if (fingertipDistances.indexMiddle < 0.35 && fingertipDistances.middleRing < 0.35) {
        score += 0.08;
      }
      if (features.palmOrientation === 'facing_camera' || features.palmOrientation === 'side') {
        score += 0.06;
      }
      scores['HELLO'] = Math.min(0.94, score);
      scores['THANK YOU'] = Math.min(0.82, score * 0.88);
      scores['PLEASE'] = Math.min(0.78, score * 0.84);
      scores['GOOD'] = Math.min(0.76, score * 0.82);
    }

    // 7. "WATER" (ASL W-Hand): Index, Middle, Ring upright; Pinky and Thumb folded/held
    if (
      fingersExtended.index &&
      fingersExtended.middle &&
      fingersExtended.ring &&
      !fingersExtended.pinky
    ) {
      let score = 0.83;
      if (fingerFoldRatios.pinky < 0.38) score += 0.07;
      if (fingertipDistances.indexMiddle > 0.15 && fingertipDistances.middleRing > 0.15) {
        score += 0.05;
      }
      scores['WATER'] = Math.min(0.95, score);
    }

    // 8. "NO" (ASL): Index and Middle extended horizontally and tapped to thumb; Ring and Pinky folded
    if (
      fingersExtended.index &&
      fingersExtended.middle &&
      !fingersExtended.ring &&
      !fingersExtended.pinky &&
      fingertipDistances.thumbIndex < 0.35
    ) {
      scores['NO'] = 0.85;
    }

    // 9. "MORE" (Flattened O handshape, fingertips together)
    const maxTipSpread = Math.max(
      fingertipDistances.thumbIndex,
      fingertipDistances.indexMiddle,
      fingertipDistances.middleRing,
      fingertipDistances.ringPinky
    );
    if (maxTipSpread < 0.32 && extCount <= 2 && extCount >= 0) {
      scores['MORE'] = 0.81;
    }

    // 10. Two-Handed Signs ("HELP", "FRIEND")
    if (isTwoHanded && secondaryLandmarks) {
      if (scores['THUMBS UP'] > 0.7) {
        scores['HELP'] = 0.88;
      }
      scores['FRIEND'] = 0.82;
    }

    // Find best candidate
    let bestSign = 'UNKNOWN';
    let bestScore = 0;

    for (const [sign, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestSign = sign;
      }
    }

    // Decision Boundary Threshold: Require at least 0.72 score to not be UNKNOWN
    const CONFIDENCE_THRESHOLD = 0.72;
    const isRecognized = bestScore >= CONFIDENCE_THRESHOLD && bestSign !== 'UNKNOWN';

    if (!isRecognized) {
      return {
        topSign: 'UNKNOWN',
        meaning: SIGN_MEANINGS['UNKNOWN'],
        score: Math.max(0.1, bestScore),
        signType: 'UNKNOWN',
        allCandidates: scores,
        explanation: 'Hand gesture does not match supported ASL static sign patterns with high confidence.',
        isRecognized: false,
      };
    }

    return {
      topSign: bestSign,
      meaning: SIGN_MEANINGS[bestSign] || 'Recognized sign',
      score: bestScore,
      signType: 'STATIC',
      allCandidates: scores,
      explanation: `Detected standard ${bestSign} gesture configuration with calibrated geometric score ${(bestScore * 100).toFixed(0)}%.`,
      isRecognized: true,
    };
  }

  public predict(
    features: ExtractedGestureFeatures,
    primaryLandmarks: HandLandmarks,
    secondaryLandmarks?: HandLandmarks
  ): ClassifierPrediction {
    const raw = this.predictRaw(features, primaryLandmarks, secondaryLandmarks);
    const candidates: CandidatePrediction[] = Object.entries(raw.allCandidates)
      .map(([label, probability]) => ({ label, probability }))
      .sort((a, b) => b.probability - a.probability);

    return {
      label: raw.topSign,
      probability: raw.score,
      candidates: candidates.slice(0, 5),
      isUnknown: !raw.isRecognized || raw.topSign === 'UNKNOWN',
      reason: raw.isRecognized ? undefined : raw.explanation,
      modelType: 'DEVELOPMENT_GEOMETRIC_FALLBACK',
      marginDelta: candidates.length >= 2 ? candidates[0].probability - candidates[1].probability : raw.score,
      meaning: raw.meaning,
    };
  }
}

export const prototypeClassifier = new PrototypeSignClassifier();
