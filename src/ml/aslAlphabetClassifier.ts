import { ExtractedGestureFeatures, HandLandmarks, RawClassifierResult } from '../types';
import { LANDMARK_INDEX } from './featureExtractor';
import {
  ASL_ALPHABET_DEFINITIONS,
  ASL_ALPHABET_LETTERS,
  ASLAlphabetLetter,
} from './aslAlphabetLabels';

export class ASLAlphabetClassifier {
  public readonly modelName = 'ASL Alphabet Geometric Classifier';
  public readonly modelVersion = '3.0.0-asl-alphabet';

  /**
   * Classify 21 3D landmarks into an ASL letter A-Z with calibrated scoring
   */
  public classify(
    features: ExtractedGestureFeatures,
    landmarks: HandLandmarks
  ): RawClassifierResult {
    if (!landmarks || landmarks.length < 21) {
      return {
        topSign: 'UNKNOWN',
        meaning: 'No hand detected',
        score: 0,
        signType: 'UNKNOWN',
        allCandidates: {},
        explanation: 'Landmarks missing or invalid.',
        isRecognized: false,
        mode: 'ALPHABET',
        rejectionReason: 'No hand landmarks available',
      };
    }

    const {
      fingersExtended,
      fingerStates,
      fingerFoldRatios,
      fingertipDistances,
      fingertipToPalmDistances,
      palmOrientation,
      jointAngles,
      wristTiltAngleDeg,
      isThumbCrossedOver,
    } = features;

    const scores: Record<string, number> = {};
    ASL_ALPHABET_LETTERS.forEach((letter) => {
      scores[letter] = 0;
    });

    const openCount = fingerStates.openCount;

    // ==========================================
    // 1. "A" vs "S" vs "E" vs "T" vs "M" vs "N" (Fist-like / Closed gestures)
    // ==========================================
    const allFourCurled =
      (fingerStates.index === 'CLOSED' || fingerStates.index === 'PARTIAL') &&
      fingerStates.middle === 'CLOSED' &&
      fingerStates.ring === 'CLOSED' &&
      fingerStates.pinky === 'CLOSED';

    if (allFourCurled) {
      // "A": Thumb upright alongside index MCP; fingers curled tight
      if (fingersExtended.thumb || fingerStates.thumb === 'OPEN') {
        let scoreA = 0.76;
        if (!isThumbCrossedOver) scoreA += 0.12; // thumb is strictly beside, not crossing
        if (fingertipDistances.thumbIndex > 0.15) scoreA += 0.06;
        scores['A'] = Math.min(0.96, scoreA);
      }

      // "S": Thumb crossed across the front of the curled fingers
      if (isThumbCrossedOver && !fingersExtended.thumb) {
        let scoreS = 0.75;
        if (fingertipDistances.thumbIndex < 0.28) scoreS += 0.12;
        scores['S'] = Math.min(0.95, scoreS);
      }

      // "E": All fingertips tightly curled down resting on top of thumb
      if (
        fingerFoldRatios.index < 0.38 &&
        fingerFoldRatios.middle < 0.38 &&
        fingerFoldRatios.ring < 0.38 &&
        fingerFoldRatios.pinky < 0.38
      ) {
        let scoreE = 0.74;
        if (fingertipToPalmDistances.index < 0.45) scoreE += 0.12;
        scores['E'] = Math.min(0.94, scoreE);
      }

      // "T": Thumb tucked under index finger only (between index and middle)
      if (fingerStates.thumb !== 'OPEN' && fingertipDistances.thumbIndex < 0.25) {
        let scoreT = 0.72;
        if (fingerFoldRatios.index > 0.25) scoreT += 0.10;
        scores['T'] = Math.min(0.92, scoreT);
      }

      // "M": Thumb under index, middle, ring (peeking at pinky)
      if (fingertipDistances.thumbRing < 0.26) {
        scores['M'] = 0.78;
      }

      // "N": Thumb under index and middle (peeking at ring)
      if (fingertipDistances.thumbMiddle < 0.26 && scores['M'] < 0.75) {
        scores['N'] = 0.79;
      }
    }

    // ==========================================
    // 2. "B" (Four fingers upright together, thumb tucked)
    // ==========================================
    if (
      fingersExtended.index &&
      fingersExtended.middle &&
      fingersExtended.ring &&
      fingersExtended.pinky &&
      !fingersExtended.thumb
    ) {
      let scoreB = 0.82;
      // Fingers close together
      if (fingertipDistances.indexMiddle < 0.32 && fingertipDistances.middleRing < 0.32) {
        scoreB += 0.10;
      }
      scores['B'] = Math.min(0.97, scoreB);
    }

    // ==========================================
    // 3. "C" vs "O" (Curved / Circle gestures)
    // ==========================================
    if (
      fingerStates.index === 'PARTIAL' &&
      fingerStates.middle === 'PARTIAL' &&
      fingerStates.ring === 'PARTIAL'
    ) {
      const tipDistance = fingertipDistances.thumbIndex;
      // "O": Thumb tip directly touches index tip (closed loop)
      if (tipDistance < 0.22) {
        let scoreO = 0.82;
        if (fingertipDistances.thumbMiddle < 0.28) scoreO += 0.10;
        scores['O'] = Math.min(0.96, scoreO);
      }
      // "C": Open gap between thumb tip and index tip (arch/C-shape)
      else if (tipDistance >= 0.22 && tipDistance < 0.75) {
        let scoreC = 0.80;
        if (palmOrientation === 'side' || Math.abs(wristTiltAngleDeg) > 25) scoreC += 0.10;
        scores['C'] = Math.min(0.95, scoreC);
      }
    }

    // ==========================================
    // 4. "D" (Index upright, middle/ring/pinky touch thumb)
    // ==========================================
    if (
      fingersExtended.index &&
      !fingersExtended.middle &&
      !fingersExtended.ring &&
      !fingersExtended.pinky
    ) {
      // Thumb touches middle finger tip
      if (fingertipDistances.thumbMiddle < 0.32) {
        let scoreD = 0.84;
        if (fingerFoldRatios.index > 0.8) scoreD += 0.08;
        scores['D'] = Math.min(0.96, scoreD);
      }
      // "Z" candidate (index points forward/upward, other fingers curled)
      scores['Z'] = 0.70;
    }

    // ==========================================
    // 5. "F" (Index touches thumb; middle, ring, pinky upright)
    // ==========================================
    if (
      fingersExtended.middle &&
      fingersExtended.ring &&
      fingersExtended.pinky &&
      fingertipDistances.thumbIndex < 0.26
    ) {
      let scoreF = 0.84;
      if (fingerStates.index !== 'OPEN') scoreF += 0.10;
      scores['F'] = Math.min(0.96, scoreF);
    }

    // ==========================================
    // 6. "G" vs "H" (Horizontal pointing)
    // ==========================================
    const isPointingHorizontal =
      palmOrientation === 'side' ||
      Math.abs(wristTiltAngleDeg) > 40 ||
      (features.rawFeatureVector[LANDMARK_INDEX.INDEX_TIP * 3] > 0.8);

    // "G": Index and thumb pointing horizontally; others curled
    if (
      fingersExtended.index &&
      !fingersExtended.middle &&
      !fingersExtended.ring &&
      !fingersExtended.pinky &&
      fingersExtended.thumb
    ) {
      if (isPointingHorizontal) {
        scores['G'] = 0.86;
      }
      // Also candidate for "L" if angle is near right angle
      if (jointAngles.thumbMcp > 40 && !isPointingHorizontal) {
        scores['L'] = 0.88;
      }
    }

    // "H": Index and middle extended horizontally together; thumb tucked
    if (
      fingersExtended.index &&
      fingersExtended.middle &&
      !fingersExtended.ring &&
      !fingersExtended.pinky &&
      !fingersExtended.thumb
    ) {
      if (isPointingHorizontal) {
        if (fingertipDistances.indexMiddle < 0.22) {
          scores['H'] = 0.88;
        }
      }
    }

    // ==========================================
    // 7. "I" vs "J" (Pinky only extended)
    // ==========================================
    if (
      !fingersExtended.index &&
      !fingersExtended.middle &&
      !fingersExtended.ring &&
      fingersExtended.pinky
    ) {
      let scoreI = 0.85;
      if (!fingersExtended.thumb) scoreI += 0.08;
      scores['I'] = Math.min(0.96, scoreI);
      scores['J'] = 0.70; // Static precursor to dynamic J
    }

    // ==========================================
    // 8. "L" (Index straight up, thumb straight out in right angle)
    // ==========================================
    if (
      fingersExtended.index &&
      fingersExtended.thumb &&
      !fingersExtended.middle &&
      !fingersExtended.ring &&
      !fingersExtended.pinky
    ) {
      let scoreL = 0.84;
      // High separation between thumb tip and index tip
      if (fingertipDistances.thumbIndex > 0.40) scoreL += 0.10;
      scores['L'] = Math.min(0.97, scoreL);
    }

    // ==========================================
    // 9. "U" vs "V" vs "K" vs "R" (Index and Middle extended)
    // ==========================================
    if (
      fingersExtended.index &&
      fingersExtended.middle &&
      !fingersExtended.ring &&
      !fingersExtended.pinky
    ) {
      const distIM = fingertipDistances.indexMiddle;

      // "U": Index and middle upright touching tightly
      if (distIM < 0.20 && !fingersExtended.thumb) {
        scores['U'] = 0.88;
      }
      // "V": Index and middle spread apart in prominent V
      else if (distIM >= 0.20 && !fingersExtended.thumb) {
        scores['V'] = 0.89;
      }

      // "K": Thumb upright between index and middle
      if (fingersExtended.thumb && fingertipDistances.thumbMiddle < 0.35) {
        scores['K'] = 0.86;
      }

      // "R": Index and middle crossed over each other
      if (distIM < 0.16 && fingertipDistances.thumbIndex > 0.25) {
        scores['R'] = 0.84;
      }

      // "P": K-hand pointing downward
      if (palmOrientation === 'down') {
        scores['P'] = 0.86;
      }
    }

    // ==========================================
    // 10. "W" (Index, Middle, Ring extended)
    // ==========================================
    if (
      fingersExtended.index &&
      fingersExtended.middle &&
      fingersExtended.ring &&
      !fingersExtended.pinky
    ) {
      let scoreW = 0.84;
      if (fingertipDistances.thumbPinky < 0.28) scoreW += 0.08;
      scores['W'] = Math.min(0.96, scoreW);
    }

    // ==========================================
    // 11. "X" (Index bent into a hook)
    // ==========================================
    if (
      fingerStates.index === 'PARTIAL' &&
      fingerStates.middle === 'CLOSED' &&
      fingerStates.ring === 'CLOSED' &&
      fingerStates.pinky === 'CLOSED' &&
      jointAngles.indexPip < 125
    ) {
      scores['X'] = 0.85;
    }

    // ==========================================
    // 12. "Y" (Thumb and Pinky extended, others curled)
    // ==========================================
    if (
      fingersExtended.thumb &&
      fingersExtended.pinky &&
      !fingersExtended.index &&
      !fingersExtended.middle &&
      !fingersExtended.ring
    ) {
      let scoreY = 0.86;
      if (fingertipDistances.thumbPinky > 0.55) scoreY += 0.08;
      scores['Y'] = Math.min(0.97, scoreY);
    }

    // ==========================================
    // 13. "Q" (G pointing downward)
    // ==========================================
    if (scores['G'] > 0.7 && palmOrientation === 'down') {
      scores['Q'] = 0.86;
    }

    // Sort candidate scores descending
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topCandidate = sorted[0];
    const secondCandidate = sorted[1];

    const topLetter = topCandidate[0] as ASLAlphabetLetter;
    const topScore = topCandidate[1];
    const secondScore = secondCandidate ? secondCandidate[1] : 0;

    const letterDef = ASL_ALPHABET_DEFINITIONS[topLetter];
    const minThreshold = letterDef ? letterDef.minimumConfidence : 0.72;

    // Ambiguity Check (Requirement 7):
    // If the top two candidates are too close (delta < 0.05), return UNKNOWN
    if (topScore >= minThreshold && secondScore >= minThreshold && topScore - secondScore < 0.05) {
      return {
        topSign: 'UNKNOWN',
        meaning: 'Ambiguous letter configuration',
        score: topScore,
        signType: 'UNKNOWN',
        allCandidates: scores,
        explanation: `Hand pose is ambiguous between '${topLetter}' and '${secondCandidate[0]}'. Please adjust finger clarity.`,
        isRecognized: false,
        mode: 'ALPHABET',
        rejectionReason: `Ambiguous: ${topLetter} (${(topScore * 100).toFixed(0)}%) vs ${secondCandidate[0]} (${(secondScore * 100).toFixed(0)}%)`,
      };
    }

    // Confidence Threshold Check
    if (topScore < minThreshold || topLetter === ('UNKNOWN' as any)) {
      return {
        topSign: 'UNKNOWN',
        meaning: 'Unrecognized fingerspelling letter',
        score: topScore,
        signType: 'UNKNOWN',
        allCandidates: scores,
        explanation: 'Fingerspelling posture does not match any ASL letter A-Z with required confidence.',
        isRecognized: false,
        mode: 'ALPHABET',
        rejectionReason: `Top candidate '${topLetter}' score ${(topScore * 100).toFixed(0)}% is below threshold ${(minThreshold * 100).toFixed(0)}%`,
      };
    }

    return {
      topSign: topLetter,
      meaning: `ASL fingerspelling letter ${topLetter}`,
      score: topScore,
      signType: letterDef.type,
      allCandidates: scores,
      explanation: letterDef.description,
      isRecognized: true,
      mode: 'ALPHABET',
    };
  }
}

export const aslAlphabetClassifier = new ASLAlphabetClassifier();
